-- Add status column to demos table
ALTER TABLE demos
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('Accepted', 'Pending', 'Cancelled', 'Rebooked')) DEFAULT 'Pending';

-- Update any existing rows to have 'Pending' status if they don't have one
UPDATE demos SET status = 'Pending' WHERE status IS NULL; 