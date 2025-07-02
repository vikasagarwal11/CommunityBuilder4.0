/*
  # Event Auto-Tagging and Embeddings

  1. New Functions
    - `trigger_auto_tag_event()` - Function to call the auto-tag edge function
  
  2. New Triggers
    - `auto_tag_event_trigger` - Trigger to automatically tag events on insert
  
  3. New Tables
    - `event_embeddings` - Stores vector embeddings for events for semantic search
  
  4. Security
    - Enable RLS on `event_embeddings` table
    - Add policy for authenticated users to read event embeddings
*/

-- Create function to auto-tag events
CREATE OR REPLACE FUNCTION trigger_auto_tag_event()
RETURNS trigger AS $$
DECLARE
  response jsonb;
BEGIN
  -- Call the edge function to generate tags
  response := http_post(
    'http://localhost:54321/functions/v1/auto-tag-events',
    jsonb_build_object(
      'title', NEW.title,
      'description', NEW.description,
      'community_id', NEW.community_id
    ),
    'application/json'
  );
  
  -- Merge the generated tags with any existing tags
  IF NEW.tags IS NULL THEN
    NEW.tags := (response->>'tags')::text[];
  ELSE
    NEW.tags := array_cat(NEW.tags, (response->>'tags')::text[]);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but continue with the insert
    RAISE NOTICE 'Error in auto-tagging: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-tag events on insert
CREATE TRIGGER auto_tag_event_trigger
BEFORE INSERT ON community_events
FOR EACH ROW EXECUTE FUNCTION trigger_auto_tag_event();

-- Create table for event embeddings
CREATE TABLE IF NOT EXISTS event_embeddings (
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (event_id)
);

-- Enable row level security
ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policy for reading event embeddings
CREATE POLICY "Public read access for event embeddings"
ON event_embeddings
FOR SELECT
TO authenticated
USING (true);