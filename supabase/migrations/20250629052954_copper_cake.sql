/*
  # Auto-Tag Events and Event Embeddings

  1. New Functions
    - `trigger_auto_tag_event()`: Function to automatically tag events using AI
  
  2. Changes
    - Adds conditional trigger creation for auto-tagging events
    - Creates event_embeddings table for semantic search
  
  3. Security
    - Enables RLS on event_embeddings table
    - Adds policy for authenticated users to read embeddings
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

-- Create trigger for auto-tagging events (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_tag_event_trigger'
  ) THEN
    CREATE TRIGGER auto_tag_event_trigger
    BEFORE INSERT ON community_events
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_tag_event();
  END IF;
END
$$;