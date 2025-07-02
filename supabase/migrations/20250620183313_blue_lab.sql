/*
  # Create Event Polls Table
  
  1. New Tables
    - `event_polls` - Stores polls for event scheduling with options and voting
      - `id` (uuid, primary key)
      - `community_id` (uuid, foreign key to communities)
      - `title` (text, not null)
      - `description` (text)
      - `options` (jsonb, not null) - Array of date/time options with votes
      - `created_by` (uuid, foreign key to users)
      - `expires_at` (timestamp, not null)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `event_polls` table
    - Add policies for community members to view polls
    - Add policies for admins to create and manage polls
*/

-- Create event polls table
CREATE TABLE IF NOT EXISTS event_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL, -- Array of {date, startTime, endTime, votes, voters}
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_polls_community_id ON event_polls(community_id);
CREATE INDEX IF NOT EXISTS idx_event_polls_created_by ON event_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_event_polls_expires_at ON event_polls(expires_at);

-- Enable Row Level Security
ALTER TABLE event_polls ENABLE ROW LEVEL SECURITY;

-- Policies for event polls
-- Community members can view polls
CREATE POLICY "Community members can view polls" 
  ON event_polls
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = event_polls.community_id
      AND community_members.user_id = auth.uid()
    )
  );

-- Community admins can create polls
CREATE POLICY "Community admins can create polls" 
  ON event_polls
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = event_polls.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Community admins can update polls
CREATE POLICY "Community admins can update polls" 
  ON event_polls
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = event_polls.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Community admins can delete polls
CREATE POLICY "Community admins can delete polls" 
  ON event_polls
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = event_polls.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Community members can update poll options (for voting)
CREATE POLICY "Community members can update poll options" 
  ON event_polls
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = event_polls.community_id
      AND community_members.user_id = auth.uid()
    )
  );