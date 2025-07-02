/*
  # Enable RLS for post_comments table

  1. Security
    - Enable Row Level Security on post_comments table
    - Add policies for insert, select, update, delete operations
    - Ensure users can only comment on posts in communities they are members of
    - Allow users to see comments on posts they can access
    - Allow users to update and delete their own comments

  This migration adds proper security to the post_comments table to ensure
  data integrity and privacy.
*/

-- Enable Row Level Security
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting comments
CREATE POLICY "Users can comment on posts in their communities" ON post_comments
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

-- Create policy for viewing comments
CREATE POLICY "Users can see comments on accessible posts" ON post_comments
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

-- Create policy for updating comments
CREATE POLICY "Users can update their own comments" ON post_comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for deleting comments
CREATE POLICY "Users can delete their own comments" ON post_comments
FOR DELETE
USING (auth.uid() = user_id);