/*
  # Fix AI Generation Logs RLS Policies

  1. Security Updates
    - Add INSERT policy for authenticated users to log AI generation attempts
    - Ensure users can only insert logs for their own operations
    - Maintain existing SELECT policies for community admins

  2. Changes
    - Add policy for authenticated users to insert their own AI generation logs
    - Update existing policies to ensure proper access control
*/

-- Add INSERT policy for ai_generation_logs table
CREATE POLICY "Users can insert their own AI generation logs"
  ON ai_generation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Add INSERT policy for service role (for edge functions)
CREATE POLICY "Service role can insert AI generation logs"
  ON ai_generation_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure the table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_by 
  ON ai_generation_logs(created_by);

-- Add a policy for users to view their own logs
CREATE POLICY "Users can view their own AI generation logs"
  ON ai_generation_logs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());