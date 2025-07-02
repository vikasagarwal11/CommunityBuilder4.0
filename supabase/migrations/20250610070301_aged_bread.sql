/*
  # Add missing foreign key relationships for message tables

  1. New Foreign Keys
    - `message_reactions.user_id` → `profiles.id`
    - `message_tags.tagged_user_id` → `profiles.id` 
    - `message_tags.tagged_by` → `profiles.id`

  2. Security
    - These relationships will allow PostgREST to perform joins between message tables and profiles
    - Enables frontend queries to fetch user profile data alongside reactions and tags

  3. Changes
    - Add foreign key constraint from message_reactions to profiles
    - Add foreign key constraint from message_tags tagged_user_id to profiles
    - Add foreign key constraint from message_tags tagged_by to profiles
*/

-- Add foreign key relationship between message_reactions and profiles
ALTER TABLE public.message_reactions
ADD CONSTRAINT fk_message_reactions_user_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key relationship between message_tags tagged_user_id and profiles
ALTER TABLE public.message_tags
ADD CONSTRAINT fk_message_tags_tagged_user_profiles
FOREIGN KEY (tagged_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key relationship between message_tags tagged_by and profiles
ALTER TABLE public.message_tags
ADD CONSTRAINT fk_message_tags_tagged_by_profiles
FOREIGN KEY (tagged_by) REFERENCES public.profiles(id) ON DELETE CASCADE;