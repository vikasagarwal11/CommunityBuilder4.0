/*
  # Fix Community Members Duplication Issue
  
  1. Problem:
     - Duplicate key violations in community_members table
     - "duplicate key value violates unique constraint community_members_pkey"
     - This happens when trying to add a user who is already a member
  
  2. Solution:
     - Create or replace policies instead of just creating them
     - Add proper conflict handling in the assign_community_admin function
     - Ensure all policies use CREATE OR REPLACE POLICY instead of just CREATE POLICY
     - Fix the community_members_pkey constraint issue
*/

-- Fix the assign_community_admin function to properly handle conflicts
CREATE OR REPLACE FUNCTION public.assign_community_admin()
RETURNS trigger AS $$
BEGIN
  -- Only assign admin if this is not the default community and has a creator
  IF NEW.is_default IS NOT TRUE AND NEW.created_by IS NOT NULL THEN
    -- Use INSERT ... ON CONFLICT DO NOTHING to prevent duplicate key errors
    INSERT INTO public.community_members (community_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (user_id, community_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in assign_community_admin: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update community_members policies to use CREATE OR REPLACE POLICY
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Members can view community data" ON community_members;
  DROP POLICY IF EXISTS "Community members can view community data" ON community_members;
  DROP POLICY IF EXISTS "Allow members to view community data" ON community_members;
  DROP POLICY IF EXISTS "Allow insert for own membership" ON community_members;
  DROP POLICY IF EXISTS "Allow self-insert to community_members" ON community_members;
  
  -- Create updated policies
  CREATE POLICY "Members can view community data"
    ON community_members FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Allow self-insert to community_members"
    ON community_members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
END $$;

-- Fix the handle_new_user function to properly handle conflicts when adding to default community
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_id uuid;
  default_community_id uuid;
  admin_role_id uuid;
BEGIN
  -- Create profile with new fields
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url, 
    bio, 
    interests, 
    custom_interests,
    age_range,
    location,
    experience_level,
    preferences
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NULL,
    NULL,
    '{}',
    '{}',
    NULL,
    NULL,
    'beginner',
    '{"notifications_enabled": true, "private_profile": false}'
  );
  
  -- Assign role based on email
  IF NEW.email = 'admin@momsfitnessmojo.com' THEN
    -- Assign Platform Owner role to admin
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Platform Owner';
    IF admin_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, assigned_by)
      VALUES (NEW.id, admin_role_id, NEW.id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  ELSE
    -- Assign Platform User role to regular users
    SELECT id INTO user_role_id FROM public.roles WHERE name = 'Platform User';
    IF user_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, assigned_by)
      VALUES (NEW.id, user_role_id, NEW.id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;
  
  -- Add to default community if it exists
  SELECT id INTO default_community_id FROM public.communities WHERE is_default = true;
  IF default_community_id IS NOT NULL THEN
    INSERT INTO public.community_members (user_id, community_id, role)
    VALUES (NEW.id, default_community_id, 'member')
    ON CONFLICT (user_id, community_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the join community function in the application by adding ON CONFLICT DO NOTHING
-- This is a comment for the developer to update their code, not actual SQL