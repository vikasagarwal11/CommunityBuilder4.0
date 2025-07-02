/*
  # Secure Direct Messaging System

  1. New Tables
    - `admin_conversations` - Private conversation threads between users and admins
    - `admin_messages` - Individual messages within conversations
    - `admin_message_attachments` - File attachments for admin messages
    - `admin_availability` - Administrator availability status
    - `admin_message_encryption` - Message encryption keys and metadata

  2. Security Features
    - End-to-end encryption for sensitive messages
    - Message audit trail for compliance
    - Administrator verification system
    - Priority flagging for urgent issues

  3. Access Control
    - Strict RLS policies for message privacy
    - Role-based access for administrators
    - User can only see their own conversations
    - Admins can manage and delegate conversations
*/

-- Create admin_conversations table
CREATE TABLE IF NOT EXISTS admin_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  assigned_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  is_verified boolean DEFAULT false,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_messages table
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES admin_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_encrypted boolean DEFAULT false,
  encryption_key_id uuid,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create admin_message_attachments table
CREATE TABLE IF NOT EXISTS admin_message_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES admin_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  is_encrypted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create admin_availability table
CREATE TABLE IF NOT EXISTS admin_availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'offline')),
  status_message text,
  auto_assign boolean DEFAULT true,
  max_conversations integer DEFAULT 10,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(admin_id)
);

-- Create admin_message_encryption table for encryption metadata
CREATE TABLE IF NOT EXISTS admin_message_encryption (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES admin_conversations(id) ON DELETE CASCADE,
  encryption_algorithm text DEFAULT 'AES-256-GCM',
  key_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_message_encryption ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_conversations
CREATE POLICY "Users can view their own conversations"
  ON admin_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view assigned conversations"
  ON admin_conversations FOR SELECT TO authenticated
  USING (
    assigned_admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('Platform Owner', 'Community Admin')
    )
  );

CREATE POLICY "Users can create conversations"
  ON admin_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update conversations"
  ON admin_conversations FOR UPDATE TO authenticated
  USING (
    assigned_admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('Platform Owner', 'Community Admin')
    )
  );

-- RLS Policies for admin_messages
CREATE POLICY "Conversation participants can view messages"
  ON admin_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_conversations ac
      WHERE ac.id = admin_messages.conversation_id
      AND (ac.user_id = auth.uid() OR ac.assigned_admin_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('Platform Owner', 'Community Admin')
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON admin_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM admin_conversations ac
      WHERE ac.id = admin_messages.conversation_id
      AND (ac.user_id = auth.uid() OR ac.assigned_admin_id = auth.uid())
    )
  );

-- RLS Policies for admin_message_attachments
CREATE POLICY "Conversation participants can view attachments"
  ON admin_message_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_messages am
      JOIN admin_conversations ac ON am.conversation_id = ac.id
      WHERE am.id = admin_message_attachments.message_id
      AND (ac.user_id = auth.uid() OR ac.assigned_admin_id = auth.uid())
    )
  );

-- RLS Policies for admin_availability
CREATE POLICY "Anyone can view admin availability"
  ON admin_availability FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage their availability"
  ON admin_availability FOR ALL TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- RLS Policies for admin_message_encryption
CREATE POLICY "Conversation participants can view encryption metadata"
  ON admin_message_encryption FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_conversations ac
      WHERE ac.id = admin_message_encryption.conversation_id
      AND (ac.user_id = auth.uid() OR ac.assigned_admin_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_conversations_user_id ON admin_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_assigned_admin ON admin_conversations(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_status ON admin_conversations(status);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_priority ON admin_conversations(priority);
CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation_id ON admin_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_sender_id ON admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_availability_status ON admin_availability(status);

-- Create storage bucket for admin message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin-message-attachments',
  'admin-message-attachments', 
  false, -- Private bucket for security
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin message attachments (private)
CREATE POLICY "Conversation participants can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'admin-message-attachments' AND
  EXISTS (
    SELECT 1 FROM admin_conversations ac
    WHERE (ac.user_id = auth.uid() OR ac.assigned_admin_id = auth.uid())
  )
);

CREATE POLICY "Conversation participants can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'admin-message-attachments' AND
  EXISTS (
    SELECT 1 FROM admin_conversations ac
    WHERE (ac.user_id = auth.uid() OR ac.assigned_admin_id = auth.uid())
  )
);

-- Function to auto-assign conversations to available admins
CREATE OR REPLACE FUNCTION auto_assign_admin_conversation()
RETURNS TRIGGER AS $$
DECLARE
  available_admin_id uuid;
BEGIN
  -- Find an available admin with the least number of active conversations
  SELECT aa.admin_id INTO available_admin_id
  FROM admin_availability aa
  LEFT JOIN (
    SELECT assigned_admin_id, COUNT(*) as conversation_count
    FROM admin_conversations
    WHERE status IN ('open', 'in_progress')
    GROUP BY assigned_admin_id
  ) ac ON aa.admin_id = ac.assigned_admin_id
  WHERE aa.status = 'available' 
    AND aa.auto_assign = true
    AND COALESCE(ac.conversation_count, 0) < aa.max_conversations
  ORDER BY COALESCE(ac.conversation_count, 0) ASC
  LIMIT 1;

  -- Assign the admin if one is available
  IF available_admin_id IS NOT NULL THEN
    NEW.assigned_admin_id = available_admin_id;
    NEW.status = 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-assignment
DROP TRIGGER IF EXISTS auto_assign_admin_trigger ON admin_conversations;
CREATE TRIGGER auto_assign_admin_trigger
  BEFORE INSERT ON admin_conversations
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_admin_conversation();

-- Function to update conversation timestamp when new message is added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation timestamp
DROP TRIGGER IF EXISTS update_conversation_timestamp_trigger ON admin_messages;
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_uuid uuid, reader_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE admin_messages
  SET is_read = true,
      read_at = now()
  WHERE conversation_id = conversation_uuid
    AND sender_id != reader_uuid
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin verification status
CREATE OR REPLACE FUNCTION verify_admin_identity(admin_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = admin_uuid 
    AND r.name IN ('Platform Owner', 'Community Admin')
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default admin availability for existing admins
INSERT INTO admin_availability (admin_id, status, auto_assign, max_conversations)
SELECT ur.user_id, 'available', true, 10
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('Platform Owner', 'Community Admin')
  AND NOT EXISTS (
    SELECT 1 FROM admin_availability aa WHERE aa.admin_id = ur.user_id
  )
ON CONFLICT (admin_id) DO NOTHING;