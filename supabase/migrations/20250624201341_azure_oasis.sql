/*
  # Add feedback column to ai_community_profiles table
  
  1. Changes
    - Add `feedback` column to `ai_community_profiles` table to store user feedback
*/

-- Add feedback column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_community_profiles' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE ai_community_profiles ADD COLUMN feedback text;
  END IF;
END $$;