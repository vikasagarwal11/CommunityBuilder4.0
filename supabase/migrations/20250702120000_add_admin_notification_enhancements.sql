-- Add enhanced columns to admin_notifications table for better admin functionality

-- Add priority column for notification importance levels
ALTER TABLE admin_notifications 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add category column for notification types
ALTER TABLE admin_notifications 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('event_suggestion', 'join_request', 'content_moderation', 'member_issue', 'system_alert', 'ai_insight', 'general'));

-- Add summary column for notification summaries
ALTER TABLE admin_notifications 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add suggested_actions column for AI-suggested actions
ALTER TABLE admin_notifications 
ADD COLUMN IF NOT EXISTS suggested_actions JSONB;

-- Add index for better query performance on priority and category
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_category ON admin_notifications(category);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_community_read ON admin_notifications(community_id, is_read);

-- Add comment to document the table purpose
COMMENT ON TABLE admin_notifications IS 'Stores actionable notifications for community admins including event suggestions, join requests, content moderation alerts, and AI insights';

-- Enhance admin_notifications table for advanced admin features

ALTER TABLE admin_notifications
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE admin_notifications
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('event_suggestion', 'join_request', 'content_moderation', 'member_issue', 'system_alert', 'ai_insight', 'general'));

ALTER TABLE admin_notifications
ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE admin_notifications
ADD COLUMN IF NOT EXISTS suggested_actions JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_community_id ON admin_notifications (community_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_category ON admin_notifications (category);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications (priority); 