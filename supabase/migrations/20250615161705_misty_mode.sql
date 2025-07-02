/*
  # AI Image Analysis Table
  
  1. New Tables
    - `ai_image_analysis` - Stores analysis results for images
      - `id` (uuid, primary key)
      - `image_url` (text) - URL of the analyzed image
      - `description` (text) - AI-generated description
      - `tags` (text[]) - Array of tags identified in the image
      - `safety_check` (jsonb) - Safety check results
      - `objects` (text[]) - Array of objects identified in the image
      - `text_content` (text) - Text extracted from the image
      - `landmarks` (text[]) - Array of landmarks identified in the image
      - `colors` (jsonb) - Dominant colors in the image
      - `user_id` (uuid, foreign key) - User who uploaded the image
      - `created_at` (timestamptz)
      - `community_id` (uuid, foreign key) - Community where the image was uploaded
  
  2. Security
    - Enable RLS on the table
    - Add policies for users and admins
*/

-- Create ai_image_analysis table
CREATE TABLE IF NOT EXISTS ai_image_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  description text,
  tags text[],
  safety_check jsonb,
  objects text[],
  text_content text,
  landmarks text[],
  colors jsonb,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_image_analysis_user_id ON ai_image_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_image_analysis_community_id ON ai_image_analysis(community_id);

-- Enable Row Level Security
ALTER TABLE ai_image_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can see their own image analysis
CREATE POLICY "Users can see their own image analysis" ON ai_image_analysis
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Community members can see image analysis for their community
CREATE POLICY "Community members can see image analysis for their community" ON ai_image_analysis
  FOR SELECT
  TO authenticated
  USING (
    community_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = ai_image_analysis.community_id
      AND community_members.user_id = auth.uid()
    )
  );

-- Users can insert their own image analysis
CREATE POLICY "Users can insert their own image analysis" ON ai_image_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own image analysis
CREATE POLICY "Users can update their own image analysis" ON ai_image_analysis
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own image analysis
CREATE POLICY "Users can delete their own image analysis" ON ai_image_analysis
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());