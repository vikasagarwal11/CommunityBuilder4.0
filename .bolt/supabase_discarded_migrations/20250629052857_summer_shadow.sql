/*
  # Auto-Tag Event Trigger and Event Embeddings Table
  
  1. New Functions
    - `trigger_auto_tag_event()` - Calls the auto-tag-events Edge Function to generate tags for events
  
  2. New Triggers
    - `auto_tag_event_trigger` - Runs before insert on community_events to add AI-generated tags
  
  3. New Tables
    - `event_embeddings` - Stores vector embeddings for events to enable semantic search
  
  4. Security
    - Enable RLS on event_embeddings table
    - Add policy for authenticated users to read event embeddings
*/

-- Create function to auto-tag events
CREATE OR REPLACE FUNCTION trigger_auto_tag_event()
RETURNS trigger AS $$
DECLARE
  response jsonb;
BEGIN
  BEGIN
    response := http_post(
      'http://localhost:54321/functions/v1/auto-tag-events',
      jsonb_build_object(
        'title', NEW.title,
        'description', NEW.description,
        'community_id', NEW.community_id
      ),
      'application/json'
    );
    
    -- Merge AI-generated tags with existing tags
    IF NEW.tags IS NULL THEN
      NEW.tags := (response->>'tags')::text[];
    ELSE
      NEW.tags := array_cat(NEW.tags, (response->>'tags')::text[]);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue with event creation
    RAISE NOTICE 'Error auto-tagging event: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-tagging events
CREATE TRIGGER auto_tag_event_trigger
BEFORE INSERT ON community_events
FOR EACH ROW EXECUTE FUNCTION trigger_auto_tag_event();

-- Create event embeddings table for semantic search
CREATE TABLE IF NOT EXISTS event_embeddings (
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (event_id)
);

-- Enable row level security
ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read event embeddings
CREATE POLICY "Public read access for event embeddings"
ON event_embeddings
FOR SELECT
TO authenticated
USING (true);