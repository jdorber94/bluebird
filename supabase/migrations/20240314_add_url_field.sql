-- Add url column to demos table
ALTER TABLE demos
ADD COLUMN IF NOT EXISTS url text;

-- Update existing rows to have null url
UPDATE demos SET url = NULL WHERE url IS NULL; 