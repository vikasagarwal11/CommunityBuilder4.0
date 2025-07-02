/*
  # Fix Message Tags RLS Policies

  1. Security Updates
    - Add INSERT policy for authenticated users to create message tags
    - Add UPDATE policy for users to update their own tags
    - Add DELETE policy for users to delete their own tags
    - Ensure users can only tag messages in communities they're members of

  2. Policy Details
    - INSERT: Users can create tags if they're the tagger and both users are community members
    - UPDATE: Users can update tags they created
    - DELETE: Users can delete tags they created
    - SELECT: Users can view tags on messages in communities they're members of
*/

-- Add INSERT policy for message tags
CREATE POLICY "Users can create message tags in their communities"
  ON message_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tagged_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm1 ON cp.community_id = cm1.community_id
      JOIN community_members cm2 ON cp.community_id = cm2.community_id
      WHERE cp.id = message_tags.message_id
        AND cm1.user_id = auth.uid()
        AND cm2.user_id = message_tags.tagged_user_id
    )
  );

-- Add UPDATE policy for message tags
CREATE POLICY "Users can update their own message tags"
  ON message_tags
  FOR UPDATE
  TO authenticated
  USING (tagged_by = auth.uid())
  WITH CHECK (tagged_by = auth.uid());

-- Add DELETE policy for message tags
CREATE POLICY "Users can delete their own message tags"
  ON message_tags
  FOR DELETE
  TO authenticated
  USING (tagged_by = auth.uid());

-- Add SELECT policy for message tags (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_tags' 
    AND policyname = 'Users can view message tags in their communities'
  ) THEN
    CREATE POLICY "Users can view message tags in their communities"
      ON message_tags
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM community_posts cp
          JOIN community_members cm ON cp.community_id = cm.community_id
          WHERE cp.id = message_tags.message_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;