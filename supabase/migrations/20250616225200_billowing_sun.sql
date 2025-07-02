/*
  # Fix message reactions policies

  This migration checks if policies already exist before creating them to avoid errors.
*/

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_reactions'
    AND policyname = 'Users can add reactions to community messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can add reactions to community messages" 
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
    )';
  END IF;
END
$$;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_reactions'
    AND policyname = 'Users can view reactions on accessible messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view reactions on accessible messages" 
    ON public.message_reactions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM community_posts cp
        JOIN community_members cm ON cp.community_id = cm.community_id
        WHERE cp.id = message_reactions.message_id AND cm.user_id = auth.uid()
      )
    )';
  END IF;
END
$$;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_reactions'
    AND policyname = 'Users can delete their own reactions'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own reactions" 
    ON public.message_reactions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid())';
  END IF;
END
$$;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_reactions'
    AND policyname = 'Users can update their own reactions'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own reactions" 
    ON public.message_reactions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid())';
  END IF;
END
$$;