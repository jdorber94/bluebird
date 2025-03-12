import { Stripe, loadStripe } from '@stripe/stripe-js';

// Singleton pattern to ensure we only load Stripe once
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export const getPriceId = (planType: 'pro' | 'enterprise') => {
  return planType === 'pro'
    ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
    : process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID;
}; 