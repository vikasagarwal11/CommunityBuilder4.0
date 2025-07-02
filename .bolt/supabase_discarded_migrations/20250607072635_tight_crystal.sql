-- Create default community after ensuring we have a proper admin user

-- First, let's create a system user for the default community
-- We'll use a special function to handle this

DO $$
DECLARE
  system_user_id uuid;
  default_community_id uuid;
BEGIN
  -- Check if we already have a default community
  SELECT id INTO default_community_id FROM public.communities WHERE is_default = true;
  
  -- Only create if it doesn't exist
  IF default_community_id IS NULL THEN
    -- Create the default community with a NULL created_by for now
    INSERT INTO public.communities (name, description, is_default, created_by)
    VALUES (
      'Global Hub',
      'Welcome to MomFit! This is our global community where all members can connect, share experiences, and support each other on their fitness journey.',
      true,
      NULL  -- We'll update this when we have real users
    )
    RETURNING id INTO default_community_id;
    
    RAISE LOG 'Created default community with ID: %', default_community_id;
  END IF;
END $$;

-- Update the communities table to allow NULL created_by temporarily for the default community
ALTER TABLE public.communities ALTER COLUMN created_by DROP NOT NULL;

-- Add a constraint to ensure only the default community can have NULL created_by
ALTER TABLE public.communities ADD CONSTRAINT check_created_by_null_only_for_default 
  CHECK (
    (is_default = true AND created_by IS NULL) OR 
    (is_default = false AND created_by IS NOT NULL) OR
    (is_default IS NULL AND created_by IS NOT NULL)
  );

COMMENT ON TABLE public.communities IS 'Communities table - default community can have NULL created_by';