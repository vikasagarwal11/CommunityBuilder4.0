/*
  # Enable RLS and add policies for post_comments
  
  1. Security
    - Enable Row Level Security on post_comments table
    - Create policy for users to comment on posts in their communities
    - Create policy for users to see comments on accessible posts
  2. Changes
    - Add foreign key constraint if it doesn't exist already
*/

-- Enable Row Level Security on post_comments table
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Create policy for users to comment on posts in their communities
CREATE POLICY "Users can comment on posts in their communities"
ON post_comments
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
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
CREATE POLICY "Users can see comments on accessible posts"
ON post_comments
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

-- Check if foreign key constraint already exists before adding it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_post_comments_user_profiles'
    AND conrelid = 'post_comments'::regclass
  ) THEN
    ALTER TABLE post_comments 
    ADD CONSTRAINT fk_post_comments_user_profiles 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;