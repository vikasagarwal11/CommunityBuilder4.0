/*
  # Recreate Personalised Tags Function

  1. New Functions
     - Creates a new `get_personalised_tags` function with two parameters
     - Allows fetching personalized tags for a user, optionally filtered by community

  This function returns tags from events the user has RSVP'd to as "going",
  sorted by frequency and limited to the top 10 most relevant tags.
*/

CREATE OR REPLACE FUNCTION get_personalised_tags(
  user_uuid UUID,
  community_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  tag TEXT,
  count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH event_tags AS (
    SELECT 
      UNNEST(ce.tags) AS tag
    FROM 
      event_rsvps er
    JOIN 
      community_events ce ON er.event_id = ce.id
    WHERE 
      er.user_id = user_uuid
      AND er.status = 'going'
      AND (community_uuid IS NULL OR ce.community_id = community_uuid)
  )
  SELECT 
    et.tag,
    COUNT(*) AS count
  FROM 
    event_tags et
  GROUP BY 
    et.tag
  ORDER BY 
    count DESC
  LIMIT 10;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION get_personalised_tags(UUID, UUID) IS 'Returns personalized tags for a user based on their event RSVPs, optionally filtered by community';