/*
  # Add INSERT policy for community_activities table

  1. Security Changes
    - Add INSERT policy for community_activities table to allow authenticated users to create activity records
    - This enables the post_created_activity trigger to work properly when users create posts
    - Policy ensures users can only create activities for communities they are members of

  2. Changes Made
    - Added INSERT policy "Community members can create activities" for community_activities table
    - Policy checks that the user is a member of the community before allowing activity creation
*/

-- Add INSERT policy for community_activities table
CREATE POLICY "Community members can create activities"
  ON community_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM community_members cm
      WHERE cm.community_id = community_activities.community_id
      AND cm.user_id = auth.uid()
    )
  );