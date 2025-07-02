/*
  # Fix Database Relationships

  1. Problem
    - Missing users table or incorrect relationships between tables
    - Foreign key constraints not properly established
    - Queries failing due to missing relationships

  2. Solution
    - Ensure users table exists with proper structure
    - Fix foreign key relationships between communities, users, and profiles
    - Add proper indexes for query performance
*/

-- First, ensure the users table exists and references auth.users
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

-- Ensure profiles table has correct foreign key to users
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;

  -- Add the correct foreign key constraint
  ALTER TABLE profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Ensure communities table has correct foreign key to users
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);

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
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user record when auth.users record is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure all existing auth users have corresponding records
INSERT INTO users (id, created_at)
SELECT id, created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;