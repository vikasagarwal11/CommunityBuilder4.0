/*
  # Fix trigger function for user vector updates

  1. Changes
     - Update trigger_user_vector_update function to use the correct Supabase URL
     - Fix the HTTP post URL to point to the deployed Edge Function
*/

CREATE OR REPLACE FUNCTION trigger_user_vector_update() 
RETURNS TRIGGER AS $$ 
BEGIN 
  PERFORM http_post(
    'https://ljbporcqpceilywexaod.supabase.co/functions/v1/generate-user-interest-vector', 
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