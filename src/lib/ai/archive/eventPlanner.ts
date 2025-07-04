/**
 * Creates a community event *if* the user message was classified as ‘create_event’.
 * Returns the inserted row (or null if no event was created).
 *
 * All writes are still client-side for now – in prod move to an Edge-Function.
 */
import { supabase } from '../supabase';
import { detectIntent } from './intentDetector';

export async function maybeCreateEvent(
  message: string,
  communityId: string,
  userId: string,
) {
  const detection = await detectIntent(message);
  if (detection.intent !== 'create_event' || detection.confidence < 0.6) {
    return null;
  }

  const {
    title        = 'Untitled Event',
    description  = message,
    date,
    time,
    location,
    capacity,
  } = detection.entities;

  const start_time = date ? `${date}T${time ?? '09:00'}:00Z` : null;

  const { data, error } = await supabase
    .from('community_events')
    .insert({
      community_id  : communityId,
      created_by    : userId,
      title,
      description,
      start_time,
      location,
      capacity,
      ai_generated  : true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}