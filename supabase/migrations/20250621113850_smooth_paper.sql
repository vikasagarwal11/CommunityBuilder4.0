/*
  # Fix RLS policies for post_comments table
  
  1. Security
    - Enable RLS on post_comments table if not already enabled
    - Add policies for insert and select operations with existence checks
  2. Changes
    - Add foreign key constraint to profiles table if it doesn't exist
*/

-- Enable Row Level Security on post_comments table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'post_comments' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policy for users to comment on posts in their communities if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_comments' 
    AND policyname = 'Users can comment on posts in their communities'
  ) THEN
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
  END IF;
END $$;

-- Create policy for users to see comments on accessible posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_comments' 
    AND policyname = 'Users can see comments on accessible posts'
  ) THEN
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
  END IF;
END $$;

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