/*
  # Add feedback column to ai_community_profiles table

  1. Changes
    - Add `feedback` column to `ai_community_profiles` table
    - Column is nullable text type to store AI feedback

  2. Security
    - No changes to existing RLS policies
    - Column inherits existing table permissions
*/

-- Add feedback column to ai_community_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_community_profiles' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE ai_community_profiles ADD COLUMN feedback text;
  END IF;
END $$;