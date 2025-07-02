-- Drop existing foreign key constraint if it exists
ALTER TABLE user_interest_vectors
DROP CONSTRAINT IF EXISTS user_interest_vectors_community_id_fkey;

-- Add community_id column if not exists
ALTER TABLE user_interest_vectors
ADD COLUMN IF NOT EXISTS community_id UUID;

-- Add foreign key constraint
ALTER TABLE user_interest_vectors
ADD CONSTRAINT user_interest_vectors_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

-- Update primary key to be composite
ALTER TABLE user_interest_vectors
DROP CONSTRAINT IF EXISTS user_interest_vectors_pkey,
ADD CONSTRAINT user_interest_vectors_pkey PRIMARY KEY (user_id, community_id);