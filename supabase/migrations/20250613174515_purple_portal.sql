/*
  # Add Slugs and Usernames to Entities
  
  1. New Columns
    - Add `slug` to communities and community_events tables
    - Add `username` to profiles table
  
  2. Functions
    - Create functions to generate slugs from text
    - Create functions to ensure uniqueness of slugs
    - Generate slugs for existing records
  
  3. Triggers
    - Add triggers to automatically generate slugs for new records
*/

-- Add slug column to communities table if it doesn't exist
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS slug text;

-- Add username column to profiles table if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username text;

-- Add slug column to community_events table if it doesn't exist
ALTER TABLE community_events
ADD COLUMN IF NOT EXISTS slug text;

-- Add unique constraints (only if they don't already exist)
DO $$
BEGIN
  -- Check if communities_slug_key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'communities_slug_key' 
    AND conrelid = 'communities'::regclass
  ) THEN
    ALTER TABLE communities
    ADD CONSTRAINT communities_slug_key UNIQUE (slug);
  END IF;

  -- Check if profiles_username_key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_key' 
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;

  -- Check if community_events_slug_key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_events_slug_key' 
    AND conrelid = 'community_events'::regclass
  ) THEN
    ALTER TABLE community_events
    ADD CONSTRAINT community_events_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Add indexes for performance (IF NOT EXISTS is built into CREATE INDEX)
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_community_events_slug ON community_events(slug);

-- Function to generate a slug from text
CREATE OR REPLACE FUNCTION generate_slug(input_text text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special characters
  result := lower(input_text);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(both '-' from result);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique community slug
CREATE OR REPLACE FUNCTION generate_unique_community_slug(input_text text, existing_id uuid DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
  slug_exists boolean;
BEGIN
  -- Generate base slug
  base_slug := generate_slug(input_text);
  final_slug := base_slug;
  
  -- Check if slug exists in communities table
  LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM communities WHERE slug = %L', final_slug) ||
           CASE WHEN existing_id IS NOT NULL THEN format(' AND id != %L)', existing_id)
                ELSE ')'
           END
    INTO slug_exists;
    
    EXIT WHEN NOT slug_exists;
    
    -- If slug exists, append a counter
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique username
CREATE OR REPLACE FUNCTION generate_unique_username(input_text text, existing_id uuid DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
  slug_exists boolean;
BEGIN
  -- Generate base slug
  base_slug := generate_slug(input_text);
  final_slug := base_slug;
  
  -- Check if username exists in profiles table
  LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM profiles WHERE username = %L', final_slug) ||
           CASE WHEN existing_id IS NOT NULL THEN format(' AND id != %L)', existing_id)
                ELSE ')'
           END
    INTO slug_exists;
    
    EXIT WHEN NOT slug_exists;
    
    -- If username exists, append a counter
    counter := counter + 1;
    final_slug := base_slug || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique event slug
CREATE OR REPLACE FUNCTION generate_unique_event_slug(input_text text, existing_id uuid DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
  slug_exists boolean;
BEGIN
  -- Generate base slug
  base_slug := generate_slug(input_text);
  final_slug := base_slug;
  
  -- Check if slug exists in community_events table
  LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM community_events WHERE slug = %L', final_slug) ||
           CASE WHEN existing_id IS NOT NULL THEN format(' AND id != %L)', existing_id)
                ELSE ')'
           END
    INTO slug_exists;
    
    EXIT WHEN NOT slug_exists;
    
    -- If slug exists, append a counter
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing communities
DO $$
DECLARE
  community_record RECORD;
BEGIN
  FOR community_record IN SELECT id, name FROM communities WHERE slug IS NULL LOOP
    UPDATE communities
    SET slug = generate_unique_community_slug(community_record.name, community_record.id)
    WHERE id = community_record.id;
  END LOOP;
END $$;

-- Generate usernames for existing profiles
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id, full_name, email FROM profiles WHERE username IS NULL LOOP
    -- Try to use the first part of the email as username
    UPDATE profiles
    SET username = generate_unique_username(split_part(profile_record.email, '@', 1), profile_record.id)
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Generate slugs for existing events
DO $$
DECLARE
  event_record RECORD;
BEGIN
  FOR event_record IN SELECT id, title FROM community_events WHERE slug IS NULL LOOP
    UPDATE community_events
    SET slug = generate_unique_event_slug(event_record.title, event_record.id)
    WHERE id = event_record.id;
  END LOOP;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_community_slug ON communities;
DROP TRIGGER IF EXISTS set_event_slug ON community_events;

-- Community slug trigger
CREATE OR REPLACE FUNCTION generate_community_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_community_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_community_slug
BEFORE INSERT ON communities
FOR EACH ROW
EXECUTE FUNCTION generate_community_slug();

-- Event slug trigger
CREATE OR REPLACE FUNCTION generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_event_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_event_slug
BEFORE INSERT ON community_events
FOR EACH ROW
EXECUTE FUNCTION generate_event_slug();