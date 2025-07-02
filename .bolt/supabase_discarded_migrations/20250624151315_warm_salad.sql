/*
  # Refactor message_reactions table to support multiple source tables

  1. Changes
    - Add `source_table` column to specify which table the reaction is for
    - Add `source_id` column to replace message_id
    - Migrate existing data to use 'community_posts' as source_table
    - Remove old foreign key constraint and message_id column
    - Add check constraint for valid source tables

  2. Security
    - Existing RLS policies will continue to work with the new structure
*/

-- Add new columns
ALTER TABLE message_reactions
ADD COLUMN source_table VARCHAR(50),
ADD COLUMN source_id UUID;

-- Migrate existing data
UPDATE message_reactions
SET source_table = 'community_posts', source_id = message_id
WHERE message_id IS NOT NULL;

-- Drop the old foreign key and column
ALTER TABLE message_reactions
DROP CONSTRAINT message_reactions_message_id_fkey,
DROP COLUMN message_id;

-- Add a check constraint for valid source_table values
ALTER TABLE message_reactions
ADD CONSTRAINT valid_source_table CHECK (source_table IN ('ai_chats', 'community_posts'));