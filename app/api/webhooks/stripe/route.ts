import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Route segment configuration for Next.js 14.2
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'iad1';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Initialize Supabase admin client with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('Webhook received');
  
  // Get raw body for signature verification
  const rawBody = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found in webhook request');
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify the signature with the raw body
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('Webhook verified. Event type:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Session metadata:', session.metadata);
        
        // Update subscription in database
        if (session.metadata?.userId && session.metadata?.planType) {
          const { userId, planType } = session.metadata;
          console.log('Updating subscription for user:', userId, 'to plan:', planType);
          
          // Get subscription details from Stripe
          const subscriptionId = session.subscription as string;
          console.log('Fetching subscription details from Stripe. ID:', subscriptionId);
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Update subscription in database
          console.log('Updating subscription in Supabase');
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              plan_type: planType,
              status: 'active',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0].price.id
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating subscription in Supabase:', updateError);
            // Don't return error response here, continue processing
            // Just log the error and continue
          }
          
          // Update user's plan in users table
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({ plan_type: planType })
            .eq('id', userId);

          if (userUpdateError) {
            console.error('Error updating user plan in Supabase:', userUpdateError);
            // Don't return error response here, continue processing
            // Just log the error and continue
          } else {
            console.log('Successfully updated user plan in Supabase');
          }
          
          console.log('Successfully processed checkout.session.completed event');
          
          // Verify the updates
          const { data: verifyData, error: verifyError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();
            
          if (verifyError) {
            console.error('Error verifying subscription update:', verifyError);
          } else {
            console.log('Verified subscription data:', verifyData);
          }
        } else {
          console.error('Missing required metadata in session:', session);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        console.log('Processing customer.subscription.updated event');
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log('Customer ID:', customerId);
        
        // Find the user by Stripe customer ID
        const { data: subscriptionData, error: findError } = await supabase
          .from('subscriptions')
          .select('user_id, plan_type')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (findError) {
          console.error('Error finding subscription in Supabase:', findError);
          // Don't return error response here, continue processing
          // Just log the error and continue
        } else if (subscriptionData) {
          console.log('Found subscription for user:', subscriptionData.user_id);
          
          // Get the plan type from the subscription
          const priceId = subscription.items.data[0].price.id;
          const planType = subscriptionData.plan_type; // Keep existing plan type if we can't determine from price
          
          console.log('Plan type from subscription:', planType);
          
          // Update subscription in database
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status === 'active' ? 'active' : 'cancelled',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              stripe_price_id: priceId
            })
            .eq('user_id', subscriptionData.user_id);

          if (updateError) {
            console.error('Error updating subscription in Supabase:', updateError);
            // Don't return error response here, continue processing
            // Just log the error and continue
          } else {
            console.log('Successfully updated subscription');
          }
          
          // Also update the user's plan_type to match
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({ plan_type: planType })
            .eq('id', subscriptionData.user_id);
            
          if (userUpdateError) {
            console.error('Error updating user plan in Supabase:', userUpdateError);
          } else {
            console.log('Successfully updated user plan to:', planType);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        console.log('Processing customer.subscription.deleted event');
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log('Customer ID:', customerId);
        
        // Find the user by Stripe customer ID
        const { data: subscriptionData, error: findError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (findError) {
          console.error('Error finding subscription in Supabase:', findError);
          // Don't return error response here, continue processing
          // Just log the error and continue
        } else if (subscriptionData) {
          console.log('Found subscription for user:', subscriptionData.user_id);
          // Update subscription in database
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              plan_type: 'free',
              cancel_at_period_end: false,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              stripe_price_id: null
            })
            .eq('user_id', subscriptionData.user_id);

          if (updateError) {
            console.error('Error updating subscription in Supabase:', updateError);
            // Don't return error response here, continue processing
            // Just log the error and continue
          } else {
            console.log('Successfully cancelled subscription');
          }
          
          // Also update the user's plan_type to free
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({ plan_type: 'free' })
            .eq('id', subscriptionData.user_id);
            
          if (userUpdateError) {
            console.error('Error updating user plan in Supabase:', userUpdateError);
          } else {
            console.log('Successfully updated user plan to free');
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Always return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error handling webhook:', error);
    // Even on error, return a 200 response to prevent Stripe from retrying
    // Log the error but don't fail the webhook
    return NextResponse.json(
      { received: true, warning: 'Error processing webhook but acknowledged receipt' },
      { status: 200 }
    );
  }
} 