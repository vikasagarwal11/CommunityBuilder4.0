/*
  # Create user AI insights table

  1. New Tables
    - `user_ai_insights` - Stores AI-generated insights about users
  
  2. Security
    - Enable RLS on `user_ai_insights` table
    - Add policies for users to view their own insights
    - Add policies for admins to view insights
*/

-- Create user_ai_insights table
CREATE TABLE IF NOT EXISTS user_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  insights jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ai_insights_user_id ON user_ai_insights(user_id);

-- Enable Row Level Security
ALTER TABLE user_ai_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own insights"
  ON user_ai_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all insights"
  ON user_ai_insights
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

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_ai_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_ai_insights_timestamp
BEFORE UPDATE ON user_ai_insights
FOR EACH ROW
EXECUTE FUNCTION update_user_ai_insights_updated_at();