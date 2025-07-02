/*
  # Add semantic search function for events

  1. New Functions
    - `search_events_semantically` - Function to search events using vector similarity
      - Allows searching by user interest vector or by text query
      - Returns events ranked by similarity to the query or user interests
      - Includes event details and similarity score

  2. Security
    - Function is marked as security definer to access OpenAI API key
    - Execute permission granted to authenticated users
*/

-- Create function to search events using semantic similarity
CREATE OR REPLACE FUNCTION search_events_semantically(user_id uuid, query text, community_id uuid)
RETURNS TABLE (id uuid, title text, description text, tags text[], rsvp_count bigint, similarity float)
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
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id = ce.id AND status = 'going') as rsvp_count,
    CASE
      -- If query provided, compare event embedding to query embedding
      WHEN query != '' THEN 
        (SELECT ee.embedding <=> query_embedding 
         FROM event_embeddings ee 
         WHERE ee.event_id = ce.id)
      -- Otherwise compare to user's interest vector
      ELSE 
        (SELECT ee.embedding <=> uiv.interest_vector 
         FROM event_embeddings ee, user_interest_vectors uiv 
         WHERE ee.event_id = ce.id AND uiv.user_id = $1)
    END AS similarity
  FROM 
    community_events ce
  WHERE 
    ce.start_time >= now()
    AND (community_id IS NULL OR ce.community_id = community_id)
    -- Only include events that have embeddings
    AND EXISTS (SELECT 1 FROM event_embeddings ee WHERE ee.event_id = ce.id)
  ORDER BY 
    similarity ASC
  LIMIT 50;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_events_semantically(uuid, text, uuid) TO authenticated;