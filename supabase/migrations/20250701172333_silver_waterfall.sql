-- Create a wrapper function to handle JSON body construction for the trigger
CREATE OR REPLACE FUNCTION auto_tag_event_wrapper()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM custom_http_post(
    'https://ljbporcqpceilywexaod.supabase.co/functions/v1/auto-tag-event',
    jsonb_build_object(
      'event_id', NEW.id,
      'community_id', NEW.community_id,
      'title', NEW.title,
      'description', NEW.description
    ),
    'application/json'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in auto_tag_event_wrapper: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS auto_tag_event_trigger ON community_events;

-- Create the trigger to call the wrapper function
CREATE TRIGGER auto_tag_event_trigger 
AFTER INSERT OR UPDATE ON community_events 
FOR EACH ROW 
EXECUTE FUNCTION auto_tag_event_wrapper();

-- Ensure event_embeddings RLS policy is correct
ALTER TABLE event_embeddings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for event embeddings" ON event_embeddings;
ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for event embeddings" ON event_embeddings 
FOR SELECT USING (true);