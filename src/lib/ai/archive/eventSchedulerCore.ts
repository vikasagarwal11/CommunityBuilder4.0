import { supabase } from '../../supabase';

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
  createdBy?: string;
  communityId?: string;
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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
  warnings: string[];
}

export interface EventCreationResult {
  success: boolean;
  event?: ScheduledEvent;
  errors?: string[];
  warnings?: string[];
}

class EventSchedulerCore {
  /**
   * Validate event details before creation
   */
  public async validateEvent(details: EventDetails): Promise<ValidationResult> {
    const errors: string[] = [];
    const suggestions: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!details.title || details.title.trim().length < 3) {
      errors.push('Event title must be at least 3 characters long');
    }

    if (!details.description || details.description.trim().length < 10) {
      errors.push('Event description must be at least 10 characters long');
    }

    // Date and time validation
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

    // Duration validation
    if (details.suggestedDuration && details.suggestedDuration < 15) {
      errors.push('Event duration must be at least 15 minutes');
    }

    // Capacity validation
    if (details.suggestedCapacity && details.suggestedCapacity < 1) {
      errors.push('Event capacity must be at least 1');
    }

    // Suggestions for improvement
    if (!details.location && !details.isOnline) {
      suggestions.push('Consider adding a location or marking as online event');
    }

    if (!details.tags || details.tags.length === 0) {
      suggestions.push('Adding tags helps others find your event');
    }

    if (!details.suggestedCapacity) {
      suggestions.push('Setting a capacity limit helps with planning');
    }

    // Warnings
    if (details.suggestedDuration && details.suggestedDuration > 480) {
      warnings.push('Event duration is quite long (8+ hours). Is this intentional?');
    }

    if (details.suggestedCapacity && details.suggestedCapacity > 1000) {
      warnings.push('Large capacity event detected. Consider logistics.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
      warnings
    };
  }

  /**
   * Create event with unified logic
   */
  public async createEvent(details: EventDetails, userId: string, communityId: string, isAIGenerated: boolean = false): Promise<EventCreationResult> {
    try {
      // Step 1: Validate event details
      const validation = await this.validateEvent(details);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Step 2: Calculate start and end times
      const startTime = this.calculateStartTime(details.date, details.time);
      const endTime = this.calculateEndTime(startTime, details.suggestedDuration);

      // Step 3: Create event in database
      const { data: event, error } = await supabase
        .from('community_events')
        .insert({
          community_id: communityId,
          created_by: userId,
          title: details.title,
          description: details.description,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: details.location,
          capacity: details.suggestedCapacity,
          tags: details.tags,
          is_online: details.isOnline,
          meeting_url: details.meetingUrl,
          ai_generated: isAIGenerated,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Step 4: Create announcement post
      await this.createEventAnnouncement(event, communityId, userId);

      return {
        success: true,
        event,
        warnings: validation.warnings
      };

    } catch (error) {
      console.error('Error creating event:', error);
      return {
        success: false,
        errors: ['Failed to create event. Please try again.']
      };
    }
  }

  /**
   * Update existing event
   */
  public async updateEvent(eventId: string, updates: Partial<EventDetails>, userId: string): Promise<EventCreationResult> {
    try {
      // Validate updates
      const validation = await this.validateEvent({ ...updates } as EventDetails);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Prepare update data
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.location) updateData.location = updates.location;
      if (updates.suggestedCapacity) updateData.capacity = updates.suggestedCapacity;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.isOnline !== undefined) updateData.is_online = updates.isOnline;
      if (updates.meetingUrl) updateData.meeting_url = updates.meetingUrl;

      // Update start/end times if date/time changed
      if (updates.date || updates.time) {
        const startTime = this.calculateStartTime(updates.date, updates.time);
        const endTime = this.calculateEndTime(startTime, updates.suggestedDuration);
        updateData.start_time = startTime.toISOString();
        updateData.end_time = endTime.toISOString();
      }

      const { data: event, error } = await supabase
        .from('community_events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        event
      };

    } catch (error) {
      console.error('Error updating event:', error);
      return {
        success: false,
        errors: ['Failed to update event. Please try again.']
      };
    }
  }

  /**
   * Delete event
   */
  public async deleteEvent(eventId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user has permission to delete
      const { data: event } = await supabase
        .from('community_events')
        .select('created_by, community_id')
        .eq('id', eventId)
        .single();

      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Only creator or admin can delete
      const { data: userRole } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', event.community_id)
        .eq('user_id', userId)
        .single();

      if (event.created_by !== userId && userRole?.role !== 'admin') {
        return { success: false, error: 'Permission denied' };
      }

      const { error } = await supabase
        .from('community_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      return { success: true };

    } catch (error) {
      console.error('Error deleting event:', error);
      return { success: false, error: 'Failed to delete event' };
    }
  }

  /**
   * Get upcoming events for a community
   */
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

  /**
   * Calculate start time from date and time
   */
  private calculateStartTime(date?: string, time?: string): Date {
    if (date && time) {
      return new Date(`${date}T${time}:00Z`);
    } else if (date) {
      return new Date(`${date}T09:00:00Z`);
    } else {
      // Default to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
  }

  /**
   * Calculate end time from start time and duration
   */
  private calculateEndTime(startTime: Date, durationMinutes?: number): Date {
    const duration = durationMinutes || 60; // Default 1 hour
    return new Date(startTime.getTime() + duration * 60000);
  }

  /**
   * Create announcement post for new event
   */
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
}

export const eventSchedulerCore = new EventSchedulerCore(); 