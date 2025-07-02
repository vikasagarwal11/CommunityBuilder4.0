/*
  # Post Engagement Functions and Triggers
  
  1. New Functions
    - `update_post_engagement_on_comment` - Updates post engagement when comments are added/removed
    - `update_post_engagement_on_reaction` - Updates post engagement when reactions are added/removed
    - `increment_engagement` - RPC function to increment engagement level
  
  2. New Triggers
    - Adds triggers to post_comments and message_reactions tables
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

-- Create RPC function to increment engagement
CREATE OR REPLACE FUNCTION increment_engagement(message_id UUID, increment_by INT DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET engagement_level = engagement_level + increment_by
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist to avoid errors
DROP TRIGGER IF EXISTS update_post_engagement_on_comment_trigger ON post_comments;
DROP TRIGGER IF EXISTS update_post_engagement_on_reaction_trigger ON message_reactions;

-- Add trigger to post_comments table
CREATE TRIGGER update_post_engagement_on_comment_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_comment();

-- Add trigger to message_reactions table
CREATE TRIGGER update_post_engagement_on_reaction_trigger
AFTER INSERT OR DELETE ON message_reactions
FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_reaction();