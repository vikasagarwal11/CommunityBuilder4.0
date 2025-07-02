/*
  # Fix community_members foreign key constraint
  
  1. Clean up orphaned records in community_members that reference non-existent profiles
  2. Add foreign key constraint to link community_members to profiles
  
  This migration ensures data integrity by removing invalid references before
  establishing the proper foreign key relationship.
*/

-- First, clean up any orphaned records in community_members
-- that reference user_ids not present in profiles table
DELETE FROM community_members 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Now add the foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'community_members_user_id_profiles_fkey'
    AND table_name = 'community_members'
  ) THEN
    ALTER TABLE community_members 
    ADD CONSTRAINT community_members_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add an index to improve query performance for the foreign key
CREATE INDEX IF NOT EXISTS idx_community_members_user_id_profiles 
ON community_members(user_id);