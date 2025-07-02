/*
  # Create auto_tag_event_trigger

  1. New Triggers
    - `auto_tag_event_trigger` - Calls the auto-tag-event function after insert or update on community_events
  
  2. Changes
    - Drops the existing trigger if it exists
    - Creates a new trigger that sends event data to the auto-tag-event function
*/

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS auto_tag_event_trigger ON community_events;

-- Create the new trigger
CREATE TRIGGER auto_tag_event_trigger 
AFTER INSERT OR UPDATE ON community_events 
FOR EACH ROW 
EXECUTE FUNCTION custom_http_post(
  'https://ljbporcqpceilywexaod.supabase.co/functions/v1/auto-tag-event', 
  jsonb_build_object(
    'event_id', NEW.id, 
    'community_id', NEW.community_id, 
    'title', NEW.title, 
    'description', NEW.description
  ), 
  'application/json'
);