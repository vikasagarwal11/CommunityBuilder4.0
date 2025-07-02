/*
  # Create get_personalised_tags function

  1. New Functions
    - `get_personalised_tags(user_uuid, community_uuid)` - Returns personalized tags for a user in a community
      - Takes user_id and community_id as parameters
      - Returns JSONB array of personalized tags
      - Uses user preferences, interests, and community context
      - Includes AI-generated recommendations based on user activity

  2. Security
    - Function uses SECURITY DEFINER to access user data
    - Includes proper RLS checks for community membership
    - Returns empty array if user is not a community member
*/

CREATE OR REPLACE FUNCTION get_personalised_tags(
  user_uuid UUID,
  community_uuid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_interests TEXT[];
  user_custom_interests TEXT[];
  community_tags TEXT[];
  user_fitness_goals TEXT[];
  user_experience_level TEXT;
  user_age_range TEXT;
  user_location TEXT;
  recent_post_tags TEXT[];
  ai_recommendations JSONB;
  result_tags JSONB;
BEGIN
  -- Check if user is a member of the community
  IF NOT EXISTS (
    SELECT 1 FROM community_members 
    WHERE user_id = user_uuid AND community_id = community_uuid
  ) THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Get user profile data
  SELECT 
    interests, 
    custom_interests, 
    fitness_goals, 
    experience_level,
    age_range,
    location
  INTO 
    user_interests, 
    user_custom_interests, 
    user_fitness_goals, 
    user_experience_level,
    user_age_range,
    user_location
  FROM profiles 
  WHERE id = user_uuid;

  -- Get community tags
  SELECT tags INTO community_tags
  FROM communities 
  WHERE id = community_uuid;

  -- Get tags from user's recent posts in this community
  SELECT ARRAY_AGG(DISTINCT tag) INTO recent_post_tags
  FROM (
    SELECT unnest(
      CASE 
        WHEN (user_preferences->>'tags') IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text(user_preferences->'tags'))
        ELSE ARRAY[]::TEXT[]
      END
    ) AS tag
    FROM community_posts 
    WHERE user_id = user_uuid 
      AND community_id = community_uuid 
      AND created_at > NOW() - INTERVAL '30 days'
    LIMIT 50
  ) recent_tags
  WHERE tag IS NOT NULL;

  -- Get AI recommendations if available
  SELECT recommendations INTO ai_recommendations
  FROM user_recommendations
  WHERE user_id = user_uuid AND community_id = community_uuid
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Build personalized tags array
  WITH tag_sources AS (
    -- User interests
    SELECT unnest(COALESCE(user_interests, ARRAY[]::TEXT[])) AS tag, 'interest' AS source, 10 AS priority
    UNION ALL
    -- User custom interests
    SELECT unnest(COALESCE(user_custom_interests, ARRAY[]::TEXT[])) AS tag, 'custom_interest' AS source, 9 AS priority
    UNION ALL
    -- User fitness goals
    SELECT unnest(COALESCE(user_fitness_goals, ARRAY[]::TEXT[])) AS tag, 'fitness_goal' AS source, 8 AS priority
    UNION ALL
    -- Community tags
    SELECT unnest(COALESCE(community_tags, ARRAY[]::TEXT[])) AS tag, 'community' AS source, 7 AS priority
    UNION ALL
    -- Recent post tags
    SELECT unnest(COALESCE(recent_post_tags, ARRAY[]::TEXT[])) AS tag, 'recent_activity' AS source, 6 AS priority
    UNION ALL
    -- Experience level
    SELECT user_experience_level AS tag, 'experience' AS source, 5 AS priority
    WHERE user_experience_level IS NOT NULL
    UNION ALL
    -- Age range
    SELECT user_age_range AS tag, 'demographics' AS source, 4 AS priority
    WHERE user_age_range IS NOT NULL
    UNION ALL
    -- Location-based tags
    SELECT user_location AS tag, 'location' AS source, 3 AS priority
    WHERE user_location IS NOT NULL
    UNION ALL
    -- AI recommendations
    SELECT jsonb_array_elements_text(
      COALESCE(ai_recommendations->'suggested_tags', '[]'::JSONB)
    ) AS tag, 'ai_recommendation' AS source, 2 AS priority
    WHERE ai_recommendations IS NOT NULL
  ),
  ranked_tags AS (
    SELECT 
      tag,
      source,
      priority,
      ROW_NUMBER() OVER (PARTITION BY LOWER(tag) ORDER BY priority DESC) as rn
    FROM tag_sources
    WHERE tag IS NOT NULL 
      AND LENGTH(TRIM(tag)) > 0
      AND LENGTH(tag) <= 50
  ),
  final_tags AS (
    SELECT 
      jsonb_build_object(
        'tag', tag,
        'source', source,
        'priority', priority
      ) AS tag_obj
    FROM ranked_tags
    WHERE rn = 1
    ORDER BY priority DESC, tag
    LIMIT 20
  )
  SELECT jsonb_agg(tag_obj) INTO result_tags
  FROM final_tags;

  RETURN COALESCE(result_tags, '[]'::JSONB);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_personalised_tags(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_personalised_tags(UUID, UUID) IS 
'Returns personalized tags for a user in a specific community based on their profile, interests, activity, and AI recommendations';