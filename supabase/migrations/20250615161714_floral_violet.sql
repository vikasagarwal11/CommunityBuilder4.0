/*
  # Voice Transcriptions Table
  
  1. New Tables
    - `voice_transcriptions` - Stores voice transcription data
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - User who created the transcription
      - `transcription` (text) - The transcribed text
      - `audio_url` (text) - URL to the audio file (optional)
      - `duration_seconds` (integer) - Duration of the audio in seconds
      - `language` (text) - Language of the transcription
      - `confidence` (float) - Confidence score of the transcription
      - `created_at` (timestamptz)
      - `community_id` (uuid, foreign key) - Community where the transcription was created
      - `message_id` (uuid, foreign key) - Message associated with this transcription
  
  2. Security
    - Enable RLS on the table
    - Add policies for users and admins
*/

-- Create voice_transcriptions table
CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcription text NOT NULL,
  audio_url text,
  duration_seconds integer,
  language text DEFAULT 'en',
  confidence float,
  created_at timestamptz NOT NULL DEFAULT now(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  message_id uuid REFERENCES community_posts(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_user_id ON voice_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_community_id ON voice_transcriptions(community_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_message_id ON voice_transcriptions(message_id);

-- Enable Row Level Security
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can see their own transcriptions
CREATE POLICY "Users can see their own transcriptions" ON voice_transcriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Community admins can see all transcriptions for their community
CREATE POLICY "Community admins can see all transcriptions for their community" ON voice_transcriptions
  FOR SELECT
  TO authenticated
  USING (
    community_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = voice_transcriptions.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Users can insert their own transcriptions
CREATE POLICY "Users can insert their own transcriptions" ON voice_transcriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own transcriptions
CREATE POLICY "Users can update their own transcriptions" ON voice_transcriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own transcriptions
CREATE POLICY "Users can delete their own transcriptions" ON voice_transcriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());