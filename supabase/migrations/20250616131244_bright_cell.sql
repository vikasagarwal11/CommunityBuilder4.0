/*
  # AI Profile System Improvements

  1. New Tables
    - `ai_generation_logs` - Tracks all AI generation attempts with detailed error information
  
  2. Changes
    - Add trigger to automatically create placeholder AI profiles when communities are created
    - Add function to generate default AI profiles when AI generation fails
  
  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for access control
*/

-- Create AI generation logs table for better error tracking and auditing
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  input_data JSONB,
  output_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add indices for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_community_id ON ai_generation_logs(community_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_status ON ai_generation_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON ai_generation_logs(created_at);

-- Enable RLS on the new table
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for the new table
CREATE POLICY "Community admins can view logs for their communities"
  ON ai_generation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = ai_generation_logs.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Function to generate a default AI profile for a community
CREATE OR REPLACE FUNCTION generate_default_ai_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a placeholder record that will be updated by the application
  INSERT INTO ai_community_profiles (
    community_id,
    purpose,
    tone,
    target_audience,
    common_topics,
    event_types,
    created_at
  ) VALUES (
    NEW.id,
    'A community for people interested in ' || NEW.name,
    'supportive',
    ARRAY['Community members', 'Enthusiasts'],
    COALESCE(NEW.tags, ARRAY[]::text[]),
    ARRAY['Meetups', 'Discussions', 'Workshops'],
    NOW()
  );
  
  -- Log the default profile creation
  INSERT INTO ai_generation_logs (
    community_id,
    operation_type,
    status,
    input_data,
    created_at,
    created_by
  ) VALUES (
    NEW.id,
    'default_profile_creation',
    'success',
    jsonb_build_object(
      'name', NEW.name,
      'description', NEW.description,
      'tags', NEW.tags
    ),
    NOW(),
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function after community creation
DO $$
BEGIN
  -- Check if the trigger already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'generate_default_ai_profile_trigger'
  ) THEN
    CREATE TRIGGER generate_default_ai_profile_trigger
    AFTER INSERT ON communities
    FOR EACH ROW
    EXECUTE FUNCTION generate_default_ai_profile();
  END IF;
END $$;