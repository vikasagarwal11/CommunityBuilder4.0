/*
  # Create community-images storage bucket

  1. Storage Setup
    - Create `community-images` bucket for storing community images and chat media
    - Set bucket to public for easy access to images
    - Configure appropriate file size limits

  2. Security Policies
    - Allow authenticated users to upload files
    - Allow public read access to all files
    - Allow users to delete their own uploaded files

  3. Configuration
    - Set reasonable file size limits (10MB)
    - Allow common image formats
*/

-- Create the community-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-images',
  'community-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload community images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-images');

-- Allow public read access to all files
CREATE POLICY "Public read access for community images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'community-images');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own community images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own files
CREATE POLICY "Users can update their own community images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);