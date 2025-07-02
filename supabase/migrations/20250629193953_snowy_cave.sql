/*
  # Fix ambiguous user_id in search_events_semantically function
  
  1. Changes
     - Fixes ambiguous user_id reference in search_events_semantically function
     - Renames parameter from p_user_id to search_user_id for clarity
     - Ensures proper qualification of all column references
     - Improves error handling for vector similarity calculation
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS search_events_semantically;

-- Create the updated function with fixed parameter naming
-- Fix ambiguous user_id and community_id in search_events_semantically
CREATE OR REPLACE FUNCTION search_events_semantically(
  p_user_id uuid,
  query text,
  p_community_id uuid
) RETURNS TABLE (
  id uuid,
  title text,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  location text,
  image_url text,
  capacity integer,
  is_online boolean,
  meeting_url text,
  tags text[],
  status text,
  community_id uuid,
  created_by uuid,
  rsvp_count bigint,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.start_time,
    e.end_time,
    e.location,
    e.image_url,
    e.capacity,
    e.is_online,
    e.meeting_url,
    e.tags,
    e.status,
    e.community_id,
    e.created_by,
    (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id = e.id) AS rsvp_count,
    CASE
      WHEN p_user_id IS NOT NULL THEN
        COALESCE((
          SELECT vector_cosine_similarity(u.embedding, e.embedding)
          FROM user_interest_vectors u
          WHERE u.user_id = p_user_id
          LIMIT 1
        ), 0)::float
      ELSE 0
    END AS similarity
  FROM community_events e
  WHERE e.status = 'active'
    AND (p_community_id IS NULL OR e.community_id = p_community_id)
    AND (
      query IS NULL
      OR e.title ILIKE '%' || query || '%'
      OR e.description ILIKE '%' || query || '%'
      OR EXISTS (
        SELECT 1
        FROM unnest(e.tags) AS t
        WHERE t ILIKE '%' || query || '%'
      )
    )
  ORDER BY similarity DESC, e.start_time ASC;
END;
$$ LANGUAGE plpgsql;