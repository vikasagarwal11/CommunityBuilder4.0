/*
  # Enable RLS and create policies for post_likes and post_comments
  
  1. Security
    - Enable Row Level Security on post_likes and post_comments tables
    - Add policies for users to like and comment on posts in their communities
    - Add policies for users to view likes and comments on posts in their communities
    - Add policies for users to delete their own comments
    - Add policies for users to update their own comments
  
  2. Changes
    - Enable RLS on post_likes table
    - Create INSERT policy for post_likes
    - Create SELECT policy for post_likes
    - Enable RLS on post_comments table
    - Create INSERT policy for post_comments
    - Create SELECT policy for post_comments
    - Create DELETE policy for post_comments
    - Create UPDATE policy for post_comments
*/

-- Enable Row Level Security on post_likes table
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Create policy for users to like posts in their communities
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

-- Create policy for users to see likes on accessible posts
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

-- Create policy for users to delete their own likes
CREATE POLICY "Users can delete their own likes" ON post_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Enable Row Level Security on post_comments table
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Create policy for users to comment on posts in their communities
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

-- Create policy for users to see comments on accessible posts
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

-- Create policy for users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON post_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Create policy for users to update their own comments
CREATE POLICY "Users can update their own comments" ON post_comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger to update post engagement on comment
CREATE TRIGGER update_post_engagement_on_comment_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_comment();

-- Add trigger to update post engagement on reaction
CREATE TRIGGER update_post_engagement_on_reaction_trigger
AFTER INSERT OR DELETE ON message_reactions
FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_reaction();