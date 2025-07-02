/*
  # Fix engagement functions

  1. Changes
     - Recreate `update_post_engagement_on_reaction` function and trigger
     - Add `increment_engagement` function for direct engagement increments

  2. Security
     - No security changes

  3. Details
     - Fixes the reaction trigger to properly update post engagement
     - Adds a utility function to increment engagement directly
*/

-- 1️⃣  remove old objects (safe if they already exist)
drop trigger if exists update_post_engagement_on_reaction_trigger
    on public.message_reactions;
drop function if exists public.update_post_engagement_on_reaction;

-- 2️⃣  re-create with new logic
create or replace function public.update_post_engagement_on_reaction()
returns trigger
language plpgsql
as $$
begin
  --------------------------------------------------------------------
  -- Only touch posts when the reaction belongs to a community post
  --------------------------------------------------------------------
  if (tg_op = 'INSERT') then
    if new.source_table = 'community_posts' then
      update community_posts
         set likes_count      = likes_count + 1,
             engagement_level = engagement_level + 1
       where id = new.source_id;
    end if;

  elsif (tg_op = 'DELETE') then
    if old.source_table = 'community_posts' then
      update community_posts
         set likes_count      = greatest(likes_count - 1, 0),
             engagement_level = greatest(engagement_level - 1, 0)
       where id = old.source_id;
    end if;
  end if;

  return null;  -- STATEMENT-level work only
end;
$$;

create trigger update_post_engagement_on_reaction_trigger
after insert or delete
on public.message_reactions
for each row
execute function public.update_post_engagement_on_reaction();

-- 3️⃣ Create increment_engagement function
create or replace function public.increment_engagement(
  message_id uuid,
  increment_by int default 1
) returns void
language plpgsql
as $$
begin
  update community_posts
     set engagement_level = engagement_level + increment_by
   where id = message_id;
end;
$$;