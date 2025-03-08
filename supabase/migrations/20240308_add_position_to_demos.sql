-- Add position column to demos table
ALTER TABLE demos ADD COLUMN IF NOT EXISTS position INTEGER;

-- Update existing rows with sequential positions
WITH numbered_demos AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as row_num
  FROM demos
)
UPDATE demos
SET position = numbered_demos.row_num
FROM numbered_demos
WHERE demos.id = numbered_demos.id;

-- Make position NOT NULL after setting initial values
ALTER TABLE demos ALTER COLUMN position SET NOT NULL;

-- Add an index on position for faster ordering
CREATE INDEX IF NOT EXISTS demos_position_idx ON demos(position); 