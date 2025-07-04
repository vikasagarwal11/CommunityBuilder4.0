import { supabase } from '../../supabase';
import { intentDetectionService, DetectedIntent } from './intentDetection';

export interface EventDetails {
  title: string;
  description: string;
  date?: string;
  time?: string;
  location?: string;
  suggestedDuration?: number;
  suggestedCapacity?: number;
  tags?: string[];
  isOnline?: boolean;
  meetingUrl?: string;
}

export interface ScheduledEvent {
  id: string;
  community_id: string;
  created_by: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location?: string;
  capacity?: number;
  tags?: string[];
  is_online?: boolean;
  meeting_url?: string;
  ai_generated: boolean;
  created_at: string;
}

class EventSchedulerService {
  public async createEventFromIntent(
    intent: DetectedIntent,
    communityId: string,
    userId: string
  ): Promise<ScheduledEvent | null> {
    if (intent.intent !== 'create_event' || intent.confidence < 0.6) {
      return null;
    }

    const {
      title = 'Untitled Event',
      description,
      date,
      time,
      location,
      suggestedCapacity: capacity,
      suggestedDuration,
      tags,
      isOnline,
      meetingUrl
    } = intent.entities;

    // Calculate start and end times
    const startTime = date && time 
      ? new Date(`${date}T${time}:00Z`)
      : new Date();
    
    const endTime = suggestedDuration
      ? new Date(startTime.getTime() + suggestedDuration * 60000)
      : new Date(startTime.getTime() + 60 * 60000); // Default 1 hour

    try {
      const { data: event, error } = await supabase
        .from('community_events')
        .insert({
          community_id: communityId,
          created_by: userId,
          title,
          description: description || 'Community event',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location,
          capacity,
          tags,
          is_online: isOnline,
          meeting_url: meetingUrl,
          ai_generated: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create community post about the new event
      await this.createEventAnnouncement(event, communityId, userId);

      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      return null;
    }
  }

  public async createEventFromMessage(
    message: string,
    communityId: string,
    userId: string
  ): Promise<ScheduledEvent | null> {
    const intent = await intentDetectionService.detectIntent(message, { communityId, userId });
    return this.createEventFromIntent(intent, communityId, userId);
  }

  private async createEventAnnouncement(event: ScheduledEvent, communityId: string, userId: string): Promise<void> {
    try {
      const eventDate = new Date(event.start_time);
      const formattedDate = eventDate.toLocaleDateString();
      const formattedTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: userId,
          content: `📅 New event created: "${event.title}" on ${formattedDate} at ${formattedTime}. Check the Events tab for details!`,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error creating event announcement:', error);
    }
  }

  public async updateEventIntentStatus(
    intentId: string,
    userId: string,
    isProcessed: boolean = true
  ): Promise<void> {
    try {
      await supabase
        .from('message_intents')
        .update({
          is_processed: isProcessed,
          processed_at: new Date().toISOString(),
          processed_by: userId
        })
        .eq('id', intentId);
    } catch (error) {
      console.error('Error updating intent status:', error);
    }
  }

  public async getUpcomingEvents(communityId: string, limit: number = 10): Promise<ScheduledEvent[]> {
    try {
      const { data: events, error } = await supabase
        .from('community_events')
        .select('*')
        .eq('community_id', communityId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return events || [];
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }
  }

  public async validateEventDetails(details: EventDetails): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Validate required fields
    if (!details.title || details.title.trim().length < 3) {
      errors.push('Event title must be at least 3 characters long');
    }

    if (!details.description || details.description.trim().length < 10) {
      errors.push('Event description must be at least 10 characters long');
    }

    // Validate date and time
    if (details.date) {
      const eventDate = new Date(details.date);
      const now = new Date();
      if (eventDate < now) {
        errors.push('Event date cannot be in the past');
      }
    }

    if (details.time) {
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timePattern.test(details.time)) {
        errors.push('Invalid time format. Use HH:MM format');
      }
    }

    // Validate capacity
    if (details.suggestedCapacity && details.suggestedCapacity < 1) {
      errors.push('Event capacity must be at least 1');
    }

    // Validate duration
    if (details.suggestedDuration && details.suggestedDuration < 15) {
      errors.push('Event duration must be at least 15 minutes');
    }

    // Suggestions
    if (!details.location && !details.isOnline) {
      suggestions.push('Consider adding a location or marking as online event');
    }

    if (!details.tags || details.tags.length === 0) {
      suggestions.push('Adding tags helps others find your event');
    }

    if (!details.suggestedCapacity) {
      suggestions.push('Setting a capacity limit helps with planning');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  public async enhanceEventWithAI(details: EventDetails, originalMessage: string): Promise<EventDetails> {
    try {
      const prompt = `Analyze this event request and provide enhanced details:

Original message: "${originalMessage}"

Current details:
- Title: ${details.title}
- Date: ${details.date || 'Not specified'}
- Time: ${details.time || 'Not specified'}
- Location: ${details.location || 'Not specified'}

Please provide enhanced event details in JSON format:
{
  "title": "A catchy, descriptive event title",
  "description": "A detailed description explaining what the event is about, who it's for, and what participants can expect",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "recommendedDuration": 60,
  "recommendedCapacity": 20,
  "locationSuggestions": ["suggestion1", "suggestion2"]
}`;

      // Use the intent detection service's Google AI method
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        return {
          ...details,
          title: aiResponse.title || details.title,
          description: aiResponse.description || details.description,
          tags: aiResponse.suggestedTags || details.tags,
          suggestedDuration: aiResponse.recommendedDuration || details.suggestedDuration,
          suggestedCapacity: aiResponse.recommendedCapacity || details.suggestedCapacity
        };
      }
    } catch (error) {
      console.error('Error enhancing event with AI:', error);
    }

    return details;
  }
}

export const eventSchedulerService = new EventSchedulerService(); 