/*
  # Add Community Deletion and Deactivation Features

  1. New Columns
    - Add `is_active` boolean column to `communities` table
    - Add `deactivated_at` timestamp column to `communities` table
    - Add `deactivated_by` UUID column to `communities` table
    - Add `deleted_at` timestamp column to `communities` table
    - Add `deleted_by` UUID column to `communities` table

  2. Security
    - Update RLS policies to respect active/deleted status
    - Add new policies for deactivation/deletion actions
*/

-- Add new columns to communities table
ALTER TABLE communities 
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN deactivated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deactivated_by UUID DEFAULT NULL REFERENCES auth.users(id),
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deleted_by UUID DEFAULT NULL REFERENCES auth.users(id);

-- Create index for faster queries on active status
CREATE INDEX idx_communities_is_active ON communities(is_active);

-- Update existing policies to respect active/deleted status
CREATE OR REPLACE FUNCTION is_community_visible()
RETURNS boolean AS $$
BEGIN
  RETURN (is_active = true AND deleted_at IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Update the "Anyone can read public communities" policy
DROP POLICY IF EXISTS "Anyone can read public communities" ON communities;
CREATE POLICY "Anyone can read public communities" 
ON communities 
FOR SELECT 
TO public 
USING (is_active = true AND deleted_at IS NULL);

-- Add policy for community admins to deactivate communities
CREATE POLICY "Community admins can deactivate communities" 
ON communities 
FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid())
WITH CHECK (
  created_by = auth.uid() AND 
  (
    (is_active = false AND deactivated_at IS NOT NULL AND deactivated_by IS NOT NULL) OR
    (is_active = true AND deactivated_at IS NULL AND deactivated_by IS NULL)
  )
);

-- Add policy for community admins to delete communities
CREATE POLICY "Community admins can delete communities" 
ON communities 
FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid())
WITH CHECK (
  created_by = auth.uid() AND 
  (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
);

-- Create function to soft delete a community
CREATE OR REPLACE FUNCTION soft_delete_community(community_uuid UUID, user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE communities
  SET deleted_at = NOW(),
      deleted_by = user_uuid,
      is_active = false
  WHERE id = community_uuid AND created_by = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to deactivate a community
CREATE OR REPLACE FUNCTION deactivate_community(community_uuid UUID, user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE communities
  SET is_active = false,
      deactivated_at = NOW(),
      deactivated_by = user_uuid
  WHERE id = community_uuid AND created_by = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to reactivate a community
CREATE OR REPLACE FUNCTION reactivate_community(community_uuid UUID, user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE communities
  SET is_active = true,
      deactivated_at = NULL,
      deactivated_by = NULL
  WHERE id = community_uuid AND created_by = user_uuid AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;