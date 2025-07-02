-- Reapply search_events_semantically (20250629200325_shrill_unit)
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
          SELECT vector_cosine_similarity(u.embedding, ee.embedding)
          FROM user_interest_vectors u
          LEFT JOIN event_embeddings ee ON ee.event_id = e.id
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

-- Reapply trigger_user_vector_update (20250629202716_autumn_disk)
CREATE OR REPLACE FUNCTION trigger_user_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM custom_http_post(
    'https://ljbporcqpceilywexaod.supabase.co/functions/v1/generate-user-interest-vector',
    jsonb_build_object(
      'user_id', COALESCE(NEW.user_id, NEW.id),
      'community_id', NEW.community_id
    ),
    'application/json'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating user interest vector: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger_user_vector_update trigger (adjust table_name as needed)
DROP TRIGGER IF EXISTS trigger_user_vector_update ON profiles; -- Replace 'profiles' with the correct table if different
CREATE TRIGGER trigger_user_vector_update
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_user_vector_update();