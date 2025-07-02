/*
  # Soft Delete for AI Community Profiles with Knowledge Transfer

  1. New Fields
    - Added `is_active` boolean flag to mark profiles as inactive
    - Added `deactivated_at` timestamp to track deactivation time
    - Added `knowledge_transfer_enabled` flag to control insight sharing
    - Added `anonymized_insights` JSONB field for transferable knowledge
  
  2. Functions
    - Created function to handle soft deletion with knowledge transfer
    - Created trigger to automatically handle community deletions
    - Added functions to find similar communities and transfer insights
  
  3. Security
    - Updated policies to respect active status
    - Only platform admins can view inactive profiles
*/

-- Add new fields to ai_community_profiles table
ALTER TABLE public.ai_community_profiles 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS knowledge_transfer_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymized_insights jsonb DEFAULT NULL;

-- Create index on is_active for performance
CREATE INDEX IF NOT EXISTS idx_ai_community_profiles_is_active ON public.ai_community_profiles(is_active);

-- Create function to handle soft deletion and knowledge transfer
CREATE OR REPLACE FUNCTION public.soft_delete_ai_profile(
  profile_id uuid,
  enable_knowledge_transfer boolean DEFAULT false
) RETURNS void AS $$
DECLARE
  profile_data jsonb;
BEGIN
  -- Get the profile data for anonymization if knowledge transfer is enabled
  IF enable_knowledge_transfer THEN
    SELECT 
      jsonb_build_object(
        'purpose', purpose,
        'tone', tone,
        'target_audience', target_audience,
        'common_topics', common_topics,
        'event_types', event_types,
        'deactivated_at', NOW()
      ) INTO profile_data
    FROM public.ai_community_profiles
    WHERE id = profile_id;
  END IF;

  -- Update the profile
  UPDATE public.ai_community_profiles
  SET 
    is_active = false,
    deactivated_at = NOW(),
    knowledge_transfer_enabled = enable_knowledge_transfer,
    anonymized_insights = CASE WHEN enable_knowledge_transfer THEN profile_data ELSE NULL END
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle community deletion that also soft-deletes the AI profile
CREATE OR REPLACE FUNCTION public.handle_community_deletion() RETURNS TRIGGER AS $$
BEGIN
  -- When a community is marked as deleted, also mark its AI profile as inactive
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.ai_community_profiles
    SET 
      is_active = false,
      deactivated_at = NEW.deleted_at,
      -- Default to enabling knowledge transfer
      knowledge_transfer_enabled = true,
      anonymized_insights = jsonb_build_object(
        'purpose', purpose,
        'tone', tone,
        'target_audience', target_audience,
        'common_topics', common_topics,
        'event_types', event_types,
        'community_name', (SELECT name FROM public.communities WHERE id = NEW.id),
        'community_tags', (SELECT tags FROM public.communities WHERE id = NEW.id),
        'deactivated_at', NEW.deleted_at
      )
    WHERE community_id = NEW.id AND is_active = true;
  END IF;

  -- When a community is reactivated, also reactivate its AI profile
  IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    UPDATE public.ai_community_profiles
    SET 
      is_active = true,
      deactivated_at = NULL
    WHERE community_id = NEW.id AND is_active = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for community deletion
DROP TRIGGER IF EXISTS community_deletion_ai_profile_trigger ON public.communities;
CREATE TRIGGER community_deletion_ai_profile_trigger
  AFTER UPDATE OF deleted_at ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_community_deletion();

-- Update RLS policies to respect the active status
-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Community members can view AI profiles" ON public.ai_community_profiles;

-- Then create the new policy
CREATE POLICY "Community members can view AI profiles"
  ON public.ai_community_profiles
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true AND EXISTS (
      SELECT 1
      FROM community_members
      WHERE community_members.community_id = ai_community_profiles.community_id
      AND community_members.user_id = auth.uid()
    ))
    OR
    -- Platform admins can view all profiles including inactive ones
    (EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Platform Owner', 'Platform Admin')
    ))
  );

-- Create function to find similar communities for knowledge transfer
CREATE OR REPLACE FUNCTION public.find_similar_communities_for_knowledge_transfer(
  community_id uuid
) RETURNS TABLE (
  similar_community_id uuid,
  similarity_score float
) AS $$
DECLARE
  community_tags text[];
  community_name text;
BEGIN
  -- Get the community tags and name
  SELECT tags, name INTO community_tags, community_name
  FROM public.communities
  WHERE id = community_id;
  
  -- Return similar communities based on tag overlap
  RETURN QUERY
  SELECT 
    c.id AS similar_community_id,
    -- Calculate similarity score based on tag overlap
    (
      SELECT COUNT(*)::float / GREATEST(array_length(c.tags, 1), array_length(community_tags, 1))
      FROM unnest(c.tags) t1
      JOIN unnest(community_tags) t2 ON lower(t1) = lower(t2)
    ) AS similarity_score
  FROM public.communities c
  JOIN public.ai_community_profiles p ON c.id = p.community_id
  WHERE 
    c.id != community_id
    AND c.is_active = true
    AND c.deleted_at IS NULL
    AND p.knowledge_transfer_enabled = true
    -- Ensure there's at least some tag overlap
    AND EXISTS (
      SELECT 1
      FROM unnest(c.tags) t1
      JOIN unnest(community_tags) t2 ON lower(t1) = lower(t2)
    )
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get anonymized insights from similar communities
CREATE OR REPLACE FUNCTION public.get_knowledge_transfer_insights(
  community_id uuid
) RETURNS jsonb AS $$
DECLARE
  insights jsonb = '[]'::jsonb;
  similar_communities record;
BEGIN
  -- Find similar communities
  FOR similar_communities IN 
    SELECT * FROM public.find_similar_communities_for_knowledge_transfer(community_id)
    WHERE similarity_score > 0.3  -- Only use communities with decent similarity
  LOOP
    -- Get anonymized insights from similar communities
    SELECT insights || (
      SELECT anonymized_insights 
      FROM public.ai_community_profiles 
      WHERE community_id = similar_communities.similar_community_id
      AND knowledge_transfer_enabled = true
    ) INTO insights;
  END LOOP;
  
  RETURN insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;