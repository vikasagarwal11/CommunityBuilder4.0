/*
  # Event Media Management System

  1. New Tables
    - `event_photos` - Photo gallery for community events
    - `event_media` - Comprehensive media support (images, videos, etc.)

  2. Storage
    - 'event-videos' bucket for video uploads

  3. Security
    - RLS policies for proper access control
    - Storage policies for secure file management
*/

-- Create event_photos table for event gallery
CREATE TABLE IF NOT EXISTS event_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Create event_media table for more comprehensive media support
CREATE TABLE IF NOT EXISTS event_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'other')),
  file_name text,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on tables
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_media ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_user_id ON event_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_event_media_event_id ON event_media(event_id);
CREATE INDEX IF NOT EXISTS idx_event_media_user_id ON event_media(user_id);
CREATE INDEX IF NOT EXISTS idx_event_media_type ON event_media(media_type);

-- Create storage bucket for event videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-videos',
  'event-videos', 
  true,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/webm', 'video/ogg']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for event_photos - Drop existing policies first
DO $$
BEGIN
  DROP POLICY IF EXISTS "Community members can view event photos" ON event_photos;
  DROP POLICY IF EXISTS "Community members can upload event photos" ON event_photos;
  DROP POLICY IF EXISTS "Users can delete their own event photos" ON event_photos;
END $$;

-- Community members can view event photos
CREATE POLICY "Community members can view event photos"
  ON event_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_photos.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Community members can upload photos to events
CREATE POLICY "Community members can upload event photos"
  ON event_photos FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_photos.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can delete their own photos, admins can delete any photos
CREATE POLICY "Users can delete their own event photos"
  ON event_photos FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_photos.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- RLS Policies for event_media - Drop existing policies first
DO $$
BEGIN
  DROP POLICY IF EXISTS "Community members can view event media" ON event_media;
  DROP POLICY IF EXISTS "Community members can upload event media" ON event_media;
  DROP POLICY IF EXISTS "Users can delete their own event media" ON event_media;
END $$;

-- Community members can view event media
CREATE POLICY "Community members can view event media"
  ON event_media FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_media.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Community members can upload media to events
CREATE POLICY "Community members can upload event media"
  ON event_media FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_media.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can delete their own media, admins can delete any media
CREATE POLICY "Users can delete their own event media"
  ON event_media FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_media.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Storage policies for event videos - Drop existing policies first
DO $$
BEGIN
  DROP POLICY IF EXISTS "Community members can upload event videos" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view event videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own event videos" ON storage.objects;
END $$;

-- Create storage policies for event videos
CREATE POLICY "Community members can upload event videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-videos' AND
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view event videos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'event-videos');

CREATE POLICY "Users can delete their own event videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);