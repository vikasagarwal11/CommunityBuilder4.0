/*
  # Create get_personalised_tags function

  1. New Functions
    - `get_personalised_tags`: Returns personalized tags for a user based on their event RSVPs and community memberships
  
  2. Changes
    - Creates a new SQL function that returns a table of tags
    - Function aggregates tags from events the user has RSVP'd to and communities they belong to
    - Results are ordered by frequency and limited to 10 tags
*/

-- Drop the function if it exists to ensure clean recreation
drop function if exists public.get_personalised_tags(uuid);

-- Create the function to return personalized tags for a user
create or replace function public.get_personalised_tags(uid uuid)
returns table(tag text)
language sql
as $$
  with rsvp_tags as (
    select unnest(community_events.tags) as tag
    from event_rsvps
    join community_events on event_rsvps.event_id = community_events.id
    where event_rsvps.user_id = uid
      and event_rsvps.status = 'going'
  ),
  community_tags as (
    select unnest(c.tags) as tag
    from community_members cm
    join communities c on cm.community_id = c.id
    where cm.user_id = uid
  ),
  all_tags as (
    select rt.tag from rsvp_tags rt
    union all
    select ct.tag from community_tags ct
  )
  select all_tags.tag
  from all_tags
  group by all_tags.tag
  order by count(*) desc
  limit 10;
$$;