/*
  # Community Event Management System

  1. New Tables
    - `community_events` - Store event details created by community admins
    - `event_rsvps` - Track member RSVPs to events
    - `event_comments` - Allow members to comment on events
    - `event_reminders` - Schedule reminders for upcoming events

  2. Security
    - Enable RLS on all new tables
    - Add policies for community-based access control
    - Ensure admins can manage events and members can RSVP

  3. Features
    - Event creation and management by community admins
    - RSVP functionality for members
    - Event comments and discussions
    - Automated reminders
*/

-- Create community_events table
CREATE TABLE IF NOT EXISTS community_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  image_url text,
  capacity integer,
  is_online boolean DEFAULT false,
  meeting_url text,
  is_recurring boolean DEFAULT false,
  recurrence_rule text, -- iCalendar RRULE format
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
  guests_count integer DEFAULT 0,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event_comments table
CREATE TABLE IF NOT EXISTS event_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_reminders table
CREATE TABLE IF NOT EXISTS event_reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES community_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reminder_time timestamptz NOT NULL,
  is_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_events_community_id ON community_events(community_id);
CREATE INDEX IF NOT EXISTS idx_community_events_created_by ON community_events(created_by);
CREATE INDEX IF NOT EXISTS idx_community_events_start_time ON community_events(start_time);
CREATE INDEX IF NOT EXISTS idx_community_events_status ON community_events(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_reminder_time ON event_reminders(reminder_time) WHERE is_sent = false;

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for event images
CREATE POLICY "Community admins can upload event images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-images' AND
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.user_id = auth.uid() 
    AND cm.role IN ('admin', 'co-admin')
  )
);

CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'event-images');

-- RLS Policies for community_events

-- Community members can view events
CREATE POLICY "Community members can view events"
  ON community_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_events.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- Community admins can create events
CREATE POLICY "Community admins can create events"
  ON community_events FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_events.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Community admins can update events
CREATE POLICY "Community admins can update events"
  ON community_events FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_events.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- Community admins can delete events
CREATE POLICY "Community admins can delete events"
  ON community_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_events.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'co-admin')
    )
  );

-- RLS Policies for event_rsvps

-- Community members can view RSVPs
CREATE POLICY "Community members can view RSVPs"
  ON event_rsvps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_rsvps.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Community members can RSVP to events
CREATE POLICY "Community members can RSVP to events"
  ON event_rsvps FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_rsvps.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can update their own RSVPs
CREATE POLICY "Users can update their own RSVPs"
  ON event_rsvps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete their own RSVPs"
  ON event_rsvps FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for event_comments

-- Community members can view event comments
CREATE POLICY "Community members can view event comments"
  ON event_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_comments.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Community members can comment on events
CREATE POLICY "Community members can comment on events"
  ON event_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_comments.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON event_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON event_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for event_reminders

-- Users can view their own reminders
CREATE POLICY "Users can view their own reminders"
  ON event_reminders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create reminders for events they can view
CREATE POLICY "Users can create reminders for events they can view"
  ON event_reminders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_events ce
      JOIN community_members cm ON ce.community_id = cm.community_id
      WHERE ce.id = event_reminders.event_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own reminders"
  ON event_reminders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Function to update event status based on time
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on time
  IF NEW.start_time <= NOW() AND (NEW.end_time IS NULL OR NEW.end_time > NOW()) THEN
    NEW.status := 'ongoing';
  ELSIF (NEW.end_time IS NOT NULL AND NEW.end_time <= NOW()) THEN
    NEW.status := 'completed';
  ELSE
    NEW.status := 'upcoming';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update event status
CREATE TRIGGER update_event_status_trigger
  BEFORE INSERT OR UPDATE ON community_events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_status();

-- Function to check capacity before RSVP
CREATE OR REPLACE FUNCTION check_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
  event_capacity INTEGER;
  current_rsvps INTEGER;
BEGIN
  -- Only check for 'going' status
  IF NEW.status != 'going' THEN
    RETURN NEW;
  END IF;

  -- Get event capacity
  SELECT capacity INTO event_capacity
  FROM community_events
  WHERE id = NEW.event_id;
  
  -- If no capacity limit, allow RSVP
  IF event_capacity IS NULL OR event_capacity = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Count current 'going' RSVPs
  SELECT COUNT(*) INTO current_rsvps
  FROM event_rsvps
  WHERE event_id = NEW.event_id AND status = 'going';
  
  -- Check if adding this RSVP would exceed capacity
  -- For updates, we need to check if this is a new 'going' RSVP
  IF TG_OP = 'UPDATE' AND OLD.status = 'going' THEN
    -- Already counted in current_rsvps, so no change
    RETURN NEW;
  ELSIF current_rsvps >= event_capacity THEN
    RAISE EXCEPTION 'Event has reached maximum capacity';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check capacity before RSVP
CREATE TRIGGER check_event_capacity_trigger
  BEFORE INSERT OR UPDATE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION check_event_capacity();

-- Function to create activity record when event is created
CREATE OR REPLACE FUNCTION create_activity_on_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_activities (
    community_id,
    user_id,
    type,
    content
  ) VALUES (
    NEW.community_id,
    NEW.created_by,
    'event_created',
    jsonb_build_object(
      'event_id', NEW.id,
      'event_title', NEW.title,
      'event_start_time', NEW.start_time
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail event creation
    RAISE LOG 'Error creating activity for event %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create activity when event is created
CREATE TRIGGER event_created_activity
  AFTER INSERT ON community_events
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_on_event();