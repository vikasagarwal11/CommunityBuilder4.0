/*
  # Add unique constraint to ai_community_profiles table
  
  1. Changes
    - Adds a unique constraint to the community_id column in the ai_community_profiles table
    - This ensures each community can only have one AI profile
*/

ALTER TABLE ai_community_profiles
ADD CONSTRAINT ai_community_profiles_community_id_unique UNIQUE (community_id);