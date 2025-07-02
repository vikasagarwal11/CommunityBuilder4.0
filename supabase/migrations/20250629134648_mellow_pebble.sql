/*
  Fix Semantic Event Search Function
  - Drops existing search_events_semantically function to resolve issues
  - Creates improved version with:
    - Computed rsvp_count (bigint) via subquery since column does not exist
    - Correct similarity ordering (DESC)
    - Community context via ai_community_profiles
  - Grants execute permission to authenticated users
*/

-- Drop existing search_events_semantically function
DROP FUNCTION IF EXISTS search_events_semantically(uuid, text, uuid);

-- Create improved function for semantic event search
CREATE OR REPLACE FUNCTION search_events_semantically(user_id uuid, query text, community_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  tags text[],
  rsvp_count bigint,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Generate embedding for the query text if provided
  IF query != '' THEN
    SELECT INTO query_embedding (
      SELECT (data->'data'->0->>'embedding')::vector(1536)
      FROM http_post(
        'https://api.openai.com/v1/embeddings',
        jsonb_build_object(
          'model', 'text-embedding-ada-002',
          'input', query
        )::jsonb,
        'application/json',
        ARRAY[ARRAY['Authorization', 'Bearer ' || current_setting('app.openai_api_key', true)]]
      )
    );
  END IF;

  -- Return events sorted by similarity
  RETURN QUERY
  SELECT
    ce.id,
    ce.title,
    ce.description,
    ce.tags,
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id = ce.id AND status = 'going') AS rsvp_count,
    CASE
      WHEN query != '' THEN
        (SELECT embedding FROM event_embeddings WHERE event_id = ce.id) <=> query_embedding
      ELSE
        (SELECT embedding FROM event_embeddings WHERE event_id = ce.id) <=> (
          SELECT interest_vector FROM user_interest_vectors WHERE user_id = $1
        )
    END AS similarity
  FROM community_events ce
  JOIN ai_community_profiles acp ON ce.community_id = acp.community_id
  WHERE ce.start_time >= now()
    AND (community_id IS NULL OR ce.community_id = community_id)
    AND (array_length(ce.tags, 1) > 0 AND ce.tags && acp.event_types)
    AND EXISTS (SELECT 1 FROM event_embeddings ee WHERE ee.event_id = ce.id)
  ORDER BY similarity DESC
  LIMIT 50;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_events_semantically(uuid, text, uuid) TO authenticated;