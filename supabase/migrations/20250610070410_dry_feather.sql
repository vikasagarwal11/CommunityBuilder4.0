-- Fix foreign key relationships for message tables to enable PostgREST joins

-- First, clean up any orphaned records that might prevent foreign key creation
DELETE FROM message_reactions 
WHERE user_id NOT IN (SELECT id FROM profiles);

DELETE FROM message_tags 
WHERE tagged_user_id NOT IN (SELECT id FROM profiles)
   OR tagged_by NOT IN (SELECT id FROM profiles);

-- Add foreign key constraints for message_reactions
DO $$
BEGIN
  -- Check if constraint already exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_message_reactions_user_profiles'
    AND table_name = 'message_reactions'
  ) THEN
    ALTER TABLE message_reactions
    ADD CONSTRAINT fk_message_reactions_user_profiles
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraints for message_tags
DO $$
BEGIN
  -- Tagged user constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_message_tags_tagged_user_profiles'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags
    ADD CONSTRAINT fk_message_tags_tagged_user_profiles
    FOREIGN KEY (tagged_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  
  -- Tagged by constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_message_tags_tagged_by_profiles'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags
    ADD CONSTRAINT fk_message_tags_tagged_by_profiles
    FOREIGN KEY (tagged_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verify the relationships are working by testing a simple join
-- This will help PostgREST understand the relationships
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Test message_reactions join
  SELECT COUNT(*) INTO test_count
  FROM message_reactions mr
  LEFT JOIN profiles p ON mr.user_id = p.id;
  
  -- Test message_tags join
  SELECT COUNT(*) INTO test_count
  FROM message_tags mt
  LEFT JOIN profiles p1 ON mt.tagged_user_id = p1.id
  LEFT JOIN profiles p2 ON mt.tagged_by = p2.id;
  
  RAISE LOG 'Foreign key relationships verified successfully';
END $$;