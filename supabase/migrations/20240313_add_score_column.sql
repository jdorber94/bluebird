-- Add score column to demos table
ALTER TABLE demos
ADD COLUMN IF NOT EXISTS score integer DEFAULT 3;

-- Add constraint to ensure score is between 1 and 5
ALTER TABLE demos
ADD CONSTRAINT demos_score_check CHECK (score >= 1 AND score <= 5);

-- Update existing rows to have a default score of 3
UPDATE demos SET score = 3 WHERE score IS NULL; 