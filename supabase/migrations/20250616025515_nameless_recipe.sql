/*
  # Community Logical Deletion System

  1. New Functions
    - `soft_delete_community`: Marks a community as deleted without physically removing it
    - `deactivate_community`: Temporarily deactivates a community
    - `reactivate_community`: Reactivates a previously deactivated community
    
  2. Changes
    - Adds cascading deactivation/deletion to events when a community is deactivated/deleted
    - Ensures only community admins can perform these operations
    - Adds timestamp tracking for deletion and deactivation
*/

-- Function to soft delete a community
CREATE OR REPLACE FUNCTION soft_delete_community(community_uuid UUID, user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if the user is an admin of the community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = user_uuid
    AND role IN ('admin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only community admins can delete communities';
  END IF;
  
  -- Mark the community as deleted
  UPDATE communities
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE id = community_uuid
  AND deleted_at IS NULL;
  
  -- Mark all associated events as deleted
  UPDATE community_events
  SET deleted_at = NOW(),
      updated_at = NOW(),
      status = 'cancelled'
  WHERE community_id = community_uuid
  AND deleted_at IS NULL;
  
  -- Optionally, we could also mark other associated content as deleted
  -- For example, community posts, media, etc.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate a community (temporary state)
CREATE OR REPLACE FUNCTION deactivate_community(community_uuid UUID, user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if the user is an admin of the community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = user_uuid
    AND role IN ('admin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only community admins can deactivate communities';
  END IF;
  
  -- Mark the community as inactive
  UPDATE communities
  SET is_active = FALSE,
      deactivated_at = NOW(),
      updated_at = NOW()
  WHERE id = community_uuid
  AND is_active = TRUE
  AND deleted_at IS NULL;
  
  -- Mark all associated events as inactive
  UPDATE community_events
  SET is_active = FALSE,
      updated_at = NOW(),
      status = 'inactive'
  WHERE community_id = community_uuid
  AND is_active = TRUE
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate a community
CREATE OR REPLACE FUNCTION reactivate_community(community_uuid UUID, user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if the user is an admin of the community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = user_uuid
    AND role IN ('admin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only community admins can reactivate communities';
  END IF;
  
  -- Mark the community as active
  UPDATE communities
  SET is_active = TRUE,
      deactivated_at = NULL,
      updated_at = NOW()
  WHERE id = community_uuid
  AND is_active = FALSE
  AND deleted_at IS NULL;
  
  -- Note: We don't automatically reactivate events as they might need individual review
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the community_events table has the necessary columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_events' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE community_events ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_events' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE community_events ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add RLS policies to prevent access to deleted or inactive communities for non-admins
CREATE POLICY "Users can only view active and non-deleted communities"
  ON communities
  FOR SELECT
  USING (
    (is_active = TRUE AND deleted_at IS NULL) OR
    (auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = id AND role IN ('admin', 'co-admin')
    ))
  );

-- Add RLS policies to prevent access to events from deleted or inactive communities for non-admins
CREATE POLICY "Users can only view events from active and non-deleted communities"
  ON community_events
  FOR SELECT
  USING (
    (is_active = TRUE AND deleted_at IS NULL) OR
    (auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = community_id AND role IN ('admin', 'co-admin')
    ))
  );