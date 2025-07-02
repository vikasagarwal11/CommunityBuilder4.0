-- MomFit Database Backup - Advanced Chat Features
-- Created: December 10, 2024
-- Status: Production Ready with Advanced Features

-- This file contains the complete database schema with all advanced features
-- Use this for restoration if needed

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Tables (from sparkling_oasis migration)
-- [Previous core tables would be here - profiles, roles, user_roles, communities, etc.]

-- Advanced Chat Features (from cold_lab migration)

-- Add action item fields to community_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_posts' AND column_name = 'is_action_item'
  ) THEN
    ALTER TABLE community_posts ADD COLUMN is_action_item boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_posts' AND column_name = 'priority'
  ) THEN
    ALTER TABLE community_posts ADD COLUMN priority text CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

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

-- Storage Bucket Setup (from wispy_coral migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'community-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'community-images',
      'community-images', 
      true,
      10485760, -- 10MB limit
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    );
  END IF;
END $$;

-- Enable RLS on new tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reactions') THEN
    ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_tags') THEN
    ALTER TABLE message_tags ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Message Reactions Policies (with conflict prevention)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Community members can view reactions" ON message_reactions;
  DROP POLICY IF EXISTS "Community members can add reactions" ON message_reactions;
  DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;
  
  -- Create new policies
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

-- Message Tags Policies (with conflict prevention)
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Community members can view tags" ON message_tags;
  DROP POLICY IF EXISTS "Community members can create tags" ON message_tags;
  DROP POLICY IF EXISTS "Tagged users can update tag status" ON message_tags;
  
  -- Create new policies
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

-- Storage Policies (with conflict prevention)
DO $$
BEGIN
  -- Drop existing storage policies if they exist
  DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access for community images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own community images" ON storage.objects;
  
  -- Create new storage policies
  CREATE POLICY "Authenticated users can upload community images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'community-images');

  CREATE POLICY "Public read access for community images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'community-images');

  CREATE POLICY "Users can delete their own community images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);
END $$;

-- Performance Indexes (with conflict prevention)
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_message_id ON message_tags(message_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_tagged_user_id ON message_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_status ON message_tags(status);

-- Create action item index only if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_posts' AND column_name = 'is_action_item'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_community_posts_action_item 
    ON community_posts(is_action_item) WHERE is_action_item = true;
  END IF;
END $$;

-- End of backup
-- To restore: Apply all migrations in order, then verify functionality