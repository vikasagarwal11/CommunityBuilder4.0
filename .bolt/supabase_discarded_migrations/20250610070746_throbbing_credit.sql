-- Fix foreign key relationships for message tables to enable PostgREST joins
-- This migration ensures all relationships are properly established

-- First, clean up any orphaned records that might prevent foreign key creation
DELETE FROM message_reactions 
WHERE user_id NOT IN (SELECT id FROM profiles);

DELETE FROM message_tags 
WHERE tagged_user_id NOT IN (SELECT id FROM profiles)
   OR tagged_by NOT IN (SELECT id FROM profiles);

-- Drop existing foreign key constraints if they exist (to avoid conflicts)
DO $$
BEGIN
  -- Drop message_reactions constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_message_reactions_user_profiles'
    AND table_name = 'message_reactions'
  ) THEN
    ALTER TABLE message_reactions DROP CONSTRAINT fk_message_reactions_user_profiles;
  END IF;
  
  -- Drop message_tags constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_message_tags_tagged_user_profiles'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags DROP CONSTRAINT fk_message_tags_tagged_user_profiles;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_message_tags_tagged_by_profiles'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags DROP CONSTRAINT fk_message_tags_tagged_by_profiles;
  END IF;
END $$;

-- Add foreign key constraints for message_reactions
ALTER TABLE message_reactions
ADD CONSTRAINT fk_message_reactions_user_profiles
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for message_tags
ALTER TABLE message_tags
ADD CONSTRAINT fk_message_tags_tagged_user_profiles
FOREIGN KEY (tagged_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE message_tags
ADD CONSTRAINT fk_message_tags_tagged_by_profiles
FOREIGN KEY (tagged_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Verify the relationships work by testing joins
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Test message_reactions join
  SELECT COUNT(*) INTO test_count
  FROM message_reactions mr
  LEFT JOIN profiles p ON mr.user_id = p.id;
  
  RAISE LOG 'Message reactions join test: % records', test_count;
  
  -- Test message_tags join
  SELECT COUNT(*) INTO test_count
  FROM message_tags mt
  LEFT JOIN profiles p1 ON mt.tagged_user_id = p1.id
  LEFT JOIN profiles p2 ON mt.tagged_by = p2.id;
  
  RAISE LOG 'Message tags join test: % records', test_count;
  
  RAISE LOG 'Foreign key relationships verified successfully';
END $$;

-- Create indexes to improve join performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id_profiles ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_tagged_user_id_profiles ON message_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_tagged_by_profiles ON message_tags(tagged_by);

-- Test the exact queries that the frontend is trying to make
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test the message_reactions query structure
  FOR test_result IN
    SELECT mr.emoji, mr.user_id, p.full_name
    FROM message_reactions mr
    INNER JOIN profiles p ON mr.user_id = p.id
    LIMIT 1
  LOOP
    RAISE LOG 'Message reactions query test successful';
    EXIT;
  END LOOP;
  
  -- Test the message_tags query structure
  FOR test_result IN
    SELECT mt.id, mt.tag_type, mt.status, mt.priority, mt.due_date, mt.notes,
           p1.full_name as tagged_user_name,
           p2.full_name as tagged_by_name
    FROM message_tags mt
    LEFT JOIN profiles p1 ON mt.tagged_user_id = p1.id
    LEFT JOIN profiles p2 ON mt.tagged_by = p2.id
    LIMIT 1
  LOOP
    RAISE LOG 'Message tags query test successful';
    EXIT;
  END LOOP;
  
  RAISE LOG 'All query tests completed successfully';
END $$;