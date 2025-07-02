/*
  # Event Embedding Generation Function

  1. New Functions
    - Creates a trigger function to generate embeddings for events
    - Handles edge function call to generate embeddings when events are created
  
  2. Security
    - Ensures proper error handling to prevent event creation failures
    - Logs generation attempts for auditing
*/

-- Create function to generate event embeddings
CREATE OR REPLACE FUNCTION generate_message_embedding()
RETURNS trigger AS $$
DECLARE
  response jsonb;
BEGIN
  BEGIN
    response := http_post(
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
    -- Log error but continue with event creation
    RAISE NOTICE 'Error generating event embedding: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for generating event embeddings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'generate_message_embedding_trigger'
  ) THEN
    CREATE TRIGGER generate_message_embedding_trigger
    AFTER INSERT ON community_events
    FOR EACH ROW EXECUTE FUNCTION generate_message_embedding();
  END IF;
END $$;