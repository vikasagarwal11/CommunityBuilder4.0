/*
  # Fix Message Reactions Policies

  1. Security
    - Add policies for message_reactions table if they don't already exist
    - Ensure users can only add reactions to messages in communities they're members of
    - Allow users to view reactions on messages they can access
    - Allow users to delete and update their own reactions
*/

-- Check if policy exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_reactions' AND policyname = 'Users can add reactions to community messages'
  ) THEN
    -- Users can add reactions to community messages
    CREATE POLICY "Users can add reactions to community messages" 
    ON public.message_reactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cp.community_id = cm.community_id
        WHERE cp.id = message_reactions.message_id AND cm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Check if policy exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_reactions' AND policyname = 'Users can view reactions on accessible messages'
  ) THEN
    -- Users can view reactions on accessible messages
    CREATE POLICY "Users can view reactions on accessible messages" 
    ON public.message_reactions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cp.community_id = cm.community_id
        WHERE cp.id = message_reactions.message_id AND cm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Check if policy exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_reactions' AND policyname = 'Users can delete their own reactions'
  ) THEN
    -- Users can delete their own reactions
    CREATE POLICY "Users can delete their own reactions" 
    ON public.message_reactions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Check if policy exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_reactions' AND policyname = 'Users can update their own reactions'
  ) THEN
    -- Users can update their own reactions
    CREATE POLICY "Users can update their own reactions" 
    ON public.message_reactions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Make sure RLS is enabled on the table
ALTER TABLE IF EXISTS public.message_reactions ENABLE ROW LEVEL SECURITY;