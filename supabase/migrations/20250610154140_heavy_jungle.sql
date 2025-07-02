/*
  # Advanced Community Chat Features

  1. New Tables
    - `message_reactions` - User reactions to messages (emojis)
    - `message_tags` - User mentions, action items, and follow-ups
    - `message_attachments` - File attachments for messages
    - `action_items` - Dedicated action item management

  2. Security
    - Enable RLS on all new tables
    - Add policies for community members to interact with messages
    - Ensure proper access control for reactions, tags, and attachments

  3. Performance
    - Add indexes for efficient querying
    - Optimize for real-time chat performance
*/

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message_tags table
CREATE TABLE IF NOT EXISTS message_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  tagged_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('mention', 'action_item', 'follow_up')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  message_id UUID REFERENCES community_posts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Replace the existing policy creation for message_reactions
DO $$
BEGIN
  DROP POLICY IF EXISTS "Community members can view reactions" ON message_reactions;
  DROP POLICY IF EXISTS "Community members can add reactions" ON message_reactions;
  DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;
  
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
END $$;

-- Replace the existing policy creation for message_tags
DO $$
BEGIN
  DROP POLICY IF EXISTS "Community members can view tags" ON message_tags;
  DROP POLICY IF EXISTS "Community members can create tags" ON message_tags;
  DROP POLICY IF EXISTS "Tagged users can update tag status" ON message_tags;
  
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
END $$;

-- Replace the existing policy creation for message_attachments
DO $$
BEGIN
  DROP POLICY IF EXISTS "Community members can view attachments" ON message_attachments;
  DROP POLICY IF EXISTS "Community members can upload attachments" ON message_attachments;
  DROP POLICY IF EXISTS "Users can delete their own attachments" ON message_attachments;
  
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
END $$;

-- Replace the existing policy creation for action_items
DO $$
BEGIN
  DROP POLICY IF EXISTS "Community members can view action items" ON action_items;
  DROP POLICY IF EXISTS "Community members can create action items" ON action_items;
  DROP POLICY IF EXISTS "Assigned users and creators can update action items" ON action_items;
  
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
END $$;

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

-- Create functions for action item management
CREATE OR REPLACE FUNCTION create_message_tag_for_action_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message_id IS NOT NULL THEN
    INSERT INTO message_tags (
      message_id,
      tagged_user_id,
      tagged_by,
      tag_type,
      status,
      due_date,
      created_at,
      updated_at
    ) VALUES (
      NEW.message_id,
      NEW.assigned_to,
      NEW.created_by,
      'action_item',
      NEW.status,
      NEW.due_date,
      NEW.created_at,
      NEW.updated_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_action_item_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status AND NEW.message_id IS NOT NULL THEN
    UPDATE action_items
    SET status = NEW.status, updated_at = NEW.updated_at
    WHERE message_id = NEW.message_id AND assigned_to = NEW.tagged_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (IDEMPOTENT)
DROP TRIGGER IF EXISTS action_item_creates_message_tag ON action_items;
CREATE TRIGGER action_item_creates_message_tag
  AFTER INSERT ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION create_message_tag_for_action_item();

DROP TRIGGER IF EXISTS sync_action_item_status_trigger ON message_tags;
CREATE TRIGGER sync_action_item_status_trigger
  AFTER UPDATE ON message_tags
  FOR EACH ROW
  EXECUTE FUNCTION sync_action_item_status();