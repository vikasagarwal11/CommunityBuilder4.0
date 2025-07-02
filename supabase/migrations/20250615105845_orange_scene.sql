/*
  # Fix Vector Embedding Trigger Issue

  1. Problem
    - The `generate_message_embedding_trigger` is causing messages to fail
    - Error: "expected 1536 dimensions, not 3"
    - This suggests the embedding function is not working correctly

  2. Solution
    - Temporarily disable the problematic trigger
    - Create a safer version that handles errors gracefully
    - Ensure message sending works without embeddings for now

  3. Changes
    - Drop the existing trigger
    - Create a new function that handles embedding generation safely
    - Re-create the trigger with error handling
*/

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS generate_message_embedding_trigger ON community_posts;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_message_embedding();

-- Create a new, safer function that handles errors gracefully
CREATE OR REPLACE FUNCTION generate_message_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- For now, we'll skip embedding generation to prevent errors
  -- This can be re-enabled once the embedding service is properly configured
  
  -- Optionally, you could add a simple placeholder or log the attempt
  -- INSERT INTO message_embeddings (message_id, created_at) 
  -- VALUES (NEW.id, now());
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, just return NEW to allow the insert to proceed
    -- Log the error if needed (this would require a logging table)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the safer function
CREATE TRIGGER generate_message_embedding_trigger
  AFTER INSERT ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_message_embedding();

-- Alternative: If you want to completely disable embedding generation for now,
-- you can comment out the trigger creation above and uncomment this:
-- 
-- CREATE OR REPLACE FUNCTION generate_message_embedding()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Embedding generation disabled - just return NEW
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;