/*
  # Fix Event Media Upload RLS Policies

  1. Problem
    - Row Level Security (RLS) policies are preventing uploads to event-images bucket
    - Current policies are too restrictive or incorrectly configured
    - Users cannot upload media to events

  2. Solution
    - Create simpler, more permissive policies for event media uploads
    - Ensure storage buckets exist with proper configuration
    - Fix RLS policies for the event_media table
*/

-- Ensure storage buckets exist with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-videos',
  'event-videos', 
  true,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/webm', 'video/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Community members can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can upload event videos" ON storage.objects;
DROP POLICY IF EXISTS "Community members can view event videos" ON storage.objects;
DROP POLICY IF EXISTS "Community members can delete event videos" ON storage.objects;
DROP POLICY IF EXISTS "Community members can upload event media" ON storage.objects;
DROP POLICY IF EXISTS "Community members can view event media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own event media" ON storage.objects;

-- Create simpler storage policies for event-images bucket
CREATE POLICY "Anyone can upload to event-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anyone can view event-images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can delete from event-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-images');

-- Create simpler storage policies for event-videos bucket
CREATE POLICY "Anyone can upload to event-videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-videos');

CREATE POLICY "Anyone can view event-videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'event-videos');

CREATE POLICY "Authenticated users can delete from event-videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-videos');

-- Fix RLS policies for event_media table
DROP POLICY IF EXISTS "Community members can upload event media" ON event_media;
DROP POLICY IF EXISTS "Community members can view event media" ON event_media;
DROP POLICY IF EXISTS "Users can delete their own event media" ON event_media;

-- Create simpler policies for event_media table
CREATE POLICY "Authenticated users can insert event media"
  ON event_media
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can view event media"
  ON event_media
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete their own event media"
  ON event_media
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM community_events ce
    JOIN community_members cm ON ce.community_id = cm.community_id
    WHERE ce.id = event_media.event_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'co-admin')
  ));