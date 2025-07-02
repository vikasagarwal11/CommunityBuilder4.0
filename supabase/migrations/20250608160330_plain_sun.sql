/*
  # Fix infinite recursion in user_roles RLS policies

  1. Problem Analysis
    - Multiple policies on user_roles table are causing infinite recursion
    - Policies are referencing functions that query user_roles table itself
    - This creates a circular dependency during policy evaluation

  2. Solution
    - Remove problematic policies that cause recursion
    - Create simplified, non-recursive policies
    - Ensure policies use direct user ID comparisons without complex subqueries

  3. Changes
    - Drop all existing problematic policies
    - Create new, simplified policies that avoid recursion
    - Maintain security while preventing infinite loops
*/

-- Drop all existing policies on user_roles table to start fresh
DROP POLICY IF EXISTS "community_admins_manage_roles" ON user_roles;
DROP POLICY IF EXISTS "emergency_delete_policy" ON user_roles;
DROP POLICY IF EXISTS "emergency_insert_policy" ON user_roles;
DROP POLICY IF EXISTS "emergency_select_policy" ON user_roles;
DROP POLICY IF EXISTS "emergency_update_policy" ON user_roles;
DROP POLICY IF EXISTS "safe insert roles" ON user_roles;
DROP POLICY IF EXISTS "safe select roles" ON user_roles;
DROP POLICY IF EXISTS "users_delete_own_roles" ON user_roles;
DROP POLICY IF EXISTS "users_insert_own_roles" ON user_roles;
DROP POLICY IF EXISTS "users_update_own_roles" ON user_roles;

-- Create simplified, non-recursive policies

-- Allow users to view their own roles
CREATE POLICY "users_can_view_own_roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to insert their own roles (for registration)
CREATE POLICY "users_can_insert_own_roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own roles
CREATE POLICY "users_can_update_own_roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own roles
CREATE POLICY "users_can_delete_own_roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow service role to manage all roles (for admin operations)
CREATE POLICY "service_role_full_access"
  ON user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);