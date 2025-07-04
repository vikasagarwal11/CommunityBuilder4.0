-- Migration: Create or update community_join_requests table for admin approval join flow

-- 1. Create table if it does not exist
CREATE TABLE IF NOT EXISTS community_join_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    reviewed_by uuid REFERENCES users(id)
);

-- 2. Add columns if they do not exist (future-proofing)
ALTER TABLE community_join_requests
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id);

-- 3. Create or replace indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'community_join_requests' AND indexname = 'idx_unique_pending_join_request'
    ) THEN
        CREATE UNIQUE INDEX idx_unique_pending_join_request
        ON community_join_requests (community_id, user_id)
        WHERE status = 'pending';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'community_join_requests' AND indexname = 'idx_pending_requests_by_community'
    ) THEN
        CREATE INDEX idx_pending_requests_by_community
        ON community_join_requests (community_id, status);
    END IF;
END $$; 