/*
  Fix Trigger Syntax and Document Personalized Recommendations Edge Function
  - Fixes invalid CREATE TRIGGER syntax for user interest vector triggers
  - Ensures correct trigger creation for user_vector_update_trigger, user_rsvp_vector_trigger, and user_recommendation_vector_trigger
  - Documents deployment of personalized-recommendations Edge Function for user_recommendations.suggested_tags
*/

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS user_vector_update_trigger ON profiles;
DROP TRIGGER IF EXISTS user_rsvp_vector_trigger ON event_rsvps;
DROP TRIGGER IF EXISTS user_recommendation_vector_trigger ON user_recommendations;

-- Ensure trigger_user_vector_update function exists
CREATE OR REPLACE FUNCTION trigger_user_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM http_post(
    'http://localhost:54321/functions/v1/generate-user-interest-vector',
    jsonb_build_object(
      'user_id', COALESCE(NEW.user_id, NEW.id),
      'community_id', NEW.community_id
    ),
    'application/json'
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
    CREATE TRIGGER user_vector_update_trigger
    AFTER INSERT OR UPDATE OF interests, custom_interests, fitness_goals, experience_level
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update();
  END IF;
END $$;

-- Create trigger for event RSVP updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_rsvp_vector_trigger' AND tgrelid = 'event_rsvps'::regclass
  ) THEN
    CREATE TRIGGER user_rsvp_vector_trigger
    AFTER INSERT OR UPDATE OF status
    ON event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update();
  END IF;
END $$;

-- Create trigger for user recommendation updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_recommendation_vector_trigger' AND tgrelid = 'user_recommendations'::regclass
  ) THEN
    CREATE TRIGGER user_recommendation_vector_trigger
    AFTER INSERT OR UPDATE OF recommendations
    ON user_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update();
  END IF;
END $$;

-- Document deployment of personalized-recommendations Edge Function
-- No SQL changes; function is stored in supabase/functions/personalized-recommendations/index.ts
-- Generates suggested_tags for user_recommendations based on user profile, activity, and community context