/*
  # AI Features Schema

  1. New Tables
    - `ai_community_profiles` - AI-generated profiles for communities
    - `ai_suggestion_history` - History of AI suggestions and their usage
    - `ai_content_moderation` - Content moderation results
    - `ai_interactions` - User interactions with AI features
    - `ai_analytics` - AI-generated analytics for communities
    - `message_embeddings` - Vector embeddings for semantic search

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Community Profiles
CREATE TABLE IF NOT EXISTS ai_community_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  tone TEXT NOT NULL CHECK (tone IN ('casual', 'supportive', 'professional', 'motivational')),
  target_audience TEXT[] DEFAULT '{}',
  common_topics TEXT[] DEFAULT '{}',
  event_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_community_profiles_community_id ON ai_community_profiles(community_id);

-- AI Suggestion History
CREATE TABLE IF NOT EXISTS ai_suggestion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  was_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_history_user_id ON ai_suggestion_history(user_id, community_id);

-- AI Content Moderation
CREATE TABLE IF NOT EXISTS ai_content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_safe BOOLEAN NOT NULL,
  issues JSONB,
  score FLOAT NOT NULL,
  action_taken TEXT CHECK (action_taken IN ('approved', 'rejected', 'modified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_content_moderation_user_id ON ai_content_moderation(user_id);

-- AI Interactions
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('analysis', 'suggestion', 'insight', 'moderation')),
  content TEXT NOT NULL,
  result JSONB,
  feedback TEXT CHECK (feedback IN ('positive', 'negative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);

-- AI Analytics
CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id),
  timeframe TEXT NOT NULL CHECK (timeframe IN ('day', 'week', 'month')),
  analysis_type TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_community_id ON ai_analytics(community_id);

-- Message Embeddings for semantic search
CREATE TABLE IF NOT EXISTS message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_embeddings_embedding ON message_embeddings USING ivfflat (embedding);

-- Enable Row Level Security
ALTER TABLE ai_community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Community members can view AI profiles" ON ai_community_profiles;
DROP POLICY IF EXISTS "Community admins can insert AI profiles" ON ai_community_profiles;
DROP POLICY IF EXISTS "Community admins can update AI profiles" ON ai_community_profiles;
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON ai_suggestion_history;
DROP POLICY IF EXISTS "Users can update their own suggestions" ON ai_suggestion_history;
DROP POLICY IF EXISTS "Users can view their own suggestions" ON ai_suggestion_history;
DROP POLICY IF EXISTS "Users can insert their own moderation results" ON ai_content_moderation;
DROP POLICY IF EXISTS "Users can view their own moderation results" ON ai_content_moderation;
DROP POLICY IF EXISTS "Users can insert their own interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Users can view their own interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Community admins can insert analytics" ON ai_analytics;
DROP POLICY IF EXISTS "Community members can view analytics" ON ai_analytics;
DROP POLICY IF EXISTS "Community members can view message embeddings" ON message_embeddings;

-- AI Community Profiles
CREATE POLICY "Community members can view AI profiles"
  ON ai_community_profiles
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = ai_community_profiles.community_id
    AND community_members.user_id = auth.uid()
  ));

CREATE POLICY "Community admins can insert AI profiles"
  ON ai_community_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = ai_community_profiles.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'co-admin')
  ));

CREATE POLICY "Community admins can update AI profiles"
  ON ai_community_profiles
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = ai_community_profiles.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'co-admin')
  ));

-- AI Suggestion History
CREATE POLICY "Users can insert their own suggestions"
  ON ai_suggestion_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own suggestions"
  ON ai_suggestion_history
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own suggestions"
  ON ai_suggestion_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- AI Content Moderation
CREATE POLICY "Users can insert their own moderation results"
  ON ai_content_moderation
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own moderation results"
  ON ai_content_moderation
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- AI Interactions
CREATE POLICY "Users can insert their own interactions"
  ON ai_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own interactions"
  ON ai_interactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- AI Analytics
CREATE POLICY "Community admins can insert analytics"
  ON ai_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = ai_analytics.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'co-admin')
  ));

CREATE POLICY "Community members can view analytics"
  ON ai_analytics
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = ai_analytics.community_id
    AND community_members.user_id = auth.uid()
  ));

-- Message Embeddings
CREATE POLICY "Community members can view message embeddings"
  ON message_embeddings
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_posts cp
    JOIN community_members cm ON cp.community_id = cm.community_id
    WHERE cp.id = message_embeddings.message_id
    AND cm.user_id = auth.uid()
  ));

-- Function to generate message embeddings
CREATE OR REPLACE FUNCTION generate_message_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder. In a real implementation, you would call an AI service
  -- to generate the embedding and then insert it.
  -- For now, we'll just insert a dummy embedding
  INSERT INTO message_embeddings (message_id, embedding)
  VALUES (NEW.id, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS generate_message_embedding_trigger ON community_posts;

-- Trigger to generate embeddings for new messages
CREATE TRIGGER generate_message_embedding_trigger
AFTER INSERT ON community_posts
FOR EACH ROW
EXECUTE FUNCTION generate_message_embedding();