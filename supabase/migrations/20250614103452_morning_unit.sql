/*
  # Add AI features tables

  1. New Tables
    - `ai_interactions` - Stores AI interactions for improvement
    - `ai_suggestion_history` - Stores suggestion history
    - `ai_content_moderation` - Stores content moderation results
    - `ai_analytics` - Stores AI-generated analytics

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- AI Interactions table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('analysis', 'suggestion', 'insight', 'moderation')),
  content TEXT NOT NULL,
  result JSONB,
  feedback TEXT CHECK (feedback IN ('positive', 'negative')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AI Suggestion History table
CREATE TABLE IF NOT EXISTS ai_suggestion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  community_id UUID REFERENCES communities NOT NULL,
  query TEXT,
  suggestion TEXT NOT NULL,
  was_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AI Content Moderation table
CREATE TABLE IF NOT EXISTS ai_content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT NOT NULL,
  is_safe BOOLEAN NOT NULL,
  issues JSONB,
  score FLOAT NOT NULL,
  action_taken TEXT CHECK (action_taken IN ('approved', 'rejected', 'modified')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AI Analytics table
CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('day', 'week', 'month')),
  analysis_type TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users
);

-- Enable Row Level Security
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_interactions
CREATE POLICY "Users can view their own interactions"
  ON ai_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
  ON ai_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_suggestion_history
CREATE POLICY "Users can view their own suggestions"
  ON ai_suggestion_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestions"
  ON ai_suggestion_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON ai_suggestion_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_content_moderation
CREATE POLICY "Users can view their own moderation results"
  ON ai_content_moderation
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own moderation results"
  ON ai_content_moderation
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_analytics
CREATE POLICY "Community members can view analytics"
  ON ai_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = ai_analytics.community_id
      AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Community admins can insert analytics"
  ON ai_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = ai_analytics.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_history_user_id ON ai_suggestion_history(user_id, community_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_moderation_user_id ON ai_content_moderation(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_community_id ON ai_analytics(community_id);