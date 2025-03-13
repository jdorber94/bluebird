-- Create the RPC function to add the score column
CREATE OR REPLACE FUNCTION add_score_column()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'demos'
    AND column_name = 'score'
  ) THEN
    -- Add the score column if it doesn't exist
    EXECUTE 'ALTER TABLE demos ADD COLUMN score integer DEFAULT 3';
    -- Add constraint to ensure score is between 1 and 5
    EXECUTE 'ALTER TABLE demos ADD CONSTRAINT demos_score_check CHECK (score >= 1 AND score <= 5)';
    -- Update existing rows to have a default score of 3
    EXECUTE 'UPDATE demos SET score = 3 WHERE score IS NULL';
  END IF;
END;
$$; 