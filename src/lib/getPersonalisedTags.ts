/* ------------------------------------------------------------------
 * Return 10 tags that make sense for the current visitor
 *  1) Tags from personalized-recommendations Edge Function (signed-in)
 *  2) Tags from get_personalised_tags RPC (signed-in)
 *  3) Tags of events the user RSVP'd “going” (signed-in)
 *  4) Tags of communities the user is a member of (signed-in)
 *  5) Fall-back: 10 most common tags in upcoming/past events
 * -----------------------------------------------------------------*/
import { supabase } from './supabase';

type EventLite = { tags?: string[] | null };

export default async function getPersonalisedTags({
  uid,
  communityId,
  upcoming,
  past,
}: {
  uid: string | null;
  communityId: string | null;
  upcoming: EventLite[];
  past: EventLite[];
}): Promise<string[]> {
  try {
    let tags: string[] = [];

    if (uid) {
      // Fetch from personalized-recommendations Edge Function
      const { data: recData, error: recError } = await supabase.functions.invoke('personalized-recommendations', {
        body: JSON.stringify({ user_id: uid, community_id: communityId, recommendation_type: 'all' }),
      });
      if (!recError && recData?.recommendations?.suggested_tags) {
        tags = [...tags, ...recData.recommendations.suggested_tags];
      }

      // Fetch from get_personalised_tags RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_personalised_tags', {
        user_uuid: uid,
        community_uuid: communityId,
      });
      if (!rpcError && rpcData?.length) {
        tags = [...tags, ...rpcData.map((r: any) => r.tag)];
      }

      // Fetch RSVP'd event tags
      const { data: rsvpData } = await supabase
        .from('event_rsvps')
        .select('community_events(tags)')
        .eq('user_id', uid)
        .eq('status', 'going');
      if (rsvpData) {
        tags = [...tags, ...rsvpData.flatMap((r: any) => r.community_events?.tags || [])];
      }

      // Fetch community tags
      const { data: communityData } = await supabase
        .from('community_members')
        .select('communities(tags)')
        .eq('user_id', uid);
      if (communityData) {
        tags = [...tags, ...communityData.flatMap((c: any) => c.communities?.tags || [])];
      }

      // Deduplicate and limit to 10
      tags = [...new Set(tags)].slice(0, 10);
      if (tags.length > 0) return tags;
    }

    // Fallback for anonymous users or empty results
    const freq: Record<string, number> = {};
    [...upcoming, ...past].forEach((ev) =>
      ev.tags?.forEach((t) => {
        freq[t] = (freq[t] ?? 0) + 1;
      }),
    );

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t);
  } catch (error) {
    console.error('Error fetching personalized tags:', error);
    return [];
  }
}