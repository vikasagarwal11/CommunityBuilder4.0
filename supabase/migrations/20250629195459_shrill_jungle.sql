-- Rename interest_vector to embedding in user_interest_vectors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_interest_vectors' AND column_name = 'interest_vector'
  ) THEN
    ALTER TABLE user_interest_vectors RENAME COLUMN interest_vector TO embedding;
  END IF;
END $$;

-- Recreate index on embedding column
DROP INDEX IF EXISTS idx_user_interest_vectors_embedding;
CREATE INDEX IF NOT EXISTS idx_user_interest_vectors_embedding 
ON user_interest_vectors USING ivfflat (embedding vector_cosine_ops);