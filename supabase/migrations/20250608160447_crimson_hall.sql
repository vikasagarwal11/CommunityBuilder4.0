/*
  # Fix user_roles foreign key relationship

  1. Database Changes
    - Add missing foreign key constraint from user_roles.role_id to roles.id
    - This will allow Supabase PostgREST to properly join these tables

  2. Security
    - No changes to existing RLS policies
    - Maintains current security model
*/

-- Add the missing foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_role_id_fkey' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE user_roles 
    ADD CONSTRAINT user_roles_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
  END IF;
END $$;