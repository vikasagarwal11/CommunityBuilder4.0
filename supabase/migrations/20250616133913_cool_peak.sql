/*
  # Create AI cross-community insights table

  1. New Tables
    - `ai_cross_community_insights` - Stores insights from cross-community analysis
  
  2. Security
    - Enable RLS on `ai_cross_community_insights` table
    - Add policies for platform admins to view insights
    - Add policies for community admins to view insights
*/

-- Create ai_cross_community_insights table
CREATE TABLE IF NOT EXISTS ai_cross_community_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insights jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ai_cross_community_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Platform admins can view all cross-community insights"
  ON ai_cross_community_insights
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Platform Owner', 'Platform Admin')
    )
  );

CREATE POLICY "Community admins can view cross-community insights"
  ON ai_cross_community_insights
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_cross_community_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_cross_community_insights_timestamp
BEFORE UPDATE ON ai_cross_community_insights
FOR EACH ROW
EXECUTE FUNCTION update_ai_cross_community_insights_updated_at();