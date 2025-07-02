/*
  # Update AI generation logs policies

  1. Security
    - Update RLS policies on `ai_generation_logs` table to allow service role to insert logs
    - Add policy for users to insert their own logs
*/

-- Update policies for ai_generation_logs
DROP POLICY IF EXISTS "Service role can insert AI generation logs" ON ai_generation_logs;
CREATE POLICY "Service role can insert AI generation logs"
  ON ai_generation_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert their own AI generation logs" ON ai_generation_logs;
CREATE POLICY "Users can insert their own AI generation logs"
  ON ai_generation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());