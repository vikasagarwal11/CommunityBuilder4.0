/*
  # Fix duplicate community_id values and add unique constraint
  
  1. Changes
     - Identifies and removes duplicate community_id entries in ai_community_profiles
     - Adds a unique constraint on community_id column
  
  2. Security
     - No security changes
*/

-- First, handle duplicate community_id values
DO $$
DECLARE
    duplicate_record RECORD;
    duplicate_community_ids UUID[];
BEGIN
    -- Find all community_ids that have duplicates
    SELECT ARRAY_AGG(community_id) INTO duplicate_community_ids
    FROM (
        SELECT community_id
        FROM ai_community_profiles
        GROUP BY community_id
        HAVING COUNT(*) > 1
    ) AS duplicates;
    
    -- For each duplicate community_id, keep only the most recent record
    IF duplicate_community_ids IS NOT NULL THEN
        FOREACH duplicate_community_id IN ARRAY duplicate_community_ids
        LOOP
            -- Delete all but the most recent record for each community_id
            DELETE FROM ai_community_profiles
            WHERE id IN (
                SELECT id
                FROM ai_community_profiles
                WHERE community_id = duplicate_community_id
                ORDER BY created_at DESC
                OFFSET 1
            );
        END LOOP;
    END IF;
END $$;

-- Now add the unique constraint
ALTER TABLE ai_community_profiles
ADD CONSTRAINT ai_community_profiles_community_id_unique UNIQUE (community_id);