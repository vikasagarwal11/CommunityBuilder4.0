/*
  # Community Admin Messaging System

  1. New Tables
    - `community_admin_conversations`
      - `id` (uuid, primary key)
      - `community_id` (uuid, references communities)
      - `user_id` (uuid, references auth.users)
      - `admin_id` (uuid, references auth.users)
      - `subject` (text)
      - `priority` (text: low, normal, high)
      - `status` (text: open, in_progress, resolved, closed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `community_admin_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references community_admin_conversations)
      - `sender_id` (uuid, references auth.users)
      - `content` (text)
      - `message_type` (text: text, file, system)
      - `is_read` (boolean)
      - `read_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own conversations
    - Add policies for community admins to manage conversations in their communities
*/

-- Create community admin conversations table
CREATE TABLE IF NOT EXISTS community_admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create community admin messages table
CREATE TABLE IF NOT EXISTS community_admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES community_admin_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_admin_conversations_community_id 
  ON community_admin_conversations(community_id);
CREATE INDEX IF NOT EXISTS idx_community_admin_conversations_user_id 
  ON community_admin_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_community_admin_conversations_admin_id 
  ON community_admin_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_community_admin_conversations_status 
  ON community_admin_conversations(status);

CREATE INDEX IF NOT EXISTS idx_community_admin_messages_conversation_id 
  ON community_admin_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_community_admin_messages_sender_id 
  ON community_admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_community_admin_messages_created_at 
  ON community_admin_messages(created_at);

-- Enable RLS
ALTER TABLE community_admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_admin_conversations

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
  ON community_admin_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create conversations in communities they are members of
CREATE POLICY "Users can create conversations in their communities"
  ON community_admin_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_admin_conversations.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- Community admins can view conversations in their communities
CREATE POLICY "Community admins can view conversations"
  ON community_admin_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_admin_conversations.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Community admins can update conversations in their communities
CREATE POLICY "Community admins can update conversations"
  ON community_admin_conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_admin_conversations.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- RLS Policies for community_admin_messages

-- Users and admins can view messages in conversations they're part of
CREATE POLICY "Conversation participants can view messages"
  ON community_admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_admin_conversations cac
      WHERE cac.id = community_admin_messages.conversation_id
      AND (cac.user_id = auth.uid() OR cac.admin_id = auth.uid())
    )
  );

-- Users and admins can send messages in conversations they're part of
CREATE POLICY "Conversation participants can send messages"
  ON community_admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_admin_conversations cac
      WHERE cac.id = community_admin_messages.conversation_id
      AND (cac.user_id = auth.uid() OR cac.admin_id = auth.uid())
    )
  );

-- Users and admins can update read status of messages
CREATE POLICY "Conversation participants can update message read status"
  ON community_admin_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_admin_conversations cac
      WHERE cac.id = community_admin_messages.conversation_id
      AND (cac.user_id = auth.uid() OR cac.admin_id = auth.uid())
    )
  );

-- Function to update conversation timestamp when new message is added
CREATE OR REPLACE FUNCTION update_community_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_admin_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
CREATE TRIGGER update_community_conversation_timestamp_trigger
  AFTER INSERT ON community_admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_community_conversation_timestamp();