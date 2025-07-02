/*
  # Add Engagement Tracking to Community Posts

  1. New Columns
    - Add `engagement_level` INTEGER DEFAULT 0 to community_posts
    - Add `user_preferences` JSONB to community_posts

  2. New Function
    - Create `increment_engagement` function to safely increment engagement level
    - Add trigger to update engagement_level when a post is interacted with
*/

-- Add new columns to community_posts if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_posts' AND column_name = 'engagement_level'
  ) THEN
    ALTER TABLE community_posts ADD COLUMN engagement_level INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_posts' AND column_name = 'user_preferences'
  ) THEN
    ALTER TABLE community_posts ADD COLUMN user_preferences JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create function to increment engagement level
CREATE OR REPLACE FUNCTION increment_engagement(message_id UUID, increment_by INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET engagement_level = COALESCE(engagement_level, 0) + increment_by
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to update engagement level when a post gets a reaction
CREATE OR REPLACE FUNCTION update_post_engagement_on_reaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment engagement level when a new reaction is added
  IF (TG_OP = 'INSERT') THEN
    PERFORM increment_engagement(NEW.message_id, 1);
  -- Decrement engagement level when a reaction is removed
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM increment_engagement(OLD.message_id, -1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update engagement level when a post gets a reaction
DROP TRIGGER IF EXISTS update_post_engagement_on_reaction_trigger ON message_reactions;
CREATE TRIGGER update_post_engagement_on_reaction_trigger
AFTER INSERT OR DELETE ON message_reactions
FOR EACH ROW
EXECUTE FUNCTION update_post_engagement_on_reaction();

-- Create trigger function to update engagement level when a post gets a comment
CREATE OR REPLACE FUNCTION update_post_engagement_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment engagement level when a new comment is added
  IF (TG_OP = 'INSERT') THEN
    PERFORM increment_engagement(NEW.post_id, 2);
  -- Decrement engagement level when a comment is removed
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM increment_engagement(OLD.post_id, -2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update engagement level when a post gets a comment
DROP TRIGGER IF EXISTS update_post_engagement_on_comment_trigger ON post_comments;
CREATE TRIGGER update_post_engagement_on_comment_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_engagement_on_comment();