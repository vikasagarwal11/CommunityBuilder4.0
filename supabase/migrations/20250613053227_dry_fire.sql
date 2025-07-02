/*
  # Fix Event Media Upload RLS Policies

  1. Storage Policies
    - Add policies for event-images and event-videos buckets
    - Allow authenticated users to upload files
    - Allow community members to view files

  2. Database Policies
    - Add missing RLS policies for event_media table
    - Allow community members to insert and view event media

  3. Security
    - Ensure only community members can upload to their events
    - Maintain proper access control
*/

-- Enable RLS on event_media table if not already enabled
ALTER TABLE event_media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Community members can upload event media" ON event_media;
DROP POLICY IF EXISTS "Community members can view event media" ON event_media;
DROP POLICY IF EXISTS "Users can delete their own event media" ON event_media;

-- Create RLS policies for event_media table
CREATE POLICY "Community members can upload event media"
  ON event_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_media.event_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can view event media"
  ON event_media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_media.event_id 
      AND cm.user_id = auth.uid()
    )
  );

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

-- Storage policies for event-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-videos', 'event-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Community members can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can delete event images" ON storage.objects;
DROP POLICY IF EXISTS "Community members can upload event videos" ON storage.objects;
DROP POLICY IF EXISTS "Community members can view event videos" ON storage.objects;
DROP POLICY IF EXISTS "Community members can delete event videos" ON storage.objects;

-- Storage policies for event-images bucket
CREATE POLICY "Community members can upload event images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-images' AND
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id::text = (storage.foldername(name))[1]
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can view event images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-images' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM community_events ce
        JOIN community_members cm ON ce.community_id = cm.community_id
        WHERE ce.id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Community members can delete event images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-images' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM community_events ce
        JOIN community_members cm ON ce.community_id = cm.community_id
        WHERE ce.id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'co-admin')
      )
    )
  );

-- Storage policies for event-videos bucket
CREATE POLICY "Community members can upload event videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-videos' AND
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id::text = (storage.foldername(name))[1]
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can view event videos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-videos' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM community_events ce
        JOIN community_members cm ON ce.community_id = cm.community_id
        WHERE ce.id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Community members can delete event videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-videos' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM community_events ce
        JOIN community_members cm ON ce.community_id = cm.community_id
        WHERE ce.id::text = (storage.foldername(name))[1]
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'co-admin')
      )
    )
  );