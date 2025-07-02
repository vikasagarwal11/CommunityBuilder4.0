/*
  # Fix post_comments to profiles relationship
  
  1. Changes
     - Adds a foreign key constraint from post_comments.user_id to profiles.id if it doesn't already exist
     - This fixes the error: "Could not find a relationship between 'post_comments' and 'profiles'"
*/

-- Check if the constraint already exists before adding it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_post_comments_user_profiles' 
    AND conrelid = 'post_comments'::regclass
  ) THEN
    -- Add foreign key constraint to establish the relationship
    ALTER TABLE post_comments 
    ADD CONSTRAINT fk_post_comments_user_profiles 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;