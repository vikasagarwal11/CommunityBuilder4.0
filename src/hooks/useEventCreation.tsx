import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { EventData } from '../components/events/EventForm';

export function useEventCreation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = async (event: EventData): Promise<{ success: boolean; eventId?: string; error?: string }> => {
    setLoading(true);
    setError(null);
    try {
      if (!event.title || !event.start_time || !event.location) {
        throw new Error('Title, Date/Time, and Location are required.');
      }

      const { data, error: createError } = await supabase
        .from('community_events')
        .insert(event)
        .select()
        .single();
      if (createError) throw createError;

      await supabase.from('community_posts').insert({
        community_id: event.community_id,
        user_id: event.created_by,
        content: `📅 New event: "${event.title}" on ${new Date(event.start_time).toLocaleString()}. Check the Events tab for details!`,
        created_at: new Date().toISOString()
      });

      setLoading(false);
      return { success: true, eventId: data.id };
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return { createEvent, loading, error };
}