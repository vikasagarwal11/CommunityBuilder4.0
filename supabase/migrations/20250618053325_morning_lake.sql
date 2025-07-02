/*
  # Add Engagement Tracking to Community Posts

  1. New Columns
    - Add `engagement_level` column to track post engagement
    - Add `user_preferences` column to store user preferences for personalization

  2. Functions
    - Create `increment_engagement` function to safely increment engagement level
    - Create `update_post_engagement_on_reaction` function to update engagement on reactions
    - Create `update_post_engagement_on_comment` function to update engagement on comments

  3. Triggers
    - Add triggers to automatically update engagement levels
*/

-- Add new columns to community_posts table
ALTER TABLE IF EXISTS public.community_posts 
ADD COLUMN IF NOT EXISTS engagement_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}'::jsonb;

-- Create index on engagement_level for efficient querying
CREATE INDEX IF NOT EXISTS idx_community_posts_engagement_level 
ON public.community_posts(engagement_level);

-- Create function to increment engagement level
CREATE OR REPLACE FUNCTION public.increment_engagement(
  message_id UUID,
  increment_by INTEGER DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_posts
  SET engagement_level = COALESCE(engagement_level, 0) + increment_by
  WHERE id = message_id;
END;
$$;

-- Create function to update post engagement when a reaction is added or removed
CREATE OR REPLACE FUNCTION public.update_post_engagement_on_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment engagement level when a reaction is added
    UPDATE public.community_posts
    SET engagement_level = COALESCE(engagement_level, 0) + 1
    WHERE id = NEW.message_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement engagement level when a reaction is removed
    UPDATE public.community_posts
    SET engagement_level = GREATEST(COALESCE(engagement_level, 0) - 1, 0)
    WHERE id = OLD.message_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create function to update post engagement when a comment is added or removed
CREATE OR REPLACE FUNCTION public.update_post_engagement_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment engagement level when a comment is added
    UPDATE public.community_posts
    SET engagement_level = COALESCE(engagement_level, 0) + 2
    WHERE id = NEW.post_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement engagement level when a comment is removed
    UPDATE public.community_posts
    SET engagement_level = GREATEST(COALESCE(engagement_level, 0) - 2, 0)
    WHERE id = OLD.post_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create or replace triggers for message reactions
DROP TRIGGER IF EXISTS update_post_engagement_on_reaction_trigger ON public.message_reactions;
CREATE TRIGGER update_post_engagement_on_reaction_trigger
AFTER INSERT OR DELETE ON public.message_reactions
FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_reaction();

-- Create or replace triggers for post comments
DROP TRIGGER IF EXISTS update_post_engagement_on_comment_trigger ON public.post_comments;
CREATE TRIGGER update_post_engagement_on_comment_trigger
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_comment();

-- Grant usage permissions
GRANT EXECUTE ON FUNCTION public.increment_engagement TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_engagement TO service_role;