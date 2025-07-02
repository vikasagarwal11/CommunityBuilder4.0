/*
  # Fix engagement triggers and functions

  1. New Functions
    - `update_post_engagement_on_comment` - Updates post engagement when comments are added/removed
    - `update_post_engagement_on_reaction` - Updates post engagement when reactions are added/removed
  
  2. Triggers
    - Add triggers to post_comments and message_reactions tables
  
  3. RPC Functions
    - Add `increment_engagement` function for manually incrementing engagement
*/

-- Create function to update post engagement when comments are added/removed
CREATE OR REPLACE FUNCTION update_post_engagement_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment comments_count on the post
    UPDATE community_posts
    SET comments_count = comments_count + 1,
        engagement_level = engagement_level + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement comments_count on the post
    UPDATE community_posts
    SET comments_count = GREATEST(comments_count - 1, 0),
        engagement_level = GREATEST(engagement_level - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to update post engagement when reactions are added/removed
CREATE OR REPLACE FUNCTION update_post_engagement_on_reaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment likes_count on the post
    UPDATE community_posts
    SET likes_count = likes_count + 1,
        engagement_level = engagement_level + 1
    WHERE id = NEW.message_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement likes_count on the post
    UPDATE community_posts
    SET likes_count = GREATEST(likes_count - 1, 0),
        engagement_level = GREATEST(engagement_level - 1, 0)
    WHERE id = OLD.message_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to post_comments table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_post_engagement_on_comment_trigger'
  ) THEN
    CREATE TRIGGER update_post_engagement_on_comment_trigger
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_comment();
  END IF;
END $$;

-- Add trigger to message_reactions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_post_engagement_on_reaction_trigger'
  ) THEN
    CREATE TRIGGER update_post_engagement_on_reaction_trigger
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_reaction();
  END IF;
END $$;

-- Create RPC function to increment engagement
CREATE OR REPLACE FUNCTION increment_engagement(message_id UUID, increment_by INT DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET engagement_level = engagement_level + increment_by
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql;