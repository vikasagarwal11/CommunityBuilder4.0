/*
  # Add AI chat columns to community_posts table
  
  1. Changes
    - Add `is_ai_chat` boolean column with default FALSE
    - Add `parent_post_id` UUID column with reference to community_posts(id)
*/

-- Add columns to community_posts table
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS is_ai_chat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES community_posts(id);

-- Create index on is_ai_chat column for faster filtering
CREATE INDEX IF NOT EXISTS idx_community_posts_is_ai_chat ON community_posts(is_ai_chat);

-- Create index on parent_post_id for faster lookups of replies
CREATE INDEX IF NOT EXISTS idx_community_posts_parent_post_id ON community_posts(parent_post_id) WHERE parent_post_id IS NOT NULL;