/*
  # Enable Vector Extension and Create User Interest Vectors Table
  
  1. New Features
    - Enables PostgreSQL vector extension if not already enabled
    - Creates user_interest_vectors table with embedding column for semantic search
  
  2. Changes
    - Adds vector(1536) column for storing OpenAI embeddings
    - Sets up primary key reference to auth.users with cascade delete
    - Includes updated_at timestamp for tracking changes
*/

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create or alter user_interest_vectors table to include embedding column
CREATE TABLE IF NOT EXISTS user_interest_vectors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_vector vector(1536),
  updated_at timestamptz DEFAULT now()
);

-- Add embedding column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_interest_vectors' AND column_name = 'interest_vector'
  ) THEN
    ALTER TABLE user_interest_vectors ADD COLUMN interest_vector vector(1536);
  END IF;
END $$;

-- Create index on interest_vector for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_user_interest_vectors_embedding 
ON user_interest_vectors USING ivfflat (interest_vector vector_cosine_ops);

-- Add function to calculate vector cosine similarity if it doesn't exist
CREATE OR REPLACE FUNCTION vector_cosine_similarity(a vector, b vector)
RETURNS float
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 1 - (a <=> b);
END;
$$;