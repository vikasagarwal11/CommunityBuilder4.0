/*
  # Delete Duplicate Function

  1. Changes
     - Drops the `get_personalised_tags(uuid)` function if it exists
     - This fixes an issue where we have duplicate functions with the same name but different signatures

  This migration safely checks if the function exists with the specific signature before attempting to drop it.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'get_personalised_tags'
      AND pronargs = 1                -- exactly one argument
      AND pg_get_function_arguments(oid) = 'uid uuid'  -- argument name + type
  ) THEN
    DROP FUNCTION get_personalised_tags(uuid);
  END IF;
END $$;