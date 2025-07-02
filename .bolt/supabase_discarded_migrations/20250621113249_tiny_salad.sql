/*
  # Fix post_comments to profiles relationship

  1. Changes
    - Add foreign key constraint from post_comments.user_id to profiles.id
    - This ensures proper relationship between post_comments and profiles tables
    - Fixes the error: "Could not find a relationship between 'post_comments' and 'profiles' in the schema cache"

  This migration resolves the error that occurs when trying to join post_comments with profiles.
*/

-- Add foreign key constraint to establish the relationship
ALTER TABLE post_comments 
ADD CONSTRAINT fk_post_comments_user_profiles 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;