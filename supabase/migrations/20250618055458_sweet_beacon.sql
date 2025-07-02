-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for events table
CREATE POLICY "Community members can view events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = events.community_id
      AND community_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Community admins can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = events.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

CREATE POLICY "Community admins can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = events.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

CREATE POLICY "Community admins can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = events.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('admin', 'co-admin')
    )
  );

-- Create function to increment engagement level
CREATE OR REPLACE FUNCTION increment_engagement(message_id UUID, increment_by INT DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE community_posts
  SET engagement_level = COALESCE(engagement_level, 0) + increment_by
  WHERE id = message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  message_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  intent_type TEXT NOT NULL,
  intent_details JSONB,
  is_read BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Enable RLS on admin_notifications if not already enabled
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_notifications if they don't exist
DO $$
BEGIN
  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_notifications' 
    AND policyname = 'Community admins can view notifications'
  ) THEN
    CREATE POLICY "Community admins can view notifications"
      ON admin_notifications
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM community_members
          WHERE community_members.community_id = admin_notifications.community_id
          AND community_members.user_id = auth.uid()
          AND community_members.role IN ('admin', 'co-admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_notifications' 
    AND policyname = 'Users can create notifications'
  ) THEN
    CREATE POLICY "Users can create notifications"
      ON admin_notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_notifications' 
    AND policyname = 'Admins can update notifications'
  ) THEN
    CREATE POLICY "Admins can update notifications"
      ON admin_notifications
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM community_members
          WHERE community_members.community_id = admin_notifications.community_id
          AND community_members.user_id = auth.uid()
          AND community_members.role IN ('admin', 'co-admin')
        )
      );
  END IF;
END $$;

-- Create message_intents table
CREATE TABLE IF NOT EXISTS message_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  intent_type TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  details JSONB,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on message_intents
ALTER TABLE message_intents ENABLE ROW LEVEL SECURITY;

-- Create policies for message_intents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_intents' 
    AND policyname = 'Community members can view message intents'
  ) THEN
    CREATE POLICY "Community members can view message intents"
      ON message_intents
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM community_members
          WHERE community_members.community_id = message_intents.community_id
          AND community_members.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_intents' 
    AND policyname = 'Community admins can update message intents'
  ) THEN
    CREATE POLICY "Community admins can update message intents"
      ON message_intents
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM community_members
          WHERE community_members.community_id = message_intents.community_id
          AND community_members.user_id = auth.uid()
          AND community_members.role IN ('admin', 'co-admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_intents' 
    AND policyname = 'Users can create message intents'
  ) THEN
    CREATE POLICY "Users can create message intents"
      ON message_intents
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM community_posts
          WHERE community_posts.id = message_intents.message_id
          AND community_posts.community_id = message_intents.community_id
        )
      );
  END IF;
END $$;

-- Create function to update engagement level when reactions are added
CREATE OR REPLACE FUNCTION update_post_engagement_on_reaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment engagement level by 1 when a reaction is added
    PERFORM increment_engagement(NEW.message_id, 1);
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement engagement level by 1 when a reaction is removed
    PERFORM increment_engagement(OLD.message_id, -1);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update engagement level when comments are added
CREATE OR REPLACE FUNCTION update_post_engagement_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment engagement level by 2 when a comment is added
    PERFORM increment_engagement(NEW.post_id, 2);
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement engagement level by 2 when a comment is removed
    PERFORM increment_engagement(OLD.post_id, -2);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if triggers already exist before creating them
DO $$
BEGIN
  -- Check if the reaction trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_post_engagement_on_reaction_trigger'
  ) THEN
    -- Create trigger for message reactions
    CREATE TRIGGER update_post_engagement_on_reaction_trigger
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_reaction();
  END IF;

  -- Check if the comment trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_post_engagement_on_comment_trigger'
  ) THEN
    -- Create trigger for post comments
    CREATE TRIGGER update_post_engagement_on_comment_trigger
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_engagement_on_comment();
  END IF;
END $$;

-- Create index on engagement_level for faster queries
CREATE INDEX IF NOT EXISTS idx_community_posts_engagement_level
ON community_posts(engagement_level);