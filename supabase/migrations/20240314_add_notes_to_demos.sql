-- Add notes column to demos table
ALTER TABLE demos ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''; 