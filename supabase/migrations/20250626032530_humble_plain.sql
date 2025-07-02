/*
  # Create Posts Table

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `community_id` (uuid, references communities)
      - `created_at` (timestamp with time zone)
      - `content` (text)
      - `user_id` (uuid, references profiles)
  2. Security
    - Enable RLS on `posts` table
    - Add policy for public read access to posts
*/

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  community_id uuid REFERENCES communities(id),
  created_at timestamp with time zone DEFAULT now(),
  content text,
  user_id uuid REFERENCES profiles(id)
);

-- Enable row level security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Allow read access to posts" ON posts 
  FOR SELECT 
  USING (true);