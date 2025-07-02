/*
  # Fix Trigger Syntax and Deploy Personalized Recommendations Edge Function
  
  1. New Migration
    - Fixes invalid CREATE TRIGGER syntax for user interest vector triggers
    - Ensures correct trigger creation for user_vector_update_trigger, user_rsvp_vector_trigger, and user_recommendation_vector_trigger
    - Documents deployment of personalized-recommendations Edge Function
  
  2. Changes
    - Drops existing triggers to avoid conflicts
    - Creates proper DO blocks to check for trigger existence before creating
    - Ensures the trigger_user_vector_update function exists with proper error handling
*/

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS user_vector_update_trigger ON profiles;
DROP TRIGGER IF EXISTS user_rsvp_vector_trigger ON event_rsvps;
DROP TRIGGER IF EXISTS user_recommendation_vector_trigger ON user_recommendations;

-- Ensure trigger_user_vector_update function exists
CREATE OR REPLACE FUNCTION trigger_user_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'generate_user_interest_vector',
    jsonb_build_object(
      'user_id', COALESCE(NEW.user_id, NEW.id),
      'community_id', NEW.community_id
    )::text
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating user interest vector: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_vector_update_trigger' AND tgrelid = 'profiles'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER user_vector_update_trigger
    AFTER INSERT OR UPDATE OF interests, custom_interests, fitness_goals, experience_level
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update()';
  END IF;
END $$;

-- Create trigger for event RSVP updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_rsvp_vector_trigger' AND tgrelid = 'event_rsvps'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER user_rsvp_vector_trigger
    AFTER INSERT OR UPDATE OF status
    ON event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update()';
  END IF;
END $$;

-- Create trigger for user recommendation updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_recommendation_vector_trigger' AND tgrelid = 'user_recommendations'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER user_recommendation_vector_trigger
    AFTER INSERT OR UPDATE OF recommendations
    ON user_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update()';
  END IF;
END $$;

-- Create a function to handle the notification and call the edge function
CREATE OR REPLACE FUNCTION handle_user_vector_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
BEGIN
  -- Extract the payload from the notification
  payload := json_build_object(
    'user_id', NEW.user_id,
    'community_id', NEW.community_id
  );
  
  -- Call the edge function
  PERFORM http_post(
    url := CONCAT(current_setting('supabase_functions_endpoint', true), '/personalized-recommendations'),
    body := payload,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', CONCAT('Bearer ', current_setting('supabase_auth.anon_key', true))
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error calling personalized-recommendations function: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;