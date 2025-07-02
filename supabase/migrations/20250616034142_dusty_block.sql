/*
  # Delete Orphaned Events

  1. Problem
    - Events exist in the database that reference deleted communities
    - These events should have been deleted when their parent communities were deleted
    
  2. Solution
    - Delete any events that reference non-existent communities
    - Add proper foreign key constraint with CASCADE to prevent this in the future
*/

-- Delete any events that reference communities that no longer exist
DELETE FROM community_events
WHERE community_id NOT IN (SELECT id FROM communities);

-- Ensure the foreign key constraint has ON DELETE CASCADE
DO $$
BEGIN
  -- First check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'community_events_community_id_fkey'
    AND table_name = 'community_events'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE community_events DROP CONSTRAINT community_events_community_id_fkey;
  END IF;
  
  -- Add the constraint with CASCADE
  ALTER TABLE community_events
  ADD CONSTRAINT community_events_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
END $$;

-- Verify that all events now have valid community references
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM community_events
  WHERE community_id NOT IN (SELECT id FROM communities);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'There are still % orphaned events', orphaned_count;
  ELSE
    RAISE NOTICE 'All orphaned events have been successfully deleted';
  END IF;
END $$;