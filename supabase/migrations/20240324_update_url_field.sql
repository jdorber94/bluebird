-- Add URL validation constraint
ALTER TABLE demos
ADD CONSTRAINT demos_url_check CHECK (
  url IS NULL OR 
  url ~ '^https?://.+' OR 
  url ~ '^\d+$'  -- Allow just numeric IDs
);

-- Create an index for faster URL lookups
CREATE INDEX IF NOT EXISTS demos_url_idx ON demos(url); 