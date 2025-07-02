/*
  # Fix Users Table RLS Policies

  1. Security
    - Enable RLS on users table if not already enabled
    - Add policies for users to manage their own data
*/

-- Enable Row Level Security on the users table (if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policy to allow authenticated users to insert records (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Add policy for users to read their own data (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT TO authenticated
    USING (uid() = id);
  END IF;
END $$;

-- Add policy for users to update their own data (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE TO authenticated
    USING (uid() = id)
    WITH CHECK (uid() = id);
  END IF;
END $$;