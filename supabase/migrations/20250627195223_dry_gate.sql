/*
  # Event Tags Index and Personalized Tags Function

  1. New Indexes
    - `idx_event_tags` on `community_events.tags` using GIN index for efficient array searching
  
  2. New Functions
    - `get_personalised_tags` function that returns personalized tags for a user based on:
      - Tags from events the user RSVP'd "going" to
      - Tags from communities the user is a member of
  
  3. Security
    - Grant execute permission on the function to anon role
*/

-- Create GIN index on community_events.tags if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_event_tags
ON public.community_events
USING gin (tags);

-- Create or replace the get_personalised_tags function
CREATE OR REPLACE FUNCTION public.get_personalised_tags(uid uuid)
RETURNS TABLE(tag text, hits int) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  /* 1️⃣ Tags from events the user RSVP'd "going" */
  WITH event_tags AS (
    SELECT unnest(ce.tags) AS tag
    FROM   event_rsvps er
    JOIN   community_events ce ON ce.id = er.event_id
    WHERE  er.user_id = uid
      AND  er.status  = 'going'          -- you can include 'maybe' if you wish
      AND  ce.tags    IS NOT NULL
  ),

  /* 2️⃣ Tags from communities the user is a member of */
  community_tags AS (
    SELECT unnest(c.tags) AS tag
    FROM   community_members cm
    JOIN   communities     c ON c.id = cm.community_id
    WHERE  cm.user_id = uid
      AND  c.tags     IS NOT NULL
  ),

  /* 3️⃣ Union + count frequency */
  combined AS (
    SELECT tag FROM event_tags
    UNION ALL
    SELECT tag FROM community_tags
  )

  SELECT tag, count(*) AS hits
  FROM combined
  GROUP BY tag
  ORDER BY hits DESC, tag
  LIMIT 10;
END;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION public.get_personalised_tags(uuid) TO anon;