-- First create the update_updated_at_column function as it's used by both tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the demos table if it doesn't exist
CREATE TABLE IF NOT EXISTS demos (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text,
  date_booked timestamp with time zone,
  demo_date timestamp with time zone,
  demo_time time,
  email_sent boolean DEFAULT false,
  email_sent_date timestamp with time zone,
  call_made boolean DEFAULT false,
  call_made_date timestamp with time zone,
  showed text DEFAULT 'Pending',
  status text DEFAULT 'Pending',
  user_id uuid references auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  position integer DEFAULT 0
);

-- If the table already exists, add any missing columns
ALTER TABLE demos 
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS date_booked timestamp with time zone,
  ADD COLUMN IF NOT EXISTS demo_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS demo_time time,
  ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS call_made boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS call_made_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS showed text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Update any null status values to 'Pending'
UPDATE demos SET status = 'Pending' WHERE status IS NULL;
UPDATE demos SET showed = 'Pending' WHERE showed IS NULL;

-- Now add constraints after ensuring columns exist
ALTER TABLE demos 
  DROP CONSTRAINT IF EXISTS demos_showed_check,
  ADD CONSTRAINT demos_showed_check 
    CHECK (showed IN ('Yes', 'No', 'Pending'));

ALTER TABLE demos 
  DROP CONSTRAINT IF EXISTS demos_status_check,
  ADD CONSTRAINT demos_status_check 
    CHECK (status IN ('Accepted', 'Pending', 'Cancelled', 'Rebooked'));

-- Create index on position for faster ordering
CREATE INDEX IF NOT EXISTS demos_position_idx ON demos(position);

-- Enable RLS if not already enabled
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own demos" ON demos;
DROP POLICY IF EXISTS "Users can only insert their own demos" ON demos;
DROP POLICY IF EXISTS "Users can only update their own demos" ON demos;
DROP POLICY IF EXISTS "Users can only delete their own demos" ON demos;

-- Create policies for demos
CREATE POLICY "Users can only see their own demos"
  ON demos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own demos"
  ON demos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own demos"
  ON demos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own demos"
  ON demos FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at column for demos
DROP TRIGGER IF EXISTS update_demos_updated_at ON demos;
CREATE TRIGGER update_demos_updated_at
    BEFORE UPDATE ON demos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;

-- Create policies for subscriptions
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at column for subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a default free subscription for new users
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    'free',
    'active',
    timezone('utc'::text, now()),
    timezone('utc'::text, now() + interval '1 year')
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create a trigger to automatically create subscription records
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription(); 