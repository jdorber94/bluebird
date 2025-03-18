import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Route segment configuration for Next.js 14.2
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'iad1';

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Initialize Supabase admin client with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure body parsing using the new Next.js 14 format
export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('Received webhook request with raw body length:', rawBody.length);
    
    // Get all headers for debugging
    const allHeaders = Object.fromEntries(req.headers.entries());
    console.log('Request headers:', allHeaders);
    
    // Get Stripe signature from headers
    const signature = headers().get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in webhook request');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 200 }
      );
    }
    console.log('Stripe signature found:', signature.substring(0, 20) + '...');

    // Log webhook secret for debugging (first few characters only)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 200 }
      );
    }
    console.log('Using webhook secret starting with:', webhookSecret.substring(0, 5) + '...');

    // Verify the signature and construct event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
      console.log('Webhook verified successfully. Event type:', event.type);
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      console.error('Full error:', err);
      console.error('Raw body length:', rawBody.length);
      console.error('Signature received:', signature);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 200 }
      );
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          console.log('Processing checkout.session.completed event');
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Add more logging
          console.log('Session data:', {
            id: session.id,
            metadata: session.metadata,
            customer: session.customer,
            subscription: session.subscription,
            paymentStatus: session.payment_status,
            status: session.status
          });
          
          if (!session.metadata?.userId || !session.metadata?.planType) {
            console.error('Missing required metadata:', session.metadata);
            return NextResponse.json(
              { error: 'Missing required metadata: userId or planType' },
              { status: 200 }
            );
          }

          const { userId, planType } = session.metadata;
          console.log('Updating subscription for user:', userId, 'to plan:', planType);
          
          try {
            // Get subscription details from Stripe
            const subscriptionId = session.subscription as string;
            console.log('Fetching subscription details from Stripe. ID:', subscriptionId);
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            console.log('Stripe subscription data:', {
              id: subscription.id,
              status: subscription.status,
              customerId: subscription.customer,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              priceId: subscription.items.data[0].price.id,
              expectedPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
              planType,
              allPriceIds: subscription.items.data.map(item => item.price.id)
            });

            // Verify the price ID matches
            const priceId = subscription.items.data[0].price.id;
            if (priceId !== process.env.NEXT_PUBLIC_STRIPE_PRICE_ID) {
              console.warn('Price ID mismatch:', {
                received: priceId,
                expected: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
              });
            }

            // First check if a subscription record exists
            const { data: existingSubscription } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .single();

            console.log('Existing subscription:', existingSubscription);

            let subscriptionData;
            if (existingSubscription) {
              // Update existing subscription
              console.log('Updating existing subscription');
              const { data, error: updateError } = await supabase
                .from('subscriptions')
                .update({
                  plan_type: planType,
                  status: subscription.status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  stripe_customer_id: subscription.customer as string,
                  stripe_subscription_id: subscription.id,
                  stripe_price_id: subscription.items.data[0].price.id,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

              if (updateError) {
                throw new Error(`Error updating subscription: ${updateError.message}`);
              }
              subscriptionData = data;
            } else {
              // Create new subscription
              console.log('Creating new subscription');
              const { data, error: insertError } = await supabase
                .from('subscriptions')
                .insert([{
                  user_id: userId,
                  plan_type: planType,
                  status: subscription.status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  stripe_customer_id: subscription.customer as string,
                  stripe_subscription_id: subscription.id,
                  stripe_price_id: subscription.items.data[0].price.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }])
                .select()
                .single();

              if (insertError) {
                throw new Error(`Error creating subscription: ${insertError.message}`);
              }
              subscriptionData = data;
            }
            
            console.log('Updated/Created subscription data:', subscriptionData);
            
            // Then update the users table
            console.log('Updating user plan type in Supabase');
            const { data: userData, error: userUpdateError } = await supabase
              .from('users')
              .update({ 
                plan_type: planType,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId)
              .select()
              .single();

            if (userUpdateError) {
              throw new Error(`Error updating user plan: ${userUpdateError.message}`);
            }
            
            console.log('Updated user data:', userData);
            console.log('Successfully processed checkout.session.completed event');
          } catch (error: any) {
            console.error('Error processing subscription update:', error);
            // Still return 200 to acknowledge receipt
            return NextResponse.json(
              { error: error.message },
              { status: 200 }
            );
          }
          break;
        }
        
        case 'customer.subscription.updated': {
          console.log('Processing customer.subscription.updated event');
          const subscription = event.data.object as Stripe.Subscription;
          console.log('Subscription data:', {
            id: subscription.id,
            status: subscription.status,
            customerId: subscription.customer,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            priceId: subscription.items.data[0].price.id,
            items: subscription.items.data
          });
          
          const customerId = subscription.customer as string;
          const priceId = subscription.items.data[0].price.id;
          
          // Determine plan type from price ID
          let planType = 'free';
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID) {
            planType = 'pro';
          }
          
          console.log('Determined plan type:', planType, 'from price ID:', priceId);
          
          // First find the existing subscription
          const { data: subscriptionData, error: findError } = await supabase
            .from('subscriptions')
            .select('user_id, plan_type')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (findError || !subscriptionData) {
            console.error('Error finding subscription:', findError);
            return NextResponse.json(
              { error: `Error finding subscription: ${findError?.message || 'No subscription found'}` },
              { status: 200 }
            );
          }

          console.log('Found existing subscription:', subscriptionData);
          
          // Always update both subscription and user records with the current plan type
          try {
            // Update subscription status and plan type
            const { data: updatedSubscription, error: updateError } = await supabase
              .from('subscriptions')
              .update({
                status: subscription.status,
                plan_type: planType,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
                stripe_price_id: priceId,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', subscriptionData.user_id)
              .select()
              .single();

            if (updateError) {
              throw new Error(`Error updating subscription: ${updateError.message}`);
            }
            
            console.log('Updated subscription:', {
              id: updatedSubscription.id,
              userId: updatedSubscription.user_id,
              status: updatedSubscription.status,
              planType: updatedSubscription.plan_type,
              priceId: updatedSubscription.stripe_price_id
            });
            
            // Always update user's plan type to match subscription
            const { data: userData, error: userUpdateError } = await supabase
              .from('users')
              .update({ 
                plan_type: planType,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscriptionData.user_id)
              .select()
              .single();
              
            if (userUpdateError) {
              throw new Error(`Error updating user plan: ${userUpdateError.message}`);
            }
            
            console.log('Updated user data:', {
              id: userData.id,
              planType: userData.plan_type,
              updatedAt: userData.updated_at
            });
          } catch (error: any) {
            console.error('Error processing subscription update:', error);
            return NextResponse.json(
              { error: error.message },
              { status: 200 }
            );
          }
          break;
        }
        
        case 'customer.subscription.deleted': {
          console.log('Processing customer.subscription.deleted event');
          const subscription = event.data.object as Stripe.Subscription;
          console.log('Subscription data:', {
            id: subscription.id,
            status: subscription.status,
            customerId: subscription.customer,
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          });
          
          const customerId = subscription.customer as string;
          
          // Find the subscription to cancel
          const { data: subscriptionData, error: findError } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (findError || !subscriptionData) {
            console.error('Error finding subscription:', findError);
            return NextResponse.json(
              { error: `Error finding subscription: ${findError?.message || 'No subscription found'}` },
              { status: 200 }
            );
          }

          console.log('Found subscription to cancel for user:', subscriptionData.user_id);

          // Update subscription to free plan
          const { data: updatedSubscription, error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              plan_type: 'free',
              cancel_at_period_end: false,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              stripe_price_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', subscriptionData.user_id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            return NextResponse.json(
              { error: `Error updating subscription: ${updateError.message}` },
              { status: 200 }
            );
          }
          
          console.log('Updated subscription:', {
            id: updatedSubscription.id,
            userId: updatedSubscription.user_id,
            status: updatedSubscription.status,
            planType: updatedSubscription.plan_type
          });
          
          // Update user to free plan
          const { data: userData, error: userUpdateError } = await supabase
            .from('users')
            .update({ 
              plan_type: 'free',
              updated_at: new Date().toISOString()
            })
            .eq('id', subscriptionData.user_id)
            .select()
            .single();
            
          if (userUpdateError) {
            console.error('Error updating user:', userUpdateError);
            return NextResponse.json(
              { error: `Error updating user plan: ${userUpdateError.message}` },
              { status: 200 }
            );
          }
          
          console.log('Updated user data:', {
            id: userData.id,
            planType: userData.plan_type,
            updatedAt: userData.updated_at
          });
          break;
        }
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return NextResponse.json({ received: true }, { status: 200 });
    } catch (error: any) {
      console.error('Error processing webhook event:', error.message);
      return NextResponse.json(
        { received: true, warning: `Error processing webhook: ${error.message}` },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    // Return 200 for any other errors
    return NextResponse.json(
      { error: error.message },
      { status: 200 }
    );
  }
} 