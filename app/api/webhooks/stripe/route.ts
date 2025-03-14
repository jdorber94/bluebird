import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Initialize Supabase admin client with service role key for full access
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  console.log('Webhook received');
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found in webhook request');
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
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
        
        if (!session.metadata?.userId) {
          console.error('No userId found in session metadata');
          return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });
        }

        const userId = session.metadata.userId;
        const planType = session.metadata.planType || 'premium'; // Default to premium if not specified
        
        // Start a transaction to update both subscriptions and users tables
        const { error: transactionError } = await supabase.rpc('update_user_subscription', {
          p_user_id: userId,
          p_plan_type: planType,
          p_stripe_customer_id: session.customer as string,
          p_stripe_subscription_id: session.subscription as string,
          p_current_period_start: new Date(session.created * 1000).toISOString(),
          p_current_period_end: new Date((session.created + 30 * 24 * 60 * 60) * 1000).toISOString() // 30 days from creation
        });

        if (transactionError) {
          console.error('Transaction error:', transactionError);
          return NextResponse.json({ error: 'Failed to update subscription and user' }, { status: 500 });
        }

        console.log('Successfully updated user subscription to premium');
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
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (findError) {
          console.error('Error finding subscription in Supabase:', findError);
          return NextResponse.json({ error: 'Failed to find subscription' }, { status: 500 });
        }
        
        if (subscriptionData) {
          console.log('Found subscription for user:', subscriptionData.user_id);
          // Update subscription in database
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status === 'active' ? 'active' : 'cancelled',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              stripe_price_id: subscription.items.data[0].price.id
            })
            .eq('user_id', subscriptionData.user_id);

          if (updateError) {
            console.error('Error updating subscription in Supabase:', updateError);
            return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
          }
          console.log('Successfully updated subscription');
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
          return NextResponse.json({ error: 'Failed to find subscription' }, { status: 500 });
        }
        
        if (subscriptionData) {
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
            return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
          }
          console.log('Successfully cancelled subscription');
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Error handling webhook' },
      { status: 500 }
    );
  }
} 