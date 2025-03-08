-- Function to add position column if it doesn't exist
CREATE OR REPLACE FUNCTION add_position_column_if_not_exists()
RETURNS void AS $$
BEGIN
    -- Check if position column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'demos'
        AND column_name = 'position'
    ) THEN
        -- Add position column
        ALTER TABLE demos ADD COLUMN position INTEGER;
        
        -- Create index on position
        CREATE INDEX IF NOT EXISTS demos_position_idx ON demos(position);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 