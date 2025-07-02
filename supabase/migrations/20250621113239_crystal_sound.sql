/*
  # Enable RLS for post_likes table

  1. Security
    - Enable Row Level Security on post_likes table
    - Add policies for insert, select, delete operations
    - Ensure users can only like posts in communities they are members of
    - Allow users to see likes on posts they can access

  This migration adds proper security to the post_likes table to ensure
  data integrity and privacy.
*/

-- Enable Row Level Security
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting likes
CREATE POLICY "Users can like posts in their communities" ON post_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM community_posts
    WHERE id = post_id
    AND community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Create policy for viewing likes
CREATE POLICY "Users can see likes on accessible posts" ON post_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM community_posts
    WHERE id = post_id
    AND community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Create policy for deleting likes
CREATE POLICY "Users can delete their own likes" ON post_likes
FOR DELETE
USING (
  auth.uid() = user_id
);