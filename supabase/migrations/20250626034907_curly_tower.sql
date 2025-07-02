/*
  # Add get_community_member_counts function and update posts table

  1. New Functions
    - `get_community_member_counts`: Returns member counts for specified communities
  
  2. Changes
    - Update `posts` table to include cascade delete for community_id reference
*/

-- Create function to get community member counts
CREATE OR REPLACE FUNCTION get_community_member_counts(community_ids uuid[])
RETURNS TABLE (community_id uuid, member_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.community_id, COUNT(*) AS member_count
  FROM community_members cm
  WHERE cm.community_id = ANY(community_ids)
  GROUP BY cm.community_id;
END;
$$ LANGUAGE plpgsql;

-- Check if posts table exists and create or update it
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
    -- Table exists, check if we need to update the foreign key
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'posts' 
      AND ccu.table_name = 'communities'
      AND tc.constraint_name LIKE '%cascade%'
    ) THEN
      -- Drop existing foreign key
      ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_community_id_fkey;
      
      -- Add new foreign key with cascade delete
      ALTER TABLE posts 
        ADD CONSTRAINT posts_community_id_fkey 
        FOREIGN KEY (community_id) 
        REFERENCES communities(id) 
        ON DELETE CASCADE;
    END IF;
  ELSE
    -- Create posts table
    CREATE TABLE posts (
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
      created_at timestamp with time zone DEFAULT now(),
      content text,
      user_id uuid REFERENCES profiles(id)
    );
    
    -- Enable row level security
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for read access
    CREATE POLICY "Allow read access to posts" ON posts FOR SELECT USING (true);
  END IF;
END
$$;