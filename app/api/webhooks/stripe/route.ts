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

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('Received webhook request');
    
    // Get Stripe signature from headers
    const signature = headers().get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in webhook request');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify the signature and construct event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      console.log('Webhook verified. Event type:', event.type);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          console.log('Processing checkout.session.completed event');
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('Full session data:', JSON.stringify(session, null, 2));
          console.log('Session metadata:', session.metadata);
          
          if (!session.metadata?.userId || !session.metadata?.planType) {
            throw new Error('Missing required metadata: userId or planType');
          }

          const { userId, planType } = session.metadata;
          console.log('Updating subscription for user:', userId, 'to plan:', planType);
          
          // Get subscription details from Stripe
          const subscriptionId = session.subscription as string;
          console.log('Fetching subscription details from Stripe. ID:', subscriptionId);
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          console.log('Stripe subscription data:', JSON.stringify(subscription, null, 2));
          
          // First update the subscriptions table
          console.log('Updating subscription in Supabase');
          const { data: subscriptionData, error: updateError } = await supabase
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
            .eq('user_id', userId)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            throw new Error(`Error updating subscription: ${updateError.message}`);
          }
          
          console.log('Updated subscription data:', subscriptionData);
          
          // Then update the users table
          console.log('Updating user plan type in Supabase');
          const { data: userData, error: userUpdateError } = await supabase
            .from('users')
            .update({ plan_type: planType })
            .eq('id', userId)
            .select()
            .single();

          if (userUpdateError) {
            console.error('Error updating user:', userUpdateError);
            throw new Error(`Error updating user plan: ${userUpdateError.message}`);
          }
          
          console.log('Updated user data:', userData);
          console.log('Successfully processed checkout.session.completed event');
          break;
        }
        
        case 'customer.subscription.updated': {
          console.log('Processing customer.subscription.updated event');
          const subscription = event.data.object as Stripe.Subscription;
          console.log('Full subscription data:', JSON.stringify(subscription, null, 2));
          const customerId = subscription.customer as string;
          
          // First find the existing subscription
          const { data: subscriptionData, error: findError } = await supabase
            .from('subscriptions')
            .select('user_id, plan_type')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (findError || !subscriptionData) {
            console.error('Error finding subscription:', findError);
            throw new Error(`Error finding subscription: ${findError?.message || 'No subscription found'}`);
          }

          console.log('Found existing subscription:', subscriptionData);
          const priceId = subscription.items.data[0].price.id;
          const planType = subscriptionData.plan_type;
          
          // Update subscription status
          const { data: updatedSubscription, error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status === 'active' ? 'active' : 'cancelled',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              stripe_price_id: priceId
            })
            .eq('user_id', subscriptionData.user_id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            throw new Error(`Error updating subscription: ${updateError.message}`);
          }
          
          console.log('Updated subscription:', updatedSubscription);
          
          // Update user's plan type
          const { data: userData, error: userUpdateError } = await supabase
            .from('users')
            .update({ plan_type: planType })
            .eq('id', subscriptionData.user_id)
            .select()
            .single();
            
          if (userUpdateError) {
            console.error('Error updating user:', userUpdateError);
            throw new Error(`Error updating user plan: ${userUpdateError.message}`);
          }
          
          console.log('Updated user data:', userData);
          break;
        }
        
        case 'customer.subscription.deleted': {
          console.log('Processing customer.subscription.deleted event');
          const subscription = event.data.object as Stripe.Subscription;
          console.log('Full subscription data:', JSON.stringify(subscription, null, 2));
          const customerId = subscription.customer as string;
          
          const { data: subscriptionData, error: findError } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();
          
          if (findError || !subscriptionData) {
            console.error('Error finding subscription:', findError);
            throw new Error(`Error finding subscription: ${findError?.message || 'No subscription found'}`);
          }

          console.log('Found subscription to cancel:', subscriptionData);

          const { data: updatedSubscription, error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              plan_type: 'free',
              cancel_at_period_end: false,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              stripe_price_id: null
            })
            .eq('user_id', subscriptionData.user_id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            throw new Error(`Error updating subscription: ${updateError.message}`);
          }
          
          console.log('Updated subscription:', updatedSubscription);
          
          const { data: userData, error: userUpdateError } = await supabase
            .from('users')
            .update({ plan_type: 'free' })
            .eq('id', subscriptionData.user_id)
            .select()
            .single();
            
          if (userUpdateError) {
            console.error('Error updating user:', userUpdateError);
            throw new Error(`Error updating user plan: ${userUpdateError.message}`);
          }
          
          console.log('Updated user data:', userData);
          break;
        }
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return NextResponse.json({ received: true }, { status: 200 });
    } catch (error: any) {
      console.error('Error processing webhook event:', error.message);
      // Return 200 to acknowledge receipt even if processing failed
      return NextResponse.json(
        { received: true, warning: `Error processing webhook: ${error.message}` },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
} 