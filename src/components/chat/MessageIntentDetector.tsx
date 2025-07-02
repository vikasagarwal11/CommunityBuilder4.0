import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, AlertTriangle, Check, X, Lightbulb, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { googleAI } from '../../lib/ai/googleAI';
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
  date: string;
  time: string;
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

const MessageIntentDetector: React.FC<MessageIntentDetectorProps> = ({
  message,
  communityId,
  isAdmin,
  onEventCreated
}) => {
  const { user } = useAuth();
  const [intent, setIntent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [intentSaved, setIntentSaved] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [eventCreated, setEventCreated] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Detect intent in message
  useEffect(() => {
    const detectIntent = async () => {
      if (!user || !message) return;
      
      try {
        setLoading(true);
        
        // Check if this message has already been processed
        const { data: existingIntent } = await supabase
          .from('message_intents')
          .select('id, intent_type, confidence, details, is_processed')
          .eq('message_id', message.id)
          .maybeSingle();
          
        if (existingIntent) {
          setIntent(existingIntent);
          setIntentSaved(true);
          return;
        }
        
        // Analyze message content with enhanced detection
        const analysis = await googleAI.analyzeMessage(message.content);
        
        // Enhanced event intent detection patterns
        const eventPatterns = [
          /\b(schedule|plan|organize|create|host|arrange|set\s+up|put\s+together)\b/i,
          /\b(event|meeting|session|workshop|class|gathering|get\s+together|hangout)\b/i,
          /\b(yoga|fitness|workout|exercise|training|coaching|mentoring|study)\b/i,
          /\b(party|celebration|birthday|anniversary|holiday|festival)\b/i
        ];
        
        const datePattern = /\b(tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?)\b/i;
        const timePattern = /\b(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)\b/i;
        
        // Check if any event pattern matches
        const hasEventPattern = eventPatterns.some(pattern => pattern.test(message.content));
        const hasDateOrTime = datePattern.test(message.content) || timePattern.test(message.content);
        
        if (hasEventPattern && hasDateOrTime) {
          // Extract basic event details
          const eventIntent: EventIntent = {
            title: extractTitle(message.content) || "Community Event",
            description: message.content,
            date: extractDate(message.content) || new Date().toISOString().split('T')[0],
            time: extractTime(message.content) || "12:00",
            location: extractLocation(message.content) || undefined,
            confidence: 0.8,
            suggestedDuration: extractDuration(message.content),
            suggestedCapacity: extractCapacity(message.content),
            tags: extractTags(message.content),
            isOnline: message.content.toLowerCase().includes('online') || message.content.toLowerCase().includes('zoom'),
            meetingUrl: extractMeetingUrl(message.content)
          };
          
          // Generate AI-enhanced details
          await generateAIEventDetails(eventIntent, message.content);
          
          // Save intent to database
          const { data: savedIntent, error: saveError } = await supabase
            .from('message_intents')
            .insert({
              message_id: message.id,
              community_id: communityId,
              intent_type: 'event',
              confidence: eventIntent.confidence,
              details: eventIntent,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (saveError) throw saveError;
          
          setIntent(savedIntent);
          setIntentSaved(true);
          
          // If not admin, send enhanced notification to admins
          if (!isAdmin) {
            await sendEnhancedAdminNotification(message.id, 'event', eventIntent);
            setNotificationSent(true);
          }
        }
      } catch (error) {
        console.error('Error detecting intent:', error);
      } finally {
        setLoading(false);
      }
    };
    
    detectIntent();
  }, [message, user, communityId, isAdmin]);

  // Generate AI-enhanced event details
  const generateAIEventDetails = async (eventIntent: EventIntent, originalMessage: string) => {
    try {
      setAiGenerating(true);
      
      const prompt = `Analyze this event request and provide enhanced details:

Original message: "${originalMessage}"

Extracted details:
- Title: ${eventIntent.title}
- Date: ${eventIntent.date}
- Time: ${eventIntent.time}
- Location: ${eventIntent.location || 'Not specified'}

Please provide enhanced event details in JSON format:
{
  "title": "A catchy, descriptive event title",
  "description": "A detailed description explaining what the event is about, who it's for, and what participants can expect",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "recommendedDuration": 60,
  "recommendedCapacity": 20,
  "locationSuggestions": ["suggestion1", "suggestion2"]
}

Focus on making the event appealing and informative.`;

      const aiResponse = await googleAI.analyzeMessage(prompt);
      
      // Parse AI response (simplified for now)
      const aiDetails = {
        title: aiResponse.topics.length > 0 ? aiResponse.topics[0] : eventIntent.title,
        description: `Enhanced event based on community interest: ${eventIntent.description}`,
        suggestedTags: aiResponse.keywords.slice(0, 5),
        recommendedDuration: eventIntent.suggestedDuration || 60,
        recommendedCapacity: eventIntent.suggestedCapacity || 20,
        locationSuggestions: eventIntent.location ? [eventIntent.location] : ['Community Center', 'Local Park']
      };
      
      eventIntent.aiGeneratedDetails = aiDetails;
      eventIntent.title = aiDetails.title;
      eventIntent.description = aiDetails.description;
      eventIntent.tags = aiDetails.suggestedTags;
      eventIntent.suggestedDuration = aiDetails.recommendedDuration;
      eventIntent.suggestedCapacity = aiDetails.recommendedCapacity;
      
    } catch (error) {
      console.error('Error generating AI details:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  // Enhanced notification system
  const sendEnhancedAdminNotification = async (messageId: string, intentType: string, details: EventIntent) => {
    if (!user) return;
    
    try {
      const notificationContent = {
        type: 'event_suggestion',
        priority: 'medium',
        summary: `Event suggestion: ${details.title}`,
        details: {
          originalMessage: message.content,
          extractedDetails: details,
          aiGeneratedDetails: details.aiGeneratedDetails,
          suggestedActions: [
            'Review and approve event details',
            'Adjust date/time if needed',
            'Add location information',
            'Set capacity limits',
            'Add event tags'
          ]
        }
      };

      await supabase
        .from('admin_notifications')
        .insert({
          community_id: communityId,
          message_id: messageId,
          intent_type: intentType,
          intent_details: notificationContent,
          created_by: user.id,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error sending enhanced admin notification:', error);
    }
  };

  // Enhanced extraction methods
  const extractDuration = (content: string): number | undefined => {
    const durationPatterns = [
      /(\d+)\s*(hour|hr|h)\s*(?:and\s*)?(\d+)\s*(minute|min|m)/i,
      /(\d+)\s*(hour|hr|h)/i,
      /(\d+)\s*(minute|min|m)/i
    ];
    
    for (const pattern of durationPatterns) {
      const match = content.match(pattern);
      if (match) {
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[3]) || 0;
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
      /category:\s*([^.!?]+)/i
    ];
    
    for (const pattern of tagPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        tags.push(...matches.slice(1));
      }
    }
    
    return tags;
  };

  const extractMeetingUrl = (content: string): string | undefined => {
    const urlPattern = /(https?:\/\/[^\s]+)/i;
    const match = content.match(urlPattern);
    return match ? match[1] : undefined;
  };

  // Extract title from message
  const extractTitle = (content: string): string | null => {
    // Look for phrases like "let's have a yoga session" or "planning a workshop on nutrition"
    const titlePatterns = [
      /(?:plan|schedule|organize|have)\s+(?:a|an)\s+([^.!?]+)(?:\s+on|for|at|in)/i,
      /(?:create|host|arrange)\s+(?:a|an)\s+([^.!?]+)(?:\s+on|for|at|in)/i,
      /(?:event|meeting|session|workshop|class)\s+(?:on|about)\s+([^.!?]+)(?:\s+on|for|at|in)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no specific pattern matches, try to extract a reasonable title
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length > 10 && firstSentence.length < 50) {
      return firstSentence.trim();
    }
    
    return null;
  };

  // Extract date from message
  const extractDate = (content: string): string | null => {
    const datePatterns = [
      // Tomorrow
      { pattern: /\btomorrow\b/i, handler: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }},
      // Next day of week
      { pattern: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, handler: (match: RegExpMatchArray) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match[1].toLowerCase());
        const today = new Date();
        const currentDay = today.getDay();
        const daysToAdd = (targetDay + 7 - currentDay) % 7 || 7; // If today, then next week
        
        const nextDay = new Date();
        nextDay.setDate(today.getDate() + daysToAdd);
        return nextDay.toISOString().split('T')[0];
      }},
      // This day of week
      { pattern: /\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, handler: (match: RegExpMatchArray) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match[1].toLowerCase());
        const today = new Date();
        const currentDay = today.getDay();
        const daysToAdd = (targetDay - currentDay + 7) % 7;
        
        const thisDay = new Date();
        thisDay.setDate(today.getDate() + daysToAdd);
        return thisDay.toISOString().split('T')[0];
      }},
      // Month and day
      { pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?\b/i, handler: (match: RegExpMatchArray) => {
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const month = months.indexOf(match[1].toLowerCase());
        const day = parseInt(match[2]);
        
        const date = new Date();
        date.setMonth(month);
        date.setDate(day);
        
        // If the date is in the past, assume next year
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

  // Extract time from message
  const extractTime = (content: string): string | null => {
    const timePattern = /\b(at\s+)?(\d{1,2})(:\d{2})?\s*(am|pm)\b/i;
    const match = content.match(timePattern);
    
    if (match) {
      let hour = parseInt(match[2]);
      const minutes = match[3] ? match[3].substring(1) : '00';
      const period = match[4].toLowerCase();
      
      // Convert to 24-hour format
      if (period === 'pm' && hour < 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }
      
      return `${hour.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return null;
  };

  // Extract location from message
  const extractLocation = (content: string): string | null => {
    const locationPatterns = [
      /\bat\s+([^.!?,]+(?:park|center|studio|gym|room|hall|building|place))/i,
      /\bin\s+([^.!?,]+(?:park|center|studio|gym|room|hall|building|place))/i,
      /\blocation\s*:\s*([^.!?,]+)/i,
      /\bvenue\s*:\s*([^.!?,]+)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  // Create event from intent
  const createEvent = async () => {
    if (!user || !intent || !intent.details) return;
    
    try {
      setLoading(true);
      
      // Combine date and time
      const eventDate = new Date(`${intent.details.date}T${intent.details.time}`);
      
      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          community_id: communityId,
          title: intent.details.title,
          description: intent.details.description,
          date: eventDate.toISOString(),
          created_by: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (eventError) throw eventError;
      
      // Mark intent as processed
      await supabase
        .from('message_intents')
        .update({
          is_processed: true,
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', intent.id);
        
      setEventCreated(true);
      
      // Notify parent component
      if (onEventCreated) {
        onEventCreated(event.id);
      }
      
      // Create a community post announcing the event
      await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: `📅 New event created: "${intent.details.title}" on ${new Date(eventDate).toLocaleDateString()} at ${new Date(eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Check the Events tab for details!`,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  // If no intent detected or not an event intent, don't show anything
  if (!intent || intent.intent_type !== 'event' || !intent.details) {
    return null;
  }

  // If event already created, show confirmation
  if (eventCreated) {
    return (
      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center text-green-700">
          <Check className="h-5 w-5 mr-2" />
          <p className="font-medium">Event created successfully!</p>
        </div>
      </div>
    );
  }

  // If not admin and notification sent, show notification
  if (!isAdmin && notificationSent) {
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center text-blue-700">
          <Lightbulb className="h-5 w-5 mr-2" />
          <p>Event suggestion sent to community admins</p>
        </div>
      </div>
    );
  }

  // If admin, show confirmation dialog
  if (isAdmin && showConfirmation) {
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
                value={intent.details.date}
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
                value={intent.details.time}
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

  // Show intent detection result for admins
  if (isAdmin && intent.details) {
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-blue-700">
            <Lightbulb className="h-5 w-5 mr-2" />
            <p>Possible event detected</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfirmation(true)}
              className="px-3 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm flex items-center"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Create Event
            </button>
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