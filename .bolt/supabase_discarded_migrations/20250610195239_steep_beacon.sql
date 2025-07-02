/*
  # Fix Communities Users Relationship

  1. Problem
    - The communities table references users(id) via created_by column
    - But the relationship is not properly established for Supabase queries
    - The query is trying to join communities -> users -> profiles but failing

  2. Solution
    - Ensure the users table exists and has proper structure
    - Fix the foreign key relationship between communities and users
    - Ensure the relationship can be traversed in Supabase queries

  3. Changes
    - Create users table if it doesn't exist (referencing auth.users)
    - Update foreign key constraints to ensure proper relationships
    - Add indexes for better query performance
*/

-- First, ensure the users table exists and references auth.users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure the communities table has the correct foreign key to users
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user record when auth.users record is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();