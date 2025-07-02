/*
  # Add URL Slugs and AI Chat Features

  1. New Columns
    - `communities.slug` - URL-friendly identifier for communities
    - `profiles.username` - URL-friendly identifier for user profiles
    - `community_events.slug` - URL-friendly identifier for events

  2. AI Chat Features
    - `message_embeddings` table for storing vector embeddings of messages
    - Enable pgvector extension for similarity search
    - Add functions for generating and querying embeddings

  3. Unique Constraints
    - Ensure slugs and usernames are unique
    - Add indexes for performance
*/

-- Enable pgvector extension for AI features
CREATE EXTENSION IF NOT EXISTS vector;

-- Add slug column to communities table
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS slug text;

-- Add username column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username text;

-- Add slug column to community_events table
ALTER TABLE community_events
ADD COLUMN IF NOT EXISTS slug text;

-- Add unique constraints
ALTER TABLE communities
ADD CONSTRAINT communities_slug_key UNIQUE (slug);

ALTER TABLE profiles
ADD CONSTRAINT profiles_username_key UNIQUE (username);

ALTER TABLE community_events
ADD CONSTRAINT community_events_slug_key UNIQUE (slug);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_community_events_slug ON community_events(slug);

-- Function to generate a slug from text
CREATE OR REPLACE FUNCTION generate_slug(input_text text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special characters
  result := lower(input_text);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(both '-' from result);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique slug
CREATE OR REPLACE FUNCTION generate_unique_slug(input_text text, table_name text, id_column text, existing_id uuid DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
  slug_exists boolean;
  query_text text;
BEGIN
  -- Generate base slug
  base_slug := generate_slug(input_text);
  final_slug := base_slug;
  
  -- Check if slug exists in the specified table
  LOOP
    IF table_name = 'communities' THEN
      SELECT EXISTS(SELECT 1 FROM communities WHERE slug = final_slug AND (existing_id IS NULL OR id != existing_id)) INTO slug_exists;
    ELSIF table_name = 'profiles' THEN
      SELECT EXISTS(SELECT 1 FROM profiles WHERE username = final_slug AND (existing_id IS NULL OR id != existing_id)) INTO slug_exists;
    ELSIF table_name = 'community_events' THEN
      SELECT EXISTS(SELECT 1 FROM community_events WHERE slug = final_slug AND (existing_id IS NULL OR id != existing_id)) INTO slug_exists;
    ELSE
      RAISE EXCEPTION 'Unsupported table: %', table_name;
    END IF;
    
    EXIT WHEN NOT slug_exists;
    
    -- If slug exists, append a counter
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing communities
DO $$
DECLARE
  community_record RECORD;
BEGIN
  FOR community_record IN SELECT id, name FROM communities WHERE slug IS NULL LOOP
    UPDATE communities
    SET slug = generate_unique_slug(community_record.name, 'communities', 'id', community_record.id)
    WHERE id = community_record.id;
  END LOOP;
END $$;

-- Generate usernames for existing profiles
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id, full_name, email FROM profiles WHERE username IS NULL LOOP
    -- Try to use the first part of the email as username
    UPDATE profiles
    SET username = generate_unique_slug(split_part(profile_record.email, '@', 1), 'profiles', 'id', profile_record.id)
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Generate slugs for existing events
DO $$
DECLARE
  event_record RECORD;
BEGIN
  FOR event_record IN SELECT id, title FROM community_events WHERE slug IS NULL LOOP
    UPDATE community_events
    SET slug = generate_unique_slug(event_record.title, 'community_events', 'id', event_record.id)
    WHERE id = event_record.id;
  END LOOP;
END $$;

-- Triggers to automatically generate slugs for new records

-- Community slug trigger
CREATE OR REPLACE FUNCTION generate_community_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_slug(NEW.name, 'communities', 'id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_community_slug
BEFORE INSERT ON communities
FOR EACH ROW
EXECUTE FUNCTION generate_community_slug();

-- Event slug trigger
CREATE OR REPLACE FUNCTION generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_slug(NEW.title, 'community_events', 'id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_event_slug
BEFORE INSERT ON community_events
FOR EACH ROW
EXECUTE FUNCTION generate_event_slug();

-- Create message_embeddings table for AI features
CREATE TABLE IF NOT EXISTS message_embeddings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI embeddings are 1536 dimensions
  created_at timestamptz DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_message_embeddings_embedding ON message_embeddings USING ivfflat (embedding vector_l2_ops);

-- Enable RLS on message_embeddings
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_embeddings
CREATE POLICY "Community members can view message embeddings"
  ON message_embeddings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN community_members cm ON cp.community_id = cm.community_id
      WHERE cp.id = message_embeddings.message_id AND cm.user_id = auth.uid()
    )
  );

-- Function to generate embeddings for new messages
CREATE OR REPLACE FUNCTION generate_message_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder. In production, you would call an external service
  -- or use Supabase Edge Functions to generate the embedding.
  -- For now, we'll just insert a NULL embedding that can be updated later.
  INSERT INTO message_embeddings (message_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate embeddings for new messages
CREATE TRIGGER generate_message_embedding_trigger
  AFTER INSERT ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_message_embedding();

-- Function to find similar messages
CREATE OR REPLACE FUNCTION find_similar_messages(
  query_text text,
  community_id uuid,
  limit_num integer DEFAULT 5
)
RETURNS TABLE (
  message_id uuid,
  content text,
  similarity float
) AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- This is a placeholder. In production, you would generate the embedding here
  -- or pass it as a parameter.
  -- For now, we'll just return some messages from the community.
  
  RETURN QUERY
  SELECT 
    cp.id,
    cp.content,
    0.0::float as similarity
  FROM 
    community_posts cp
  WHERE 
    cp.community_id = find_similar_messages.community_id
  ORDER BY 
    cp.created_at DESC
  LIMIT 
    limit_num;
END;
$$ LANGUAGE plpgsql;

-- Create AI suggestion history table
CREATE TABLE IF NOT EXISTS ai_suggestion_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  query text NOT NULL,
  suggestion text NOT NULL,
  was_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on ai_suggestion_history
ALTER TABLE ai_suggestion_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_suggestion_history
CREATE POLICY "Users can view their own suggestion history"
  ON ai_suggestion_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own suggestion history"
  ON ai_suggestion_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own suggestion history"
  ON ai_suggestion_history FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());