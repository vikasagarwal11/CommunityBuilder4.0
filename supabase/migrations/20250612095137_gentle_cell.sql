/*
  # Direct Messaging System

  1. New Tables
    - `community_settings` - Controls whether DMs are enabled per community
    - `direct_conversations` - 1-on-1 conversations between users
    - `direct_messages` - Messages in direct conversations
    - `user_blocks` - Block functionality for users

  2. Security
    - Enable RLS on all new tables
    - Add policies for privacy and community controls
    - Ensure users can only access their own conversations

  3. Features
    - Community admins can enable/disable DMs for their community
    - Users can block other users
    - Private 1-on-1 messaging
    - Message read receipts
*/

-- Create community settings table
CREATE TABLE IF NOT EXISTS community_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE UNIQUE,
  allow_direct_messages boolean DEFAULT true,
  allow_member_invites boolean DEFAULT true,
  require_admin_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create direct conversations table
CREATE TABLE IF NOT EXISTS direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (user1_id != user2_id),
  CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id, community_id)
);

-- Create direct messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES direct_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create user blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_users_block CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id, community_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_settings_community_id 
  ON community_settings(community_id);

CREATE INDEX IF NOT EXISTS idx_direct_conversations_user1 
  ON direct_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_user2 
  ON direct_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_community 
  ON direct_conversations(community_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_last_message 
  ON direct_conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation 
  ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender 
  ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at 
  ON direct_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker 
  ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked 
  ON user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_settings

-- Community admins can manage settings
CREATE POLICY "Community admins can manage settings"
  ON community_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_settings.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_settings.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Community members can view settings
CREATE POLICY "Community members can view settings"
  ON community_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_settings.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- RLS Policies for direct_conversations

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
  ON direct_conversations
  FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Users can create conversations if DMs are enabled and they're not blocked
CREATE POLICY "Users can create conversations"
  ON direct_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user1_id = auth.uid() OR user2_id = auth.uid()) AND
    -- Check if DMs are enabled in the community
    EXISTS (
      SELECT 1 FROM community_settings cs
      WHERE cs.community_id = direct_conversations.community_id
      AND cs.allow_direct_messages = true
    ) AND
    -- Check if both users are members of the community
    EXISTS (
      SELECT 1 FROM community_members cm1
      WHERE cm1.community_id = direct_conversations.community_id
      AND cm1.user_id = user1_id
    ) AND
    EXISTS (
      SELECT 1 FROM community_members cm2
      WHERE cm2.community_id = direct_conversations.community_id
      AND cm2.user_id = user2_id
    ) AND
    -- Check if users haven't blocked each other
    NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE ub.community_id = direct_conversations.community_id
      AND (
        (ub.blocker_id = user1_id AND ub.blocked_id = user2_id) OR
        (ub.blocker_id = user2_id AND ub.blocked_id = user1_id)
      )
    )
  );

-- RLS Policies for direct_messages

-- Users can view messages in their conversations
CREATE POLICY "Users can view own conversation messages"
  ON direct_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_conversations dc
      WHERE dc.id = direct_messages.conversation_id
      AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in own conversations"
  ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM direct_conversations dc
      WHERE dc.id = direct_messages.conversation_id
      AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
      -- Check if DMs are still enabled
      AND EXISTS (
        SELECT 1 FROM community_settings cs
        WHERE cs.community_id = dc.community_id
        AND cs.allow_direct_messages = true
      )
      -- Check if users haven't blocked each other
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE ub.community_id = dc.community_id
        AND (
          (ub.blocker_id = dc.user1_id AND ub.blocked_id = dc.user2_id) OR
          (ub.blocker_id = dc.user2_id AND ub.blocked_id = dc.user1_id)
        )
      )
    )
  );

-- Users can update read status of messages
CREATE POLICY "Users can update message read status"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_conversations dc
      WHERE dc.id = direct_messages.conversation_id
      AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
    )
  );

-- RLS Policies for user_blocks

-- Users can manage their own blocks
CREATE POLICY "Users can manage own blocks"
  ON user_blocks
  FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- Users can view if they are blocked (for UI purposes)
CREATE POLICY "Users can view blocks involving them"
  ON user_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

-- Function to update conversation timestamp when new message is added
CREATE OR REPLACE FUNCTION update_direct_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE direct_conversations
  SET last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
CREATE TRIGGER update_direct_conversation_timestamp_trigger
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_conversation_timestamp();

-- Function to create default community settings
CREATE OR REPLACE FUNCTION create_default_community_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_settings (community_id, allow_direct_messages, allow_member_invites)
  VALUES (NEW.id, true, true)
  ON CONFLICT (community_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default settings when community is created
CREATE TRIGGER create_default_community_settings_trigger
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION create_default_community_settings();

-- Insert default settings for existing communities
INSERT INTO community_settings (community_id, allow_direct_messages, allow_member_invites)
SELECT id, true, true
FROM communities
ON CONFLICT (community_id) DO NOTHING;