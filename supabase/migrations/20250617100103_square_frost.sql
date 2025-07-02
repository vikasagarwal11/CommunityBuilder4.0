/*
  # Add is_active and knowledge_transfer fields to AI community profiles

  1. New Fields
    - `is_active` (boolean) - Indicates if the AI profile is active
    - `deactivated_at` (timestamp) - When the profile was deactivated
    - `knowledge_transfer_enabled` (boolean) - Whether insights can be used for other communities
    - `anonymized_insights` (jsonb) - Stores anonymized insights for knowledge transfer

  2. Changes
    - Adds these fields to the ai_community_profiles table
    - Sets default values for is_active and knowledge_transfer_enabled
*/

-- Add is_active field with default true
ALTER TABLE ai_community_profiles 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add deactivated_at timestamp
ALTER TABLE ai_community_profiles 
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone DEFAULT NULL;

-- Add knowledge transfer fields
ALTER TABLE ai_community_profiles 
ADD COLUMN IF NOT EXISTS knowledge_transfer_enabled boolean DEFAULT false;

ALTER TABLE ai_community_profiles 
ADD COLUMN IF NOT EXISTS anonymized_insights jsonb DEFAULT NULL;