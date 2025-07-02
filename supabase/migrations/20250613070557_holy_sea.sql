/*
  # Fix Event RSVPs to Profiles Relationship

  1. Problem
    - Missing foreign key relationship between event_rsvps.user_id and profiles.id
    - This prevents PostgREST from performing joins between these tables
    - Error: "Could not find a relationship between 'event_rsvps' and 'profiles' in the schema cache"

  2. Solution
    - Add foreign key constraint from event_rsvps.user_id to profiles.id
    - Clean up any orphaned records first to prevent constraint violation
    - Add index for better query performance
*/

-- First, clean up any orphaned records in event_rsvps that reference non-existent profiles
DELETE FROM event_rsvps
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Add foreign key constraint to establish the relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_rsvps_user_id_profiles_fkey'
    AND table_name = 'event_rsvps'
  ) THEN
    ALTER TABLE event_rsvps
    ADD CONSTRAINT event_rsvps_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON event_rsvps(user_id);