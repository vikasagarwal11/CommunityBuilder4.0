/*
  # Add message interaction features
  1. New Tables
    - message_reactions: Store emoji reactions on messages
    - message_tags: Store user tags and action items
    - Add action item fields to community_posts
  2. Security
    - Enable RLS on new tables
*/

-- Add action item fields to community_posts
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS is_action_item boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('low', 'medium', 'high'));

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message_tags table
CREATE TABLE IF NOT EXISTS message_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  tagged_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_type text NOT NULL CHECK (tag_type IN ('mention', 'action_item', 'follow_up')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed')),
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_message_id ON message_tags(message_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_tagged_user_id ON message_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_status ON message_tags(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_action_item ON community_posts(is_action_item) WHERE is_action_item = true;