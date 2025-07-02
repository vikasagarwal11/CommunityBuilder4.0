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
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  is_default boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
INSERT INTO public.roles (id, name, access_level, permissions) VALUES
  ('964cb545-3b2d-45ee-971f-4d4f23484420', 'Platform Owner', 'SUPREME_ADMIN', '{"admin": true, "manage_users": true, "manage_communities": true}'),
  ('4c09e4ec-f7c0-41a2-8b38-dbc73ab2d07c', 'Platform User', 'USER', '{"create_profile": true, "join_communities": true}');

-- FUNCTION: Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_id uuid;
  default_community_id uuid;
  admin_role_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
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
  
  -- Add to default community
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

-- FUNCTION: Assign community admin
CREATE OR REPLACE FUNCTION public.assign_community_admin()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (user_id, community_id) DO NOTHING;
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

-- CREATE DEFAULT COMMUNITY
INSERT INTO public.communities (name, description, is_default, created_by)
SELECT 
  'Global Hub',
  'Welcome to MomFit! This is our global community where all members can connect, share experiences, and support each other on their fitness journey.',
  true,
  '00000000-0000-0000-0000-000000000000'::uuid
WHERE NOT EXISTS (SELECT 1 FROM public.communities WHERE is_default = true);

COMMENT ON SCHEMA public IS 'MomFit application schema - clean and simple setup';