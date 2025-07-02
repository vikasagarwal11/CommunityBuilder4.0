/*
  # Add engagement tracking to community posts

  1. New Columns
    - `engagement_level` (integer) - Tracks the level of engagement for each post
    - `user_preferences` (jsonb) - Stores user preferences related to the post

  2. Changes
    - Added default value of 0 for engagement_level
    - Added default empty JSON object for user_preferences
*/

-- Add engagement_level column with default value of 0
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS engagement_level INTEGER DEFAULT 0;

-- Add user_preferences column with default empty JSON object
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}'::jsonb;

-- Add index on engagement_level for faster queries
CREATE INDEX IF NOT EXISTS idx_community_posts_engagement_level 
ON community_posts(engagement_level);