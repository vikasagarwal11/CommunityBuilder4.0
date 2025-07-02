/*
  # Fix Event Embedding Function

  1. Changes
     - Removes misnamed generate_message_embedding function and trigger
     - Ensures only trigger_event_embedding is active
     - Cleans up any potential conflicts in the event embedding process

  2. Security
     - No changes to security policies
*/

-- Drop misnamed function and trigger
DROP TRIGGER IF EXISTS generate_message_embedding_trigger ON community_events;
DROP FUNCTION IF EXISTS generate_message_embedding;

-- Ensure correct function for event embedding generation exists
CREATE OR REPLACE FUNCTION trigger_event_embedding()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM http_post(
      'http://localhost:54321/functions/v1/generate-event-embedding',
      jsonb_build_object(
        'event_id', NEW.id,
        'title', NEW.title,
        'description', NEW.description,
        'community_id', NEW.community_id
      ),
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error generating event embedding: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger for event embeddings exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'event_embedding_trigger'
  ) THEN
    CREATE TRIGGER event_embedding_trigger
    AFTER INSERT ON community_events
    FOR EACH ROW EXECUTE FUNCTION trigger_event_embedding();
  END IF;
END $$;