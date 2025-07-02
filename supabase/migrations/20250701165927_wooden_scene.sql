/*
  # Fix event embeddings RLS

  1. Changes
     - Disable RLS on event_embeddings table
     - Drop existing policy
     - Re-enable RLS
     - Create new policy for public read access
*/

-- Disable RLS
ALTER TABLE event_embeddings DISABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "Public read access for event embeddings" ON event_embeddings;

-- Re-enable RLS
ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;

-- Create new policy
CREATE POLICY "Public read access for event embeddings" ON event_embeddings FOR SELECT USING (true);