/*
  # User Interest Vector Generation

  1. New Tables
    - No new tables created (uses existing user_interest_vectors table)
  
  2. Functions
    - Creates a function to generate user interest vectors using OpenAI embeddings
  
  3. Edge Function Setup
    - Sets up the necessary infrastructure for the user interest vector generation edge function
*/

-- Create function to trigger user interest vector updates
CREATE OR REPLACE FUNCTION trigger_user_vector_update()
RETURNS trigger AS $$
BEGIN
  -- Call edge function to generate user interest vector
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
  -- Log error but continue with operation
  RAISE NOTICE 'Error updating user interest vector: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile updates if it doesn't exist
CREATE OR REPLACE FUNCTION create_profile_vector_trigger()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_vector_update_trigger'
  ) THEN
    EXECUTE 'CREATE TRIGGER user_vector_update_trigger
    AFTER INSERT OR UPDATE OF interests, custom_interests, fitness_goals, experience_level
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update()';
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_profile_vector_trigger();

-- Create trigger for event RSVP updates if it doesn't exist
CREATE OR REPLACE FUNCTION create_rsvp_vector_trigger()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_rsvp_vector_trigger'
  ) THEN
    EXECUTE 'CREATE TRIGGER user_rsvp_vector_trigger
    AFTER INSERT OR UPDATE OF status
    ON event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update()';
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_rsvp_vector_trigger();

-- Create trigger for user recommendation updates if it doesn't exist
CREATE OR REPLACE FUNCTION create_recommendation_vector_trigger()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_recommendation_vector_trigger'
  ) THEN
    EXECUTE 'CREATE TRIGGER user_recommendation_vector_trigger
    AFTER INSERT OR UPDATE OF recommendations
    ON user_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update()';
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_recommendation_vector_trigger();

-- Drop the helper functions after they've been used
DROP FUNCTION create_profile_vector_trigger();
DROP FUNCTION create_rsvp_vector_trigger();
DROP FUNCTION create_recommendation_vector_trigger();