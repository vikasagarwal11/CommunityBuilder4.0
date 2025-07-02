/*
  # Add unique constraint to community_members table

  1. Changes
     - Adds a unique constraint to ensure each user can only be a member of a community once
     - Prevents duplicate entries in the community_members table
*/

-- Add unique constraint to community_members table
ALTER TABLE public.community_members
ADD CONSTRAINT unique_member UNIQUE (community_id, user_id);