-- Add Stripe fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Update the plan_type constraint
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_plan_type_check
CHECK (plan_type IN ('free', 'premium'));

-- Add plan_type to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free' NOT NULL;

-- Add constraint to users plan_type
ALTER TABLE users
ADD CONSTRAINT users_plan_type_check
CHECK (plan_type IN ('free', 'premium')); 