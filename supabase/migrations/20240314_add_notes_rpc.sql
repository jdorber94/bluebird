-- Create the RPC function to add the notes column
CREATE OR REPLACE FUNCTION add_notes_column()
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
    AND column_name = 'notes'
  ) THEN
    -- Add the notes column if it doesn't exist
    EXECUTE 'ALTER TABLE demos ADD COLUMN notes TEXT DEFAULT ''''';
  END IF;
END;
$$; 