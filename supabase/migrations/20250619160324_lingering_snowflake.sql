/*
  # Fix AI Generation Logs Foreign Key Constraint

  1. Changes
    - Modify the community_id column to be nullable
    - Drop the existing foreign key constraint
    - Add a new foreign key constraint that allows NULL values
    - This allows logging AI operations that aren't tied to a specific community

  This migration addresses the error: "insert or update on table "ai_generation_logs" violates foreign key constraint "ai_generation_logs_community_id_fkey"
*/

-- First, drop the existing foreign key constraint
ALTER TABLE IF EXISTS public.ai_generation_logs
DROP CONSTRAINT IF EXISTS ai_generation_logs_community_id_fkey;

-- Make sure the community_id column is nullable (if it's not already)
ALTER TABLE IF EXISTS public.ai_generation_logs
ALTER COLUMN community_id DROP NOT NULL;

-- Add the foreign key constraint back, but with ON DELETE CASCADE
ALTER TABLE IF EXISTS public.ai_generation_logs
ADD CONSTRAINT ai_generation_logs_community_id_fkey
FOREIGN KEY (community_id)
REFERENCES communities(id)
ON DELETE CASCADE;

-- Update the index for community_id to handle NULL values
DROP INDEX IF EXISTS idx_ai_generation_logs_community_id;
CREATE INDEX idx_ai_generation_logs_community_id ON public.ai_generation_logs(community_id) WHERE community_id IS NOT NULL;