/*
  # Fix AI Community Profiles RLS Policy

  1. Changes
    - Update the INSERT policy for `ai_community_profiles` to allow any community member to create AI profiles
    - This enables AI profile generation for all community members, not just admins

  2. Security
    - Maintains proper access control by ensuring only community members can create profiles for their communities
    - Users can only create AI profiles for communities they belong to
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Community admins can insert AI profiles" ON ai_community_profiles;

-- Create a new policy that allows any community member to insert AI profiles
CREATE POLICY "Community members can insert AI profiles"
  ON ai_community_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = ai_community_profiles.community_id
    AND community_members.user_id = auth.uid()
  ));