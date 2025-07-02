/*
  # Update Profile Schema for Generic Platform

  1. New Columns
    - `interests` - Array of predefined interest categories
    - `custom_interests` - Array of user-defined interests
    - `age_range` - User's age range for better community matching
    - `location` - User's location for local community recommendations
    - `experience_level` - User's experience level (beginner, intermediate, advanced, expert)
    - `preferences` - JSONB object for user preferences (notifications, privacy, etc.)

  2. Indexes
    - Add indexes for efficient querying of new columns
    - Optimize for interest-based community recommendations

  3. Migration
    - Migrate existing fitness_goals data to interests
    - Set default values for new columns
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_interests text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS age_range text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{"notifications_enabled": true, "private_profile": false}';

-- Migrate existing fitness_goals data to interests
DO $$
BEGIN
  -- Only run this if the fitness_goals column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'fitness_goals'
  ) THEN
    -- Update interests with fitness_goals data for profiles that have fitness_goals
    UPDATE profiles
    SET interests = fitness_goals
    WHERE fitness_goals IS NOT NULL AND array_length(fitness_goals, 1) > 0;
  END IF;
END $$;

-- Create indexes for new columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING gin(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_custom_interests ON profiles USING gin(custom_interests);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_experience_level ON profiles(experience_level);

-- Update RLS policies to include new columns
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  
  -- Create updated policies
  CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
END $$;

-- Update handle_new_user function to include new default values
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