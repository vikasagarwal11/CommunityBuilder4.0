/*
  # Add personalized recommendations function

  1. New Tables
    - `user_recommendations` table to store personalized recommendations for users
  
  2. Security
    - Enable RLS on the new table
    - Add policies for users to view their own recommendations
    - Add policies for community admins to view recommendations for their communities
*/

-- Create user_recommendations table
CREATE TABLE IF NOT EXISTS user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_community_id ON user_recommendations(community_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_recommendations_user_community ON user_recommendations(user_id, community_id);

-- Enable Row Level Security
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recommendations" 
  ON user_recommendations 
  FOR SELECT 
  TO authenticated 
  USING (uid() = user_id);

CREATE POLICY "Community admins can view recommendations for their communities" 
  ON user_recommendations 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_members.community_id = user_recommendations.community_id 
      AND community_members.user_id = uid() 
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_user_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
CREATE TRIGGER update_user_recommendations_timestamp
BEFORE UPDATE ON user_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_user_recommendations_updated_at();

-- Create function to trigger user vector update
CREATE OR REPLACE FUNCTION trigger_user_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Call edge function to update user interest vector
  PERFORM http_post(
    url := CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/generate-user-interest-vector'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key'))
    ),
    body := jsonb_build_object(
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'community_id', COALESCE(NEW.community_id, OLD.community_id)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user recommendations
CREATE TRIGGER user_recommendation_vector_trigger
AFTER INSERT OR UPDATE OF recommendations ON user_recommendations
FOR EACH ROW
EXECUTE FUNCTION trigger_user_vector_update();