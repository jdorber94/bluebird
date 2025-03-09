-- Add any missing columns
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
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add constraint for showed values
ALTER TABLE demos 
  DROP CONSTRAINT IF EXISTS demos_showed_check,
  ADD CONSTRAINT demos_showed_check 
    CHECK (showed IN ('Yes', 'No', 'Pending'));

-- Add constraint for status values
ALTER TABLE demos 
  DROP CONSTRAINT IF EXISTS demos_status_check,
  ADD CONSTRAINT demos_status_check 
    CHECK (status IN ('Accepted', 'Pending', 'Cancelled', 'Rebooked'));

-- Enable RLS if not already enabled
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own demos" ON demos;
DROP POLICY IF EXISTS "Users can only insert their own demos" ON demos;
DROP POLICY IF EXISTS "Users can only update their own demos" ON demos;
DROP POLICY IF EXISTS "Users can only delete their own demos" ON demos;

-- Create policies
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