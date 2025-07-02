-- Fix storage policies for event-images and event-videos buckets
-- This migration simplifies the storage policies to ensure media uploads work correctly

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Community members can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can upload event videos" ON storage.objects;
DROP POLICY IF EXISTS "Community members can view event videos" ON storage.objects;
DROP POLICY IF EXISTS "Community members can delete event videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to event-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from event-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to event-videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from event-videos" ON storage.objects;

-- Create simple, permissive policies for event-images bucket
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

-- Create simple, permissive policies for event-videos bucket
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
DROP POLICY IF EXISTS "Authenticated users can insert event media" ON event_media;
DROP POLICY IF EXISTS "Authenticated users can view event media" ON event_media;

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
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_media.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );