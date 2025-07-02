/*
  # User Interest Vector System

  1. New Tables
    - `user_interest_vectors`
      - `user_id` (uuid, primary key)
      - `interest_vector` (vector(1536))
      - `updated_at` (timestamp)
  
  2. New Functions
    - `trigger_user_vector_update()` - Calls edge function to generate user interest vectors
  
  3. New Triggers
    - Multiple triggers to update user interest vectors when relevant data changes
  
  4. Security
    - RLS policies for user interest vectors
*/

-- Create user interest vectors table for semantic search and recommendations
CREATE TABLE IF NOT EXISTS user_interest_vectors (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_vector vector(1536),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Enable row level security
ALTER TABLE user_interest_vectors ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own interest vectors
CREATE POLICY "Users can view their own interest vectors"
ON user_interest_vectors
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

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

-- Create trigger for profile updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_vector_update_trigger'
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
    WHERE tgname = 'user_rsvp_vector_trigger'
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
    WHERE tgname = 'user_recommendation_vector_trigger'
  ) THEN
    CREATE TRIGGER user_recommendation_vector_trigger
    AFTER INSERT OR UPDATE OF recommendations
    ON user_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_vector_update();
  END IF;
END $$;

-- Create function to trigger event embedding generation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'trigger_event_embedding'
  ) THEN
    CREATE FUNCTION trigger_event_embedding()
    RETURNS trigger AS $$
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
      RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with event creation
      RAISE NOTICE 'Error generating event embedding: %', SQLERRM;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create trigger for event embedding generation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'event_embedding_trigger'
  ) THEN
    CREATE TRIGGER event_embedding_trigger
    AFTER INSERT ON community_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_event_embedding();
  END IF;
END $$;