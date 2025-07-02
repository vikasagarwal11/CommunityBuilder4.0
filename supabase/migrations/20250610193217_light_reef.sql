-- Migration to add user photo functionality and community admin display

-- Ensure profiles table has avatar_url column (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Create storage bucket for user avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
END $$;

-- Create storage policies for avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add index on avatar_url for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- Function to handle avatar upload and profile update
CREATE OR REPLACE FUNCTION handle_avatar_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to handle any avatar-related logic
  -- For now, it just ensures the updated_at timestamp is set
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for avatar updates
DROP TRIGGER IF EXISTS avatar_upload_trigger ON profiles;
CREATE TRIGGER avatar_upload_trigger
  BEFORE UPDATE OF avatar_url ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_avatar_upload();

-- Ensure all existing users have a profile record
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.created_at,
  now()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;