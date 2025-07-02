-- 20250630_drop_single_arg_get_personalised_tags.sql
-- Drops get_personalised_tags(uuid) if (and only if) it exists.

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
