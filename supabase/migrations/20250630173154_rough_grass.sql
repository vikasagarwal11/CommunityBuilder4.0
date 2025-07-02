/*
  # Drop old get_personalised_tags function
  
  1. Changes
    - Drops the old version of get_personalised_tags function that takes only one parameter (uid uuid)
    - This resolves conflicts with the newer version that takes two parameters
    - Allows the application to properly use the newer function with community filtering
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