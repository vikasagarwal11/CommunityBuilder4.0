/*
  # Community Logical Deletion and Deactivation

  1. New Columns
    - Add columns to communities table for tracking active status and deletion
    - Add columns for tracking who performed these actions and when

  2. Functions
    - Create functions for deactivating, reactivating, and soft-deleting communities
    - Each function includes permission checks to ensure only admins can perform these actions
    - Cascades status changes to related events

  3. Security
    - Update RLS policies to handle visibility of inactive and deleted communities
    - Ensure admins can still see their communities regardless of status
*/

-- Add columns for logical deletion and deactivation
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS deactivate_community(uuid, uuid);
DROP FUNCTION IF EXISTS reactivate_community(uuid, uuid);
DROP FUNCTION IF EXISTS soft_delete_community(uuid, uuid);

-- Function to deactivate a community
CREATE FUNCTION deactivate_community(community_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if the user is an admin of the community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = user_uuid
    AND role IN ('admin', 'co-admin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only community admins can deactivate communities';
  END IF;
  
  -- Deactivate the community
  UPDATE communities
  SET is_active = false,
      deactivated_at = NOW(),
      deactivated_by = user_uuid,
      updated_at = NOW()
  WHERE id = community_uuid;
  
  -- Also deactivate all events in this community
  UPDATE community_events
  SET is_active = false,
      updated_at = NOW()
  WHERE community_id = community_uuid;
  
  RETURN true;
END;
$$;

-- Function to reactivate a community
CREATE FUNCTION reactivate_community(community_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if the user is an admin of the community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = user_uuid
    AND role IN ('admin', 'co-admin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only community admins can reactivate communities';
  END IF;
  
  -- Reactivate the community
  UPDATE communities
  SET is_active = true,
      deactivated_at = NULL,
      deactivated_by = NULL,
      updated_at = NOW()
  WHERE id = community_uuid;
  
  -- Do NOT automatically reactivate events - let admins decide which ones to reactivate
  
  RETURN true;
END;
$$;

-- Function to soft delete a community
CREATE FUNCTION soft_delete_community(community_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if the user is an admin of the community
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = community_uuid
    AND user_id = user_uuid
    AND role IN ('admin', 'co-admin')
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only community admins can delete communities';
  END IF;
  
  -- Soft delete the community
  UPDATE communities
  SET deleted_at = NOW(),
      deleted_by = user_uuid,
      is_active = false,
      updated_at = NOW()
  WHERE id = community_uuid;
  
  -- Also mark all events in this community as deleted
  UPDATE community_events
  SET deleted_at = NOW(),
      is_active = false,
      updated_at = NOW()
  WHERE community_id = community_uuid;
  
  RETURN true;
END;
$$;

-- Update RLS policies for communities to handle deleted and inactive communities
DROP POLICY IF EXISTS "Anyone can read public communities" ON communities;
CREATE POLICY "Anyone can read public communities" 
ON communities FOR SELECT 
TO public 
USING ((is_active = true) AND (deleted_at IS NULL));

-- Add policy for admins to see their own communities even if inactive or deleted
DROP POLICY IF EXISTS "Admins can see their own communities regardless of status" ON communities;
CREATE POLICY "Admins can see their own communities regardless of status"
ON communities FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM community_members
    WHERE community_id = communities.id
    AND role IN ('admin', 'co-admin')
  )
);

-- Update RLS policies for community_events to handle deleted and inactive communities
DROP POLICY IF EXISTS "Users can only view events from active and non-deleted communit" ON community_events;
CREATE POLICY "Users can only view events from active and non-deleted communities"
ON community_events FOR SELECT
TO public
USING (
  ((is_active = true) AND (deleted_at IS NULL)) OR 
  (auth.uid() IN (
    SELECT user_id FROM community_members
    WHERE community_members.community_id = community_events.community_id
    AND role IN ('admin', 'co-admin')
  ))
);

-- Add column to community_events table if it doesn't exist
ALTER TABLE community_events 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;