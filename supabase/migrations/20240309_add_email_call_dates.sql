-- Add email_sent_date and call_made_date columns
ALTER TABLE demos
  ADD COLUMN IF NOT EXISTS email_sent_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS call_made_date timestamp with time zone; 