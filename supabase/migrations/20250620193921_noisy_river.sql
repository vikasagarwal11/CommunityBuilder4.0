/*
  # Update AI Interactions Constraint

  1. Changes
     - Modifies the constraint on the interaction_type column to include 'chat' as a valid type
     - Existing constraint only allowed 'analysis', 'suggestion', 'insight', and 'moderation'
     - This change enables tracking of AI chat interactions in the system
*/

ALTER TABLE public.ai_interactions
DROP CONSTRAINT ai_interactions_interaction_type_check;

ALTER TABLE public.ai_interactions
ADD CONSTRAINT ai_interactions_interaction_type_check
CHECK (interaction_type = ANY (ARRAY[
  'analysis'::text,
  'suggestion'::text,
  'insight'::text,
  'moderation'::text,
  'chat'::text
]));