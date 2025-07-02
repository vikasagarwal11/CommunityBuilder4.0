/*
  # Add message reactions policies

  1. New Policies
    - Add INSERT policy for users to add reactions
    - Add SELECT policy for users to view their reactions
  
  These policies ensure users can add reactions to messages and view their own reactions.
*/

-- Check if the INSERT policy already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_reactions'
    AND policyname = 'Users can add reactions'
  ) THEN
    CREATE POLICY "Users can add reactions" ON public.message_reactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Check if the SELECT policy already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_reactions'
    AND policyname = 'Users can view their reactions'
  ) THEN
    CREATE POLICY "Users can view their reactions" ON public.message_reactions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;