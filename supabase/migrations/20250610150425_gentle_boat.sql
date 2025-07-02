/*
  # Diagnostic and Fix for message_tags Schema
  1. Verify Current Schema
     - Confirm existing columns
  2. Add Missing Columns
     - Add notes column if not present
  3. Clean Up Redundant Foreign Keys
     - Standardize to profiles(id) references
  4. Test Joins Safely
     - Use dynamic SQL to handle missing columns
*/

-- Step 1: Verify Current Schema
DO $$
DECLARE
  col_record RECORD;
  has_notes BOOLEAN := FALSE;
BEGIN
  FOR col_record IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'message_tags'
  LOOP
    IF col_record.column_name = 'notes' THEN
      has_notes := TRUE;
    END IF;
  END LOOP;
  RAISE LOG 'Current message_tags columns checked. Notes exists: %', has_notes;
END $$;

-- Step 2: Add Missing Columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'message_tags'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.message_tags
    ADD COLUMN notes TEXT;
    RAISE LOG 'Added notes column to message_tags';
  END IF;
END $$;

-- Step 3: Clean Up Redundant Foreign Keys
DO $$
BEGIN
  -- Drop redundant auth.users references
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'message_tags_tagged_by_fkey'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags DROP CONSTRAINT message_tags_tagged_by_fkey;
    RAISE LOG 'Dropped redundant message_tags_tagged_by_fkey';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'message_tags_tagged_user_id_fkey'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags DROP CONSTRAINT message_tags_tagged_user_id_fkey;
    RAISE LOG 'Dropped redundant message_tags_tagged_user_id_fkey';
  END IF;

  -- Verify and keep profiles-based constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_message_tags_tagged_user_profiles'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags
    ADD CONSTRAINT fk_message_tags_tagged_user_profiles
    FOREIGN KEY (tagged_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE LOG 'Reapplied fk_message_tags_tagged_user_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_message_tags_tagged_by_profiles'
    AND table_name = 'message_tags'
  ) THEN
    ALTER TABLE message_tags
    ADD CONSTRAINT fk_message_tags_tagged_by_profiles
    FOREIGN KEY (tagged_by) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE LOG 'Reapplied fk_message_tags_tagged_by_profiles';
  END IF;
END $$;

-- Step 4: Test Joins Safely
DO $$
DECLARE
  test_query TEXT;
  test_result RECORD;
BEGIN
  -- Dynamic query with COALESCE for notes
  test_query := 'SELECT mt.id, mt.tag_type, mt.status, mt.due_date' ||
                ', COALESCE(mt.notes, ''N/A'') as notes' ||
                ', p1.full_name as tagged_user_name' ||
                ', p2.full_name as tagged_by_name' ||
                ' FROM message_tags mt' ||
                ' LEFT JOIN profiles p1 ON mt.tagged_user_id = p1.id' ||
                ' LEFT JOIN profiles p2 ON mt.tagged_by = p2.id' ||
                ' LIMIT 1';

  FOR test_result IN EXECUTE test_query LOOP
    RAISE LOG 'Join test successful: id=%, tag_type=%', test_result.id, test_result.tag_type;
  END LOOP;

  RAISE LOG 'All join tests completed successfully';
END $$;

-- Step 5: Ensure Indexes
CREATE INDEX IF NOT EXISTS idx_message_tags_message_id ON public.message_tags USING btree (message_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_message_tags_tagged_user_id ON public.message_tags USING btree (tagged_user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_message_tags_tagged_by ON public.message_tags USING btree (tagged_by) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_message_tags_status ON public.message_tags USING btree (status) TABLESPACE pg_default;