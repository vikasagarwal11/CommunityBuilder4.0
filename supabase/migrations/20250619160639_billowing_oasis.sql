/*
  # Fix AI Generation Logs Foreign Key Constraint

  1. Changes
    - Makes community_id column nullable
    - Drops existing foreign key constraint
    - Adds new foreign key constraint with ON DELETE CASCADE
    - Updates index to handle NULL values

  This migration fixes the issue where AI generation logs require a valid community_id,
  which prevents logging during community creation when the community doesn't exist yet.
*/

-- First, drop the existing foreign key constraint
ALTER TABLE IF EXISTS public.ai_generation_logs
DROP CONSTRAINT IF EXISTS ai_generation_logs_community_id_fkey;

-- Make sure the community_id column is nullable (it should already be, but just to be sure)
ALTER TABLE IF EXISTS public.ai_generation_logs
ALTER COLUMN community_id DROP NOT NULL;

-- Add the new foreign key constraint with ON DELETE CASCADE
ALTER TABLE IF EXISTS public.ai_generation_logs
ADD CONSTRAINT ai_generation_logs_community_id_fkey
FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

-- Drop and recreate the index to handle NULL values properly
DROP INDEX IF EXISTS idx_ai_generation_logs_community_id;
CREATE INDEX idx_ai_generation_logs_community_id ON public.ai_generation_logs USING btree (community_id) WHERE (community_id IS NOT NULL);