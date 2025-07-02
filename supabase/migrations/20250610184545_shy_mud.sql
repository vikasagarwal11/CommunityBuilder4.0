/*
  # Add priority column to message_tags table

  1. Changes
    - Add `priority` column to `message_tags` table with default value 'medium'
    - Add check constraint to ensure priority values are valid ('low', 'medium', 'high')

  2. Security
    - No changes to existing RLS policies
    - Column allows NULL values for non-action-item tags
*/

-- Add priority column to message_tags table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_tags' AND column_name = 'priority'
  ) THEN
    ALTER TABLE message_tags ADD COLUMN priority text;
  END IF;
END $$;

-- Add check constraint for priority values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'message_tags_priority_check'
  ) THEN
    ALTER TABLE message_tags ADD CONSTRAINT message_tags_priority_check 
    CHECK (priority IS NULL OR priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));
  END IF;
END $$;