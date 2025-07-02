/*
  # Fresh Database Setup - Complete Reset

  1. Core Tables
    - profiles (user profiles)
    - roles (user roles system)
    - user_roles (role assignments)
    - communities (community management)
    - community_members (community membership)
    - community_posts (community content)

  2. Security
    - Enable RLS on all tables
    - Create secure policies for each table
    - Set up proper user permissions

  3. Functions & Triggers
    - User registration handling
    - Community admin assignment
    - Role management
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  bio text,
  fitness_goals text[] DEFAULT '{}',
  children_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. ROLES TABLE
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  access_level text NOT NULL,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role_id)
);

-- 4. COMMUNITIES TABLE
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL,
  image_url text,
  created_by uuid REFERENCES auth.users(id),
  is_default boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fix the default community creation by handling the NOT NULL constraint properly

-- First, alter the table to allow NULL created_by
ALTER TABLE public.communities ALTER COLUMN created_by DROP NOT NULL;

-- Now create the default community with NULL created_by
DO $$
DECLARE
  default_community_id uuid;
BEGIN
  -- Check if we already have a default community
  SELECT id INTO default_community_id FROM public.communities WHERE is_default = true;
  
  -- Only create if it doesn't exist
  IF default_community_id IS NULL THEN
    -- Create the default community with NULL created_by
    INSERT INTO public.communities (name, description, is_default, created_by)
    VALUES (
      'Global Hub',
      'Welcome to MomFit! This is our global community where all members can connect, share experiences, and support each other on their fitness journey.',
      true,
      NULL
    )
    RETURNING id INTO default_community_id;
    
    RAISE LOG 'Created default community with ID: %', default_community_id;
  END IF;
END $$;

-- Add a constraint to ensure only the default community can have NULL created_by
ALTER TABLE public.communities ADD CONSTRAINT check_created_by_null_only_for_default 
  CHECK (
    (is_default = true AND created_by IS NULL) OR 
    (is_default = false AND created_by IS NOT NULL) OR
    (is_default IS NULL AND created_by IS NOT NULL)
  );

-- Update the community admin assignment function to handle the default community
CREATE OR REPLACE FUNCTION public.assign_community_admin()
RETURNS trigger AS $$
BEGIN
  -- Only assign admin if this is not the default community
  IF NEW.is_default IS NOT TRUE THEN
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

COMMENT ON TABLE public.communities IS 'Communities table - default community can have NULL created_by';

-- 5. COMMUNITY MEMBERS TABLE
CREATE TABLE public.community_members (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'co-admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);

-- 6. COMMUNITY POSTS TABLE
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls text[],
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ROLES POLICIES
CREATE POLICY "Anyone can read roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

-- USER ROLES POLICIES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- COMMUNITIES POLICIES
CREATE POLICY "Anyone can read communities"
  ON public.communities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- COMMUNITY MEMBERS POLICIES
CREATE POLICY "Members can view community membership"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- COMMUNITY POSTS POLICIES
CREATE POLICY "Community members can view posts"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_posts.community_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can create posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_posts.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- INSERT DEFAULT ROLES
INSERT INTO public.roles (id, name, access_level, permissions) 
VALUES
  ('964cb545-3b2d-45ee-971f-4d4f23484420', 'Platform Owner', 'SUPREME_ADMIN', '[
    {"id": "all", "name": "all", "scope": "global", "action": "manage", "resource": "*", "description": "Full system access"}
  ]'),
  ('dfcef7f9-6984-4d09-9382-d4896de062db', 'Community Admin', 'ADMIN', '[
    {"id": "manage_community", "name": "manage_community", "scope": "community", "action": "manage", "resource": "community", "description": "Manage community settings and content"},
    {"id": "manage_members", "name": "manage_members", "scope": "community", "action": "manage", "resource": "members", "description": "Manage community members"}
  ]'),
  ('a47d6865-24b8-47de-943a-c2bfb9af5e90', 'Community Co-Admin', 'SECONDARY_ADMIN', '[
    {"id": "manage_content", "name": "manage_content", "scope": "community", "action": "manage", "resource": "content", "description": "Manage community content"},
    {"id": "moderate_members", "name": "moderate_members", "scope": "community", "action": "update", "resource": "members", "description": "Moderate community members"}
  ]'),
  ('19e75df8-18a0-4cce-a432-a1e674a296b1', 'Community Member', 'MEMBER', '[
    {"id": "create_content", "name": "create_content", "scope": "community", "action": "create", "resource": "content", "description": "Create community content"},
    {"id": "interact_content", "name": "interact_content", "scope": "community", "action": "update", "resource": "content", "description": "Interact with community content"}
  ]'),
  ('4c09e4ec-f7c0-41a2-8b38-dbc73ab2d07d', 'Platform User', 'USER', '[
    {"id": "view_public", "name": "view_public", "scope": "content", "action": "read", "resource": "public", "description": "View public content"},
    {"id": "manage_profile", "name": "manage_profile", "scope": "content", "action": "manage", "resource": "profile", "description": "Manage own profile"},
    {"id": "create_posts", "name": "create_posts", "scope": "community", "action": "create", "resource": "content", "description": "Create posts"},
    {"id": "join_communities", "name": "join_communities", "scope": "community", "action": "join", "resource": "community", "description": "Join communities"},
    {"id": "create_communities", "name": "create_communities", "scope": "community", "action": "create", "resource": "community", "description": "Create communities"}
  ]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  access_level = EXCLUDED.access_level,
  permissions = EXCLUDED.permissions,
  updated_at = now();
-- FUNCTION: Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_id uuid;
  default_community_id uuid;
  admin_role_id uuid;
BEGIN
  -- Create profile
INSERT INTO public.profiles (id, email, full_name, avatar_url, bio, fitness_goals, children_info)
VALUES (
  NEW.id,
  NEW.email,
  COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
  NULL,
  NULL,
  '{}',
  '{}'
);
  -- Assign role based on email
  IF NEW.email = 'admin@momsfitnessmojo.com' THEN
    -- Assign Platform Owner role to admin
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Platform Owner';
    IF admin_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, assigned_by)
      VALUES (NEW.id, admin_role_id, NEW.id);
    END IF;
  ELSE
    -- Assign Platform User role to regular users
    SELECT id INTO user_role_id FROM public.roles WHERE name = 'Platform User';
    IF user_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, assigned_by)
      VALUES (NEW.id, user_role_id, NEW.id);
    END IF;
  END IF;
  
  -- Add to default community if it exists
  SELECT id INTO default_community_id FROM public.communities WHERE is_default = true;
  IF default_community_id IS NOT NULL THEN
    INSERT INTO public.community_members (user_id, community_id, role)
    VALUES (NEW.id, default_community_id, 'member');
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCTION: Assign community admin
CREATE OR REPLACE FUNCTION public.assign_community_admin()
RETURNS trigger AS $$
BEGIN
  -- Only assign admin if this is not the default community and has a creator
  IF NEW.is_default IS NOT TRUE AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.community_members (community_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin');
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in assign_community_admin: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGERS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER assign_community_admin_trigger
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.assign_community_admin();

-- CREATE INDEXES
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_communities_created_by ON public.communities(created_by);
CREATE INDEX idx_communities_is_default ON public.communities(is_default) WHERE is_default = true;
CREATE INDEX idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX idx_community_members_community_id ON public.community_members(community_id);

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- CREATE DEFAULT COMMUNITY (after making created_by nullable for default community)
ALTER TABLE public.communities ALTER COLUMN created_by DROP NOT NULL;

-- Add constraint to ensure only default community can have NULL created_by
ALTER TABLE public.communities ADD CONSTRAINT check_created_by_null_only_for_default 
  CHECK (
    (is_default = true AND created_by IS NULL) OR 
    (is_default = false AND created_by IS NOT NULL) OR
    (is_default IS NULL AND created_by IS NOT NULL)
  );

-- Insert the default community
INSERT INTO public.communities (name, description, is_default, created_by)
VALUES (
  'Global Hub',
  'Welcome to MomFit! This is our global community where all members can connect, share experiences, and support each other on their fitness journey.',
  true,
  NULL
);

COMMENT ON SCHEMA public IS 'MomFit application schema - fresh start';