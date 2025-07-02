/*
  # Add aiFeedback column to ai_community_profiles table

  1. Changes
    - Add a new TEXT column called `aiFeedback` to the `ai_community_profiles` table
    - This column will store feedback from AI about the community profile
*/

-- Add the aiFeedback column to the ai_community_profiles table
ALTER TABLE ai_community_profiles
ADD COLUMN IF NOT EXISTS aiFeedback TEXT;