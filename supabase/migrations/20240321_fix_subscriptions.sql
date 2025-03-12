-- First, clean up any duplicate subscriptions by keeping only the most recent one for each user
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM subscriptions
)
DELETE FROM subscriptions
WHERE id IN (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE rn > 1
);

-- Now add the unique constraint on user_id
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Drop any duplicate triggers if they exist
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON subscriptions;

-- Create or replace the single trigger we want to keep
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop any duplicate user creation triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

-- Create or replace the function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS trigger AS $$
BEGIN
  -- Check if subscription already exists
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) THEN
    INSERT INTO public.subscriptions (
      user_id, 
      plan_type, 
      status, 
      current_period_start, 
      current_period_end
    )
    VALUES (
      NEW.id,
      'free',
      'active',
      timezone('utc'::text, now()),
      timezone('utc'::text, now() + interval '1 year')
    );
  END IF;
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user_subscription(); 