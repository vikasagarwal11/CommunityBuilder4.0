/*
  # Fix duplicate community_id entries and add unique constraint
  
  1. Changes
    - Removes duplicate entries from ai_community_profiles table
    - Adds unique constraint on community_id column
*/

-- First, identify and handle duplicates
DO $$
DECLARE
  duplicate_community_id uuid;
  duplicate_count integer;
  latest_profile_id uuid;
BEGIN
  -- Find community_ids that have duplicates
  FOR duplicate_community_id IN 
    SELECT community_id 
    FROM ai_community_profiles 
    GROUP BY community_id 
    HAVING COUNT(*) > 1
  LOOP
    -- Get the count of duplicates
    SELECT COUNT(*) INTO duplicate_count 
    FROM ai_community_profiles 
    WHERE community_id = duplicate_community_id;
    
    RAISE NOTICE 'Found % duplicates for community_id %', duplicate_count, duplicate_community_id;
    
    -- Keep only the most recent profile for each community_id
    SELECT id INTO latest_profile_id
    FROM ai_community_profiles
    WHERE community_id = duplicate_community_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Delete all but the most recent profile
    DELETE FROM ai_community_profiles
    WHERE community_id = duplicate_community_id
    AND id != latest_profile_id;
    
    RAISE NOTICE 'Kept profile % for community_id %', latest_profile_id, duplicate_community_id;
  END LOOP;
END $$;

-- Now add the unique constraint
ALTER TABLE ai_community_profiles
ADD CONSTRAINT ai_community_profiles_community_id_unique UNIQUE (community_id);