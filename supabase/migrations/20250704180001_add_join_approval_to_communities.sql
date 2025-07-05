-- Migration: Add join_approval_required field to communities table
-- This enables hybrid join flow where communities can require admin approval
-- SAFE TO RUN MULTIPLE TIMES - Idempotent migration


-- Check if column exists before adding

DO $$
BEGIN
    -- Only add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'communities' 
        AND column_name = 'join_approval_required'
    ) THEN
        -- Add the join_approval_required column to communities table
        ALTER TABLE public.communities 
        ADD COLUMN join_approval_required boolean DEFAULT false;
        
        RAISE NOTICE 'Added join_approval_required column to communities table';
    ELSE
        RAISE NOTICE 'Column join_approval_required already exists, skipping...';
    END IF;
END $$;

-- Add a comment to document the field (safe to run multiple times)
COMMENT ON COLUMN public.communities.join_approval_required IS 'Whether this community requires admin approval for new members to join';

-- Update existing communities to have join_approval_required = false by default
-- This maintains backward compatibility and is safe to run multiple times
UPDATE public.communities 
SET join_approval_required = false 
WHERE join_approval_required IS NULL;

-- Verify the column was added successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'communities' 
        AND column_name = 'join_approval_required'
    ) THEN
        RAISE NOTICE 'Migration completed successfully: join_approval_required column is ready';
    ELSE
        RAISE EXCEPTION 'Migration failed: join_approval_required column was not created';
    END IF;
END $$; 