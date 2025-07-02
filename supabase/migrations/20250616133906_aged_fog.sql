/*
  # Create user recommendations table

  1. New Tables
    - `user_recommendations` - Stores personalized recommendations for users in communities
  
  2. Security
    - Enable RLS on `user_recommendations` table
    - Add policies for users to view their own recommendations
    - Add policies for community admins to view recommendations
*/

-- Create user_recommendations table
CREATE TABLE IF NOT EXISTS user_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  recommendations jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_community_id ON user_recommendations(community_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_recommendations_user_community ON user_recommendations(user_id, community_id);

-- Enable Row Level Security
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own recommendations"
  ON user_recommendations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Community admins can view recommendations for their communities"
  ON user_recommendations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = user_recommendations.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_recommendations_timestamp
BEFORE UPDATE ON user_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_user_recommendations_updated_at();