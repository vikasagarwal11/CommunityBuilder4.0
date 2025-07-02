/*
  # RLS Policies for post_likes and post_comments

  1. Changes
    - Enables Row Level Security on post_likes and post_comments tables if not already enabled
    - Creates policies for post_likes and post_comments tables if they don't already exist
    - Adds trigger functions for updating post engagement metrics
  
  2. Security
    - Ensures users can only interact with posts in communities they belong to
    - Allows users to manage their own content (likes and comments)
*/

-- Enable Row Level Security on post_likes table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'post_likes' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policy for users to like posts in their communities if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_likes' 
    AND policyname = 'Users can like posts in their communities'
  ) THEN
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
  END IF;
END $$;

-- Create policy for users to see likes on accessible posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_likes' 
    AND policyname = 'Users can see likes on accessible posts'
  ) THEN
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
  END IF;
END $$;

-- Create policy for users to delete their own likes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_likes' 
    AND policyname = 'Users can delete their own likes'
  ) THEN
    CREATE POLICY "Users can delete their own likes" ON post_likes
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

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
  END IF;
END $$;

-- Create policy for users to delete their own comments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_comments' 
    AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments" ON post_comments
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policy for users to update their own comments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_comments' 
    AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments" ON post_comments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add trigger to update post engagement on comment if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_post_engagement_on_comment_trigger'
    AND tgrelid = 'post_comments'::regclass
  ) THEN
    CREATE TRIGGER update_post_engagement_on_comment_trigger
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_comment();
  END IF;
END $$;

-- Add trigger to update post engagement on reaction if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_post_engagement_on_reaction_trigger'
    AND tgrelid = 'message_reactions'::regclass
  ) THEN
    CREATE TRIGGER update_post_engagement_on_reaction_trigger
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_reaction();
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