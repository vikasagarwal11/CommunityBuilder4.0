/*
  # Drop and recreate get_personalised_tags function
  
  1. Changes
    - Drops the existing get_personalised_tags function that takes only one parameter (uid uuid)
    - This fixes conflicts with the newer version of the function that takes two parameters
  
  This migration ensures we only have one version of the function with the correct signature.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'get_personalised_tags'
      AND pronargs = 1
      AND pg_get_function_arguments(oid) = 'uid uuid'
  ) THEN
    DROP FUNCTION get_personalised_tags(uuid);
  END IF;
END $$;