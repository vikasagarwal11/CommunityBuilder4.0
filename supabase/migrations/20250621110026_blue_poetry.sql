/*
  # Add foreign key relationship between post_comments and profiles

  1. Changes
    - Add foreign key constraint from post_comments.user_id to profiles.id
    - This enables Supabase to recognize the relationship for joins

  2. Security
    - No changes to existing RLS policies
    - Maintains data integrity with CASCADE delete
*/

-- Add foreign key relationship between post_comments and profiles
ALTER TABLE post_comments 
ADD CONSTRAINT fk_post_comments_user_profiles 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;