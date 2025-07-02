/*
  # AI Chats Table

  1. New Tables
    - `ai_chats` - Stores AI chat messages and responses
  
  2. Security
    - Enable RLS on `ai_chats` table
    - Add policy for users to manage their own chats
*/

-- Create AI Chats table
CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  community_id UUID REFERENCES communities(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_response BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES ai_chats(id),
  metadata JSONB
);

-- Enable Row Level Security
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only the user who created the chat can view or modify it
CREATE POLICY "Users can manage their own chats" ON ai_chats
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX idx_ai_chats_community_id ON ai_chats(community_id);
CREATE INDEX idx_ai_chats_parent_id ON ai_chats(parent_id) WHERE parent_id IS NOT NULL;