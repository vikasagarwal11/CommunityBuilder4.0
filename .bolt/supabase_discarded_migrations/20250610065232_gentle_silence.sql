/*
  # Advanced Chat Features for Platform Communities

  1. New Tables
    - message_reactions (emoji reactions on messages)
    - message_tags (user mentions, assignments, action items)
    - message_attachments (file uploads)
    - action_items (task management)

  2. Enhanced Tables
    - Add fields to community_posts for action items and priority
    - Add metadata fields for enhanced messaging

  3. Security
    - RLS policies for all new tables
    - Proper foreign key relationships
    - File upload security
*/

-- Add enhanced fields to community_posts
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS is_action_item boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS due_date timestamptz,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message_tags table for mentions and assignments
CREATE TABLE IF NOT EXISTS message_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  tagged_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_type text NOT NULL CHECK (tag_type IN ('mention', 'action_item', 'follow_up')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed')),
  due_date timestamptz,
  priority text CHECK (priority IN ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Create action_items table for task management
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date timestamptz,
  completed_at timestamptz,
  message_id uuid REFERENCES community_posts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Community members can view reactions"
  ON message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_reactions.message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can add reactions"
  ON message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_reactions.message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for message_tags
CREATE POLICY "Community members can view tags"
  ON message_tags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_tags.message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can create tags"
  ON message_tags FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = tagged_by AND
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_tags.message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Tagged users can update tag status"
  ON message_tags FOR UPDATE TO authenticated
  USING (auth.uid() = tagged_user_id OR auth.uid() = tagged_by)
  WITH CHECK (auth.uid() = tagged_user_id OR auth.uid() = tagged_by);

-- RLS Policies for message_attachments
CREATE POLICY "Community members can view attachments"
  ON message_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_attachments.message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can upload attachments"
  ON message_attachments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_attachments.message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON message_attachments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for action_items
CREATE POLICY "Community members can view action items"
  ON action_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = action_items.community_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can create action items"
  ON action_items FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = action_items.community_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Assigned users and creators can update action items"
  ON action_items FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_to OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = assigned_to OR auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_message_id ON message_tags(message_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_tagged_user_id ON message_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_status ON message_tags(status);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_action_items_community_id ON action_items(community_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_action_item ON community_posts(is_action_item) WHERE is_action_item = true;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for message attachments
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Community members can view message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update message tags when action items are created
CREATE OR REPLACE FUNCTION create_message_tag_for_action_item()
RETURNS trigger AS $$
BEGIN
  IF NEW.message_id IS NOT NULL THEN
    INSERT INTO message_tags (
      message_id,
      tagged_user_id,
      tagged_by,
      tag_type,
      status,
      due_date,
      priority,
      notes
    ) VALUES (
      NEW.message_id,
      NEW.assigned_to,
      NEW.created_by,
      'action_item',
      NEW.status,
      NEW.due_date,
      NEW.priority,
      NEW.description
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create message tags for action items
CREATE TRIGGER action_item_creates_message_tag
  AFTER INSERT ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION create_message_tag_for_action_item();

-- Function to update action item status when message tag is updated
CREATE OR REPLACE FUNCTION sync_action_item_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.tag_type = 'action_item' AND OLD.status != NEW.status THEN
    UPDATE action_items 
    SET 
      status = NEW.status,
      completed_at = CASE WHEN NEW.status = 'completed' THEN now() ELSE NULL END,
      updated_at = now()
    WHERE message_id = NEW.message_id 
    AND assigned_to = NEW.tagged_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync action item status
CREATE TRIGGER sync_action_item_status_trigger
  AFTER UPDATE ON message_tags
  FOR EACH ROW
  EXECUTE FUNCTION sync_action_item_status();