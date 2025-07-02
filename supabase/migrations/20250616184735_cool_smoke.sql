/*
  # Add RLS policies for message_reactions table

  1. Security
    - Add policy for users to insert their own reactions
    - Add policy for users to view reactions on messages they can see
    - Add policy for users to delete their own reactions
    - Add policy for users to update their own reactions

  2. Changes
    - CREATE POLICY for INSERT operations (users can react to messages in communities they're members of)
    - CREATE POLICY for SELECT operations (users can view reactions on messages they can access)
    - CREATE POLICY for DELETE operations (users can remove their own reactions)
    - CREATE POLICY for UPDATE operations (users can update their own reactions)
*/

-- Policy for users to insert their own reactions to messages in communities they're members of
CREATE POLICY "Users can add reactions to community messages"
  ON message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_reactions.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Policy for users to view reactions on messages they can access
CREATE POLICY "Users can view reactions on accessible messages"
  ON message_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_reactions.message_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Policy for users to delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON message_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for users to update their own reactions
CREATE POLICY "Users can update their own reactions"
  ON message_reactions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());