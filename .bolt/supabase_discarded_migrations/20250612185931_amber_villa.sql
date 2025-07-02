/*
  # Fix Database Relationships and Profile Fetching

  1. Create users table if it doesn't exist
  2. Populate users table with existing auth.users data
  3. Fix foreign key relationships between communities and users
  4. Fix profile fetching to handle missing profiles
  5. Add proper indexes for better query performance
*/

-- First, ensure the users table exists
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Populate users table with existing data from auth.users
INSERT INTO users (id, created_at)
SELECT id, created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING;

-- Fix foreign key relationship between communities and users
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'communities_created_by_fkey' 
    AND table_name = 'communities'
  ) THEN
    ALTER TABLE communities DROP CONSTRAINT communities_created_by_fkey;
  END IF;

  -- Add the correct foreign key constraint
  ALTER TABLE communities 
  ADD CONSTRAINT communities_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
END $$;

-- Ensure all profiles exist for users
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  u.created_at,
  now()
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for users table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own data" ON users;
  DROP POLICY IF EXISTS "Users can update own data" ON users;
  
  -- Create new policies
  CREATE POLICY "Users can read own data" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own data" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
END $$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, created_at)
  VALUES (new.id, new.created_at)
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.created_at,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();