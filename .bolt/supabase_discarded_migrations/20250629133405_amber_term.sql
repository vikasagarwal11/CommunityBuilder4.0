/*
  Fix Event Embedding Function
  - Drops misnamed generate_message_embedding function and its dependent trigger
  - Ensures correct trigger_event_embedding function and trigger for community_events
*/

-- Drop misnamed trigger and function with CASCADE to remove dependencies
DROP TRIGGER IF EXISTS generate_message_embedding_trigger ON community_events;
DROP TRIGGER IF EXISTS generate_message_embedding_trigger ON community_posts;
DROP FUNCTION IF EXISTS generate_message_embedding CASCADE;

-- Ensure correct function for event embedding generation
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

-- Ensure trigger for event embeddings on community_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'event_embedding_trigger' AND tgrelid = 'community_events'::regclass
  ) THEN
    CREATE TRIGGER event_embedding_trigger
    AFTER INSERT ON community_events
    FOR EACH ROW EXECUTE FUNCTION trigger_event_embedding();
  END IF;
END $$;