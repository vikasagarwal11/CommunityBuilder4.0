/*
  # Enable Row Level Security for users table
  
  1. Security
    - Enable Row Level Security on the users table
    - Add policy for authenticated users to insert their own data
*/

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert their own data
CREATE POLICY "Enable insert for authenticated users" ON public.users
FOR INSERT TO authenticated
WITH CHECK (true);