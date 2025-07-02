/*
  # Content Moderation Flags Table
  
  1. New Tables
    - `content_moderation_flags` - Stores flags for potentially problematic content
      - `id` (uuid, primary key)
      - `community_id` (uuid, foreign key)
      - `content_type` (text) - Type of content being flagged (message, image, etc.)
      - `content_id` (text) - ID of the flagged content
      - `reporter_id` (uuid, foreign key) - User who reported the content
      - `reason` (text) - Reason for flagging
      - `status` (text) - Status of the flag (pending, reviewed, dismissed, etc.)
      - `notes` (text) - Admin notes about the flag
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `reviewed_by` (uuid, foreign key) - Admin who reviewed the flag
      - `reviewed_at` (timestamptz) - When the flag was reviewed
  
  2. Security
    - Enable RLS on the table
    - Add policies for admins and users
*/

-- Create content_moderation_flags table
CREATE TABLE IF NOT EXISTS content_moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id text NOT NULL,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_moderation_flags_community_id ON content_moderation_flags(community_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_flags_content_id ON content_moderation_flags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_flags_status ON content_moderation_flags(status);

-- Enable Row Level Security
ALTER TABLE content_moderation_flags ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Admins can see all flags for their communities
CREATE POLICY "Admins can see all flags for their communities" ON content_moderation_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = content_moderation_flags.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Users can create flags
CREATE POLICY "Users can create flags" ON content_moderation_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Admins can update flags for their communities
CREATE POLICY "Admins can update flags for their communities" ON content_moderation_flags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = content_moderation_flags.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Admins can delete flags for their communities
CREATE POLICY "Admins can delete flags for their communities" ON content_moderation_flags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = content_moderation_flags.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );