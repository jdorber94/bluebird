import { Stripe, loadStripe } from '@stripe/stripe-js';

// Singleton pattern to ensure we only load Stripe once
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export const getPriceId = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
}; 