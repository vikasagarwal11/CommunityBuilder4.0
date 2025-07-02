/*
  # Add foreign key relationship between community_members and profiles

  1. Database Changes
    - Add foreign key constraint linking community_members.user_id to profiles.id
    - This enables proper joins between community_members and profiles tables
  
  2. Security
    - No RLS changes needed as this is just adding a foreign key constraint
*/

-- Add foreign key constraint to link community_members to profiles
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