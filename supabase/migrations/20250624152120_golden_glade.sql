/*
# Update message_reactions table to support multiple source tables

1. Changes
   - Add source_table and source_id columns
   - Migrate existing data from message_id to source_id
   - Drop message_id column with CASCADE
   - Add constraint for valid source tables
   - Recreate policies with auth.uid() instead of uid()

2. Security
   - Recreate policies for viewing and adding reactions
   - Support both community_posts and ai_chats sources
*/

-- Add new columns
ALTER TABLE message_reactions
ADD COLUMN source_table VARCHAR(50),
ADD COLUMN source_id UUID;

-- Migrate existing data
UPDATE message_reactions
SET source_table = 'community_posts', source_id = message_id
WHERE message_id IS NOT NULL;

-- Drop the old foreign key and column with CASCADE to handle dependent policies
ALTER TABLE message_reactions
DROP COLUMN message_id CASCADE;

-- Add a check constraint for valid source_table values
ALTER TABLE message_reactions
ADD CONSTRAINT valid_source_table CHECK (source_table IN ('ai_chats', 'community_posts'));

-- Recreate the policies that were dropped by CASCADE
CREATE POLICY "Users can view reactions on accessible messages" 
ON message_reactions
FOR SELECT
TO public
USING (
  (source_table = 'community_posts' AND EXISTS (
    SELECT 1
    FROM community_posts cp
    JOIN community_members cm ON cp.community_id = cm.community_id
    WHERE cp.id = message_reactions.source_id AND cm.user_id = auth.uid()
  ))
  OR
  (source_table = 'ai_chats' AND EXISTS (
    SELECT 1
    FROM ai_chats
    WHERE id = message_reactions.source_id AND user_id = auth.uid()
  ))
);

CREATE POLICY "Users can add reactions to community messages" 
ON message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  (source_table = 'community_posts' AND EXISTS (
    SELECT 1
    FROM community_posts cp
    JOIN community_members cm ON cp.community_id = cm.community_id
    WHERE cp.id = message_reactions.source_id AND cm.user_id = auth.uid()
  ))
  OR
  (source_table = 'ai_chats' AND EXISTS (
    SELECT 1
    FROM ai_chats
    WHERE id = message_reactions.source_id AND user_id = auth.uid()
  ))
);