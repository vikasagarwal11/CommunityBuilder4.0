/*
  # Add foreign key constraint to community_posts table

  1. Changes
    - Add foreign key constraint from community_posts.user_id to profiles.id
    - This enables proper joins between community_posts and profiles tables
*/

-- Add foreign key constraint to community_posts table
ALTER TABLE public.community_posts
ADD CONSTRAINT fk_community_posts_user_id
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;