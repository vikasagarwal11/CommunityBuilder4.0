import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, AlertTriangle, Check, X, Lightbulb, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { intentDetectionService, eventSchedulerService } from '../../lib/ai/modules';
import { motion } from 'framer-motion';

interface MessageIntentDetectorProps {
  message: {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
  };
  communityId: string;
  isAdmin: boolean;
  onEventCreated?: (eventId: string) => void;
}

interface EventIntent {
  title: string;
  description: string;
  date?: string;
  time?: string;
  location?: string;
  confidence: number;
  suggestedDuration?: number;
  suggestedCapacity?: number;
  tags?: string[];
  isOnline?: boolean;
  meetingUrl?: string;
  aiGeneratedDetails?: {
    title: string;
    description: string;
    suggestedTags: string[];
    recommendedDuration: number;
    recommendedCapacity: number;
    locationSuggestions: string[];
  };
}

interface Intent {
  id?: string;
  message_id: string;
  community_id: string;
  intent_type: 'event' | 'feedback' | 'question' | 'announcement' | 'other';
  confidence: number;
  details: any;
  is_processed?: boolean;
  processed_at?: string;
  processed_by?: string;
  detected_by: string;
}

const MessageIntentDetector: React.FC<MessageIntentDetectorProps> = ({
  message,
  communityId,
  isAdmin,
  onEventCreated
}) => {
  const { user } = useAuth();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [intentSaved, setIntentSaved] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [eventCreated, setEventCreated] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    const detectIntent = async () => {
      if (!user || !message || !message.content.trim()) return;

      try {
        setLoading(true);

        // Check if message has already been processed
        const { data: existingIntent } = await supabase
          .from('message_intents')
          .select('id, intent_type, confidence, details, is_processed, detected_by')
          .eq('message_id', message.id)
          .maybeSingle();

        if (existingIntent) {
          setIntent(existingIntent);
          setIntentSaved(true);
          return;
        }

        let detectedBy = 'ai';
        let intentData;
        try {
          const detectedIntent = await intentDetectionService.detectIntent(message.content, {
            communityId,
            userId: user.id
          });
          
          intentData = {
            message_id: message.id,
            community_id: communityId,
            intent_type: detectedIntent.intent,
            confidence: detectedIntent.confidence,
            details: detectedIntent.details || { description: message.content },
          };
        } catch (aiError) {
          // Fallback to regex
          detectedBy = 'regex';
          // ... fallback regex logic as before ...
          const eventPatterns = [
            /\b(schedule|plan|organize|create|host|arrange|set\s+up|put\s+together|how\s+about|let's|lets)\b/i,
            /\b(event|meeting|session|workshop|class|gathering|get\s+together|hangout|dinner|lunch|breakfast|party|meetup|walk)\b/i,
            /\b(yoga|fitness|workout|exercise|training|coaching|mentoring|study)\b/i,
            /\b(celebration|birthday|anniversary|holiday|festival)\b/i
          ];
          const datePattern = /\b(tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)|(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?|weekend|morning|afternoon|evening)\b/i;
          const timePattern = /\b(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)|morning|afternoon|evening\b/i;
          const hasEventPattern = eventPatterns.some(pattern => pattern.test(message.content));
          const hasDateOrTime = datePattern.test(message.content) || timePattern.test(message.content);
          if (hasEventPattern || hasDateOrTime) {
            intentData = {
              message_id: message.id,
              community_id: communityId,
              intent_type: 'event',
              confidence: 0.7,
              details: {
                title: extractTitle(message.content) || 'Community Event',
                description: message.content,
                date: extractDate(message.content),
                time: extractTime(message.content),
                location: extractLocation(message.content),
                confidence: 0.7,
                suggestedDuration: extractDuration(message.content),
                suggestedCapacity: extractCapacity(message.content),
                tags: extractTags(message.content),
                isOnline: message.content.toLowerCase().includes('online') || message.content.toLowerCase().includes('zoom'),
                meetingUrl: extractMeetingUrl(message.content)
              }
            };
          } else {
            intentData = {
              message_id: message.id,
              community_id: communityId,
              intent_type: 'other',
              confidence: 0.5,
              details: { description: message.content },
            };
          }
        }

        // Save intent to database, including detectedBy
        const { data: savedIntent, error: saveError } = await supabase
          .from('message_intents')
          .insert({
            message_id: message.id,
            community_id: communityId,
            intent_type: intentData.intent_type,
            confidence: intentData.confidence,
            details: intentData.details,
            detected_by: detectedBy,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) throw saveError;

        setIntent(savedIntent);
        setIntentSaved(true);

        // Notify admins for non-admin users
        if (!isAdmin) {
          await sendEnhancedAdminNotification(message.id, intentData.intent_type, intentData.details);
          setNotificationSent(true);
        }
      } catch (error) {
        console.error('Error detecting intent:', error);
        setError('Failed to detect intent');
      } finally {
        setLoading(false);
      }
    };

    detectIntent();
  }, [message, user, communityId, isAdmin]);

  const generateAIEventDetails = async (eventIntent: EventIntent, originalMessage: string) => {
    try {
      setAiGenerating(true);

      const prompt = `Analyze this event request and provide enhanced details:

Original message: "${originalMessage}"

Extracted details:
- Title: ${eventIntent.title}
- Date: ${eventIntent.date || 'Not specified'}
- Time: ${eventIntent.time || 'Not specified'}
- Location: ${eventIntent.location || 'Not specified'}

Please provide enhanced event details in JSON format:
{
  "title": "A catchy, descriptive event title",
  "description": "A detailed description explaining what the event is about, who it's for, and what participants can expect",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "recommendedDuration": 60,
  "recommendedCapacity": 20,
  "locationSuggestions": ["suggestion1", "suggestion2"]
}`;

      // Use the AI service for enhanced event details
      const enhancedDetails = await eventSchedulerService.enhanceEventWithAI(
        {
          title: eventIntent.title,
          description: eventIntent.description,
          date: eventIntent.date,
          time: eventIntent.time,
          location: eventIntent.location,
          suggestedDuration: eventIntent.suggestedDuration,
          suggestedCapacity: eventIntent.suggestedCapacity,
          tags: eventIntent.tags,
          isOnline: eventIntent.isOnline,
          meetingUrl: eventIntent.meetingUrl
        },
        originalMessage
      );

      eventIntent.aiGeneratedDetails = {
        title: enhancedDetails.title,
        description: enhancedDetails.description,
        suggestedTags: enhancedDetails.tags || [],
        recommendedDuration: enhancedDetails.suggestedDuration || 60,
        recommendedCapacity: enhancedDetails.suggestedCapacity || 20,
        locationSuggestions: enhancedDetails.location ? [enhancedDetails.location] : ['Community Center', 'Local Park']
      };

      eventIntent.title = eventIntent.aiGeneratedDetails.title;
      eventIntent.description = eventIntent.aiGeneratedDetails.description;
      eventIntent.tags = eventIntent.aiGeneratedDetails.suggestedTags;
      eventIntent.suggestedDuration = eventIntent.aiGeneratedDetails.recommendedDuration;
      eventIntent.suggestedCapacity = eventIntent.aiGeneratedDetails.recommendedCapacity;
    } catch (error) {
      console.error('Error generating AI details:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  const sendEnhancedAdminNotification = async (messageId: string, intentType: string, details: any) => {
    if (!user) return;

    try {
      const suggestedActions = intentType === 'event' ? [
        'Review and approve event details',
        'Adjust date/time if needed',
        'Add location information',
        'Set capacity limits',
        'Add event tags'
      ] : [
        `Review ${intentType} message`,
        'Respond to user if needed',
        'Update community settings if applicable'
      ];

      const notificationContent = {
        type: `${intentType}_suggestion`,
        priority: intentType === 'event' ? 'medium' : 'low',
        summary: `${intentType.charAt(0).toUpperCase() + intentType.slice(1)} suggestion: ${details.title || details.summary || message.content.substring(0, 50)}`,
        category: `${intentType}_suggestion`,
        details: {
          originalMessage: message.content,
          extractedDetails: details,
          aiGeneratedDetails: details.aiGeneratedDetails || null,
          suggestedActions
        }
      };

      const { data: admins } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', communityId)
        .eq('role', 'admin')
        .neq('user_id', user.id);

      for (const admin of admins || []) {
        await supabase
          .from('admin_notifications')
          .insert({
            user_id: admin.user_id,
            community_id: communityId,
            message_id: messageId,
            intent_type: intentType,
            intent_details: notificationContent,
            category: notificationContent.category,
            summary: notificationContent.summary,
            suggested_actions: suggestedActions,
            created_by: user.id,
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error sending enhanced admin notification:', error);
    }
  };

  const extractDuration = (content: string): number | undefined => {
    const durationPatterns = [
      /(\d+)\s*(hour|hr|h)\s*(?:and\s*)?(\d+)\s*(minute|min|m)?/i,
      /(\d+)\s*(hour|hr|h)/i,
      /(\d+)\s*(minute|min|m)/i
    ];

    for (const pattern of durationPatterns) {
      const match = content.match(pattern);
      if (match) {
        const hours = parseInt(match[1]) || 0;
        const minutes = match[3] ? parseInt(match[3]) : 0;
        return hours * 60 + minutes;
      }
    }

    return undefined;
  };

  const extractCapacity = (content: string): number | undefined => {
    const capacityPatterns = [
      /(\d+)\s*(people|person|participant|attendee)/i,
      /capacity\s*of\s*(\d+)/i,
      /up\s*to\s*(\d+)/i
    ];

    for (const pattern of capacityPatterns) {
      const match = content.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return undefined;
  };

  const extractTags = (content: string): string[] => {
    const tags: string[] = [];
    const tagPatterns = [
      /#(\w+)/g,
      /tagged\s+as\s+([^.!?]+)/i,
      /category:\s*([^.!?]+)/i,
      /\b(yoga|fitness|workout|dinner|lunch|breakfast|walk|meetup)\b/i
    ];

    for (const pattern of tagPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        tags.push(match[1]);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  };

  const extractMeetingUrl = (content: string): string | undefined => {
    const urlPattern = /(https?:\/\/[^\s]+)/i;
    const match = content.match(urlPattern);
    return match ? match[1] : undefined;
  };

  const extractTitle = (content: string): string | null => {
    const titlePatterns = [
      /(?:plan|schedule|organize|have|how\s+about|let's|lets)\s+(?:a|an)\s+([^.!?]+)(?:\s+on|for|at|in)/i,
      /(?:create|host|arrange)\s+(?:a|an)\s+([^.!?]+)(?:\s+on|for|at|in)/i,
      /(?:event|meeting|session|workshop|class|dinner|lunch|breakfast|party|meetup|walk)\s+(?:on|about|for)\s+([^.!?]+)(?:\s+on|for|at|in)/i
    ];

    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length > 10 && firstSentence.length < 50) {
      return firstSentence.trim();
    }

    return null;
  };

  const extractDate = (content: string): string | null => {
    const datePatterns = [
      { pattern: /\btomorrow\b/i, handler: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }},
      { pattern: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, handler: (match: RegExpMatchArray) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match[1].toLowerCase());
        const today = new Date();
        const currentDay = today.getDay();
        const daysToAdd = (targetDay + 7 - currentDay) % 7 || 7;

        const nextDay = new Date();
        nextDay.setDate(today.getDate() + daysToAdd);
        return nextDay.toISOString().split('T')[0];
      }},
      { pattern: /\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)\b/i, handler: (match: RegExpMatchArray) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        if (match[1].toLowerCase() === 'weekend') {
          const today = new Date();
          const currentDay = today.getDay();
          const daysToSaturday = 6 - currentDay;
          const saturday = new Date();
          saturday.setDate(today.getDate() + (daysToSaturday <= 0 ? daysToSaturday + 7 : daysToSaturday));
          return saturday.toISOString().split('T')[0];
        }
        const targetDay = days.indexOf(match[1].toLowerCase());
        const today = new Date();
        const currentDay = today.getDay();
        const daysToAdd = (targetDay - currentDay + 7) % 7;

        const thisDay = new Date();
        thisDay.setDate(today.getDate() + daysToAdd);
        return thisDay.toISOString().split('T')[0];
      }},
      { pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?\b/i, handler: (match: RegExpMatchArray) => {
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const month = months.indexOf(match[1].toLowerCase());
        const day = parseInt(match[2]);

        const date = new Date();
        date.setMonth(month);
        date.setDate(day);

        if (date < new Date()) {
          date.setFullYear(date.getFullYear() + 1);
        }

        return date.toISOString().split('T')[0];
      }}
    ];

    for (const { pattern, handler } of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        return handler(match);
      }
    }

    return null;
  };

  const extractTime = (content: string): string | null => {
    const timePattern = /\b(at\s+)?(\d{1,2})(:\d{2})?\s*(am|pm)|morning|afternoon|evening\b/i;
    const match = content.match(timePattern);

    if (match) {
      if (match[0].match(/morning|afternoon|evening/i)) {
        return match[0].toLowerCase() === 'morning' ? '09:00' :
               match[0].toLowerCase() === 'afternoon' ? '14:00' :
               '18:00';
      }
      let hour = parseInt(match[2]);
      const minutes = match[3] ? match[3].substring(1) : '00';
      const period = match[4]?.toLowerCase();

      if (period) {
        if (period === 'pm' && hour < 12) hour += 12;
        else if (period === 'am' && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, '0')}:${minutes}`;
      }
    }

    return null;
  };

  const extractLocation = (content: string): string | null => {
    const locationPatterns = [
      /\bat\s+([^.!?,]+(?:park|center|studio|gym|room|hall|building|place))/i,
      /\bin\s+([^.!?,]+(?:park|center|studio|gym|room|hall|building|place))/i,
      /\blocation\s*:\s*([^.!?,]+)/i,
      /\bvenue\s*:\s*([^.!?,]+)/i,
      /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/i // City names like "Millburn"
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  };

  const createEvent = async () => {
    if (!user || !intent || intent.intent_type !== 'event' || !intent.details) return;

    try {
      setLoading(true);

      const eventDate = intent.details.date && intent.details.time
        ? new Date(`${intent.details.date}T${intent.details.time}`)
        : new Date();

      const { data: event, error: eventError } = await supabase
        .from('community_events') // Changed to match your schema
        .insert({
          community_id: communityId,
          title: intent.details.title,
          description: intent.details.description,
          start_time: eventDate.toISOString(),
          end_time: intent.details.suggestedDuration
            ? new Date(eventDate.getTime() + intent.details.suggestedDuration * 60000).toISOString()
            : new Date(eventDate.getTime() + 60 * 60000).toISOString(),
          created_by: user.id,
          created_at: new Date().toISOString(),
          tags: intent.details.tags,
          location: intent.details.location,
          is_online: intent.details.isOnline,
          meeting_url: intent.details.meetingUrl
        })
        .select()
        .single();

      if (eventError) throw eventError;

      await supabase
        .from('message_intents')
        .update({
          is_processed: true,
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', intent.id);

      setEventCreated(true);

      if (onEventCreated) {
        onEventCreated(event.id);
      }

      // Create community post
      await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: `📅 New event created: "${intent.details.title}" on ${new Date(eventDate).toLocaleDateString()} at ${new Date(eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Check the Events tab for details!`,
          created_at: new Date().toISOString()
        });

      // Trigger AI learning system for user interest vector
      try {
        const { learningSystem } = await import('../../lib/ai/learningSystem');
        await learningSystem.onUserJoinsCommunity(user.id, communityId);
      } catch (aiError) {
        console.warn('Failed to update user interest vector:', aiError);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  if (!intent || !intent.details) return null;

  if (eventCreated && intent.intent_type === 'event') {
    return (
      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center text-green-700">
          <Check className="h-5 w-5 mr-2" />
          <p className="font-medium">Event created successfully!</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && notificationSent) {
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center text-blue-700">
          <Lightbulb className="h-5 w-5 mr-2" />
          <p>{intent.intent_type.charAt(0).toUpperCase() + intent.intent_type.slice(1)} suggestion sent to community admins</p>
        </div>
      </div>
    );
  }

  if (isAdmin && showConfirmation && intent.intent_type === 'event') {
    return (
      <motion.div
        className="mt-2 p-4 bg-white border border-neutral-200 rounded-lg shadow-md"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="font-medium mb-3 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary-500" />
          Confirm Event Creation
        </h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={intent.details.title}
              onChange={(e) => setIntent({
                ...intent,
                details: { ...intent.details, title: e.target.value }
              })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={intent.details.date || ''}
                onChange={(e) => setIntent({
                  ...intent,
                  details: { ...intent.details, date: e.target.value }
                })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={intent.details.time || ''}
                onChange={(e) => setIntent({
                  ...intent,
                  details: { ...intent.details, time: e.target.value }
                })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              value={intent.details.location || ''}
              onChange={(e) => setIntent({
                ...intent,
                details: { ...intent.details, location: e.target.value }
              })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Community Center, Park, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              value={intent.details.description}
              onChange={(e) => setIntent({
                ...intent,
                details: { ...intent.details, description: e.target.value }
              })}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowConfirmation(false)}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={createEvent}
            disabled={loading}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Create Event
          </button>
        </div>
      </motion.div>
    );
  }

  if (isAdmin && intent.intent_type) {
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-blue-700">
            <Lightbulb className="h-5 w-5 mr-2" />
            <p>{intent.intent_type.charAt(0).toUpperCase() + intent.intent_type.slice(1)} intent detected</p>
          </div>
          <div className="flex items-center space-x-2">
            {intent.intent_type === 'event' && (
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-3 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm flex items-center"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Create Event
              </button>
            )}
            <button
              onClick={() => setIntent(null)}
              className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MessageIntentDetector;