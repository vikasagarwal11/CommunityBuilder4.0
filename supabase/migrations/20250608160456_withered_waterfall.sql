/*
  # Fix user_roles RLS policies and foreign key relationships

  1. Database Changes
    - Drop existing problematic RLS policies on user_roles table
    - Add proper foreign key constraint between user_roles and roles tables
    - Create new, non-recursive RLS policies for user_roles table

  2. Security
    - Enable RLS on user_roles table with safe policies
    - Ensure policies don't create infinite recursion
    - Allow users to manage their own roles safely
*/

-- First, drop all existing policies on user_roles to prevent recursion
DROP POLICY IF EXISTS "service_role_full_access" ON user_roles;
DROP POLICY IF EXISTS "users_can_delete_own_roles" ON user_roles;
DROP POLICY IF EXISTS "users_can_insert_own_roles" ON user_roles;
DROP POLICY IF EXISTS "users_can_update_own_roles" ON user_roles;
DROP POLICY IF EXISTS "users_can_view_own_roles" ON user_roles;

-- Add missing foreign key constraint between user_roles and roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_role_id_fkey'
  ) THEN
    ALTER TABLE user_roles 
    ADD CONSTRAINT user_roles_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create new, safe RLS policies that don't cause recursion
CREATE POLICY "users_can_view_own_roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_can_insert_own_roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_delete_own_roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role policy for administrative operations
CREATE POLICY "service_role_full_access"
  ON user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);