/*
  # User Interest Vectors and Event Embeddings

  1. New Tables
    - `user_interest_vectors` - Stores vector embeddings of user interests for semantic search
  
  2. Security
    - Enable RLS on `user_interest_vectors` table
    - Add policy for users to view their own interest vectors
  
  3. Changes
    - Add trigger functions for updating user interest vectors
    - Add trigger functions for generating event embeddings
    - Add triggers on profiles, event_rsvps, and user_recommendations tables
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

-- Create function to trigger event embedding generation
CREATE OR REPLACE FUNCTION trigger_event_embedding()
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

-- Create trigger for profile updates (if not exists)
CREATE TRIGGER IF NOT EXISTS user_vector_update_trigger
AFTER INSERT OR UPDATE OF interests, custom_interests, fitness_goals, experience_level
ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_user_vector_update();

-- Create trigger for event RSVP updates (if not exists)
CREATE TRIGGER IF NOT EXISTS user_rsvp_vector_trigger
AFTER INSERT OR UPDATE OF status
ON event_rsvps
FOR EACH ROW
EXECUTE FUNCTION trigger_user_vector_update();

-- Create trigger for user recommendation updates (if not exists)
CREATE TRIGGER IF NOT EXISTS user_recommendation_vector_trigger
AFTER INSERT OR UPDATE OF recommendations
ON user_recommendations
FOR EACH ROW
EXECUTE FUNCTION trigger_user_vector_update();

-- Create trigger for event embedding generation (if not exists)
CREATE TRIGGER IF NOT EXISTS event_embedding_trigger
AFTER INSERT ON community_events
FOR EACH ROW
EXECUTE FUNCTION trigger_event_embedding();