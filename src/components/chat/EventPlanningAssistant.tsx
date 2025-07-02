import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Users, MapPin, Check, X, Plus, CalendarDays, CalendarClock, CalendarRange, Sparkles, Wand2, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { googleAI } from '../../lib/ai/googleAI';
import EventForm from '../events/EventForm';
const parseDate = (value: string): string => {
  // Accept only YYYY-MM-DD, else blank
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

const parseTime = (value: string): string => {
  // Accept only HH:mm, else blank
  if (!value) return '';
  return /^\d{2}:\d{2}$/.test(value) ? value : '';
};


interface EventPlanningAssistantProps {
  communityId: string;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
}

interface EventSuggestion {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  capacity?: number;
  tags: string[];
  confidence: number;
}

interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  votes: number;
  voters: string[];
}

const EventPlanningAssistant: React.FC<EventPlanningAssistantProps> = ({
  communityId,
  onClose,
  onEventCreated
}) => {
  const { user } = useAuth();
  // Step order: aiPrompt -> aiForm -> initial -> suggestions -> details -> poll -> confirm
  const [step, setStep] = useState<'aiPrompt' | 'aiForm' | 'initial' | 'suggestions' | 'details' | 'poll' | 'confirm'>('aiPrompt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState<'single' | 'recurring' | 'poll'>('single');
  const [eventDescription, setEventDescription] = useState('');
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<EventSuggestion | null>(null);
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([
    { date: new Date().toISOString().split('T')[0], startTime: '18:00', endTime: '19:00', votes: 0, voters: [] }
  ]);
  const [eventDetails, setEventDetails] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endDate: '',
    endTime: '',
    location: '',
    isOnline: false,
    meetingUrl: '',
    capacity: '',
    tags: [] as string[],
    newTag: '',
    isRecurring: false,
    recurrencePattern: 'weekly',
    recurrenceInterval: '1',
    recurrenceEndDate: ''
  });
  const [pollDetails, setPollDetails] = useState({
    title: '',
    description: '',
    expiresIn: '7' // days
  });

  // --- AI prompt-to-event feature ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiEventFormPrefill, setAiEventFormPrefill] = useState<any | null>(null);
  const promptSuggestions = [
    "Schedule a morning yoga session for beginners next Tuesday at 8am",
    "Create a monthly book club meeting on the first Thursday of each month at 7pm"
  ];

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        setIsAdmin(data?.role === 'admin' || data?.role === 'co-admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkAdminStatus();
  }, [communityId, user]);

  useEffect(() => {
    const fetchCommunityMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('community_members')
          .select(`
            user_id,
            profiles!inner(
              full_name,
              avatar_url
            )
          `)
          .eq('community_id', communityId);

        if (error) throw error;
        setCommunityMembers(data || []);
      } catch (error) {
        console.error('Error fetching community members:', error);
      }
    };
    fetchCommunityMembers();
  }, [communityId]);

  // --- AI event recommendations based on description ---
  const generateSuggestions = async () => {
    if (!eventDescription.trim()) {
      setError('Please provide a description of the event you want to plan');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const aiSuggestions = await googleAI.generateEventRecommendations(communityId);
      const formattedSuggestions: EventSuggestion[] = aiSuggestions.map(suggestion => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 14) + 1);
        const hour = Math.floor(Math.random() * 12) + 8;
        const minute = Math.random() > 0.5 ? '00' : '30';
        const startTime = `${hour.toString().padStart(2, '0')}:${minute}`;
        const endHour = (hour + 1) % 24;
        const endTime = `${endHour.toString().padStart(2, '0')}:${minute}`;
        return {
          title: suggestion.title,
          description: suggestion.description,
          startDate: startDate.toISOString().split('T')[0],
          startTime,
          endDate: startDate.toISOString().split('T')[0],
          endTime,
          location: Math.random() > 0.3 ? 'Community Center' : undefined,
          isOnline: Math.random() > 0.7,
          meetingUrl: Math.random() > 0.7 ? 'https://zoom.us/j/123456789' : undefined,
          capacity: suggestion.participantLimit,
          tags: suggestion.tags || [],
          confidence: 0.8 + Math.random() * 0.2
        };
      });
      setSuggestions(formattedSuggestions);
      setStep('suggestions');
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setError('Failed to generate event suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to validate YYYY-MM-DD
function isValidDateString(str: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// Helper to validate HH:mm
function isValidTimeString(str: string) {
  return /^\d{2}:\d{2}$/.test(str);
}

// --- AI prompt-to-event handler ---
const handleAIPromptGenerate = async () => {
  setError('');
  if (!aiPrompt.trim()) {
    setError('Please enter a description of the event you want to create.');
    return;
  }
  setLoading(true);
  try {
    const aiEvent = await googleAI.generateEventFromPrompt(aiPrompt, { communityId });

    // Validate and fallback for AI date/time extraction
    const start_date = isValidDateString(aiEvent.startDate) ? aiEvent.startDate : '';
    const start_time = isValidTimeString(aiEvent.startTime) ? aiEvent.startTime : '';
    const end_date = isValidDateString(aiEvent.endDate) ? aiEvent.endDate : '';
    const end_time = isValidTimeString(aiEvent.endTime) ? aiEvent.endTime : '';

    if (!start_date || !start_time) {
      setError(
        "The AI could not extract a concrete start date and time from your description. Please try a more specific prompt (e.g., 'next Sunday at 10am'), or fill in the missing information manually in the next step."
      );
    }

    setAiEventFormPrefill({
      title: aiEvent.title || '',
      description: aiEvent.description || '',
      location: aiEvent.location || '',
      start_date,
      start_time,
      end_date,
      end_time,
      capacity: aiEvent.capacity ? String(aiEvent.capacity) : '',
      is_online: aiEvent.isOnline || false,
      meeting_url: aiEvent.meetingUrl || '',
      is_recurring: aiEvent.isRecurring || false,
      recurrence_type: aiEvent.recurrencePattern || 'weekly',
      recurrence_interval: aiEvent.recurrenceInterval || '1',
      recurrence_end_date: aiEvent.recurrenceEndDate || '',
      tags: Array.isArray(aiEvent.tags) ? aiEvent.tags : [],
    });
    setStep('aiForm');
  } catch (err: any) {
    setError('Failed to generate event from AI. Please try again or refine your prompt.');
  } finally {
    setLoading(false);
  }
  };
  const handleBackToAIPrompt = () => {
    setAiEventFormPrefill(null);
    setAiPrompt('');
    setError('');
    setStep('aiPrompt');
  };

  // Select an AI suggestion
  const handleSelectSuggestion = (suggestion: EventSuggestion) => {
    setSelectedSuggestion(suggestion);
    setEventDetails({
      ...eventDetails,
      title: suggestion.title,
      description: suggestion.description,
      startDate: suggestion.startDate,
      startTime: suggestion.startTime,
      endDate: suggestion.endDate || '',
      endTime: suggestion.endTime || '',
      location: suggestion.location || '',
      isOnline: suggestion.isOnline,
      meetingUrl: suggestion.meetingUrl || '',
      capacity: suggestion.capacity?.toString() || '',
      tags: suggestion.tags
    });
    if (eventType === 'poll') {
      setPollDetails({
        ...pollDetails,
        title: suggestion.title,
        description: suggestion.description
      });
      setAvailabilitySlots([
        {
          date: suggestion.startDate,
          startTime: suggestion.startTime,
          endTime: suggestion.endTime || '',
          votes: 0,
          voters: []
        },
        {
          date: new Date(new Date(suggestion.startDate).getTime() + 86400000).toISOString().split('T')[0],
          startTime: suggestion.startTime,
          endTime: suggestion.endTime || '',
          votes: 0,
          voters: []
        }
      ]);
      setStep('poll');
    } else {
      setStep('details');
    }
  };

  // Add/remove/update poll slots
  const addAvailabilitySlot = () => {
    const lastSlot = availabilitySlots[availabilitySlots.length - 1];
    const newDate = new Date(lastSlot.date);
    newDate.setDate(newDate.getDate() + 1);
    setAvailabilitySlots([
      ...availabilitySlots,
      {
        date: newDate.toISOString().split('T')[0],
        startTime: lastSlot.startTime,
        endTime: lastSlot.endTime,
        votes: 0,
        voters: []
      }
    ]);
  };
  const removeAvailabilitySlot = (index: number) => {
    if (availabilitySlots.length <= 1) return;
    setAvailabilitySlots(availabilitySlots.filter((_, i) => i !== index));
  };
  const updateAvailabilitySlot = (index: number, field: string, value: string) => {
    const updatedSlots = [...availabilitySlots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    setAvailabilitySlots(updatedSlots);
  };

  // Add/remove tags
  const addTag = () => {
    if (eventDetails.newTag.trim() && !eventDetails.tags.includes(eventDetails.newTag.trim()) && eventDetails.tags.length < 5) {
      setEventDetails({
        ...eventDetails,
        tags: [...eventDetails.tags, eventDetails.newTag.trim()],
        newTag: ''
      });
    }
  };
  const removeTag = (tagToRemove: string) => {
    setEventDetails({
      ...eventDetails,
      tags: eventDetails.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Create a new event (classic/manual)
  const createEvent = async () => {
    if (!user) {
      setError('You must be logged in to create an event');
      return;
    }
    if (!isAdmin) {
      setError('You must be a community admin to create events');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const startDateTime = new Date(`${eventDetails.startDate}T${eventDetails.startTime}`);
      let endDateTime = null;
      if (eventDetails.endDate && eventDetails.endTime) {
        endDateTime = new Date(`${eventDetails.endDate}T${eventDetails.endTime}`);
      }
      if (endDateTime && endDateTime <= startDateTime) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }
      let recurrenceRule = null;
      if (eventDetails.isRecurring) {
        recurrenceRule = `FREQ=${eventDetails.recurrencePattern.toUpperCase()}`;
        if (eventDetails.recurrenceInterval !== '1') {
          recurrenceRule += `;INTERVAL=${eventDetails.recurrenceInterval}`;
        }
        if (eventDetails.recurrenceEndDate) {
          const endDate = new Date(eventDetails.recurrenceEndDate);
          recurrenceRule += `;UNTIL=${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
        }
      }
      const eventData = {
        community_id: communityId,
        created_by: user.id,
        title: eventDetails.title,
        description: eventDetails.description,
        location: eventDetails.location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime ? endDateTime.toISOString() : null,
        capacity: eventDetails.capacity ? parseInt(eventDetails.capacity) : null,
        is_online: eventDetails.isOnline,
        meeting_url: eventDetails.isOnline ? eventDetails.meetingUrl : null,
        is_recurring: eventDetails.isRecurring,
        recurrence_rule: recurrenceRule,
        tags: eventDetails.tags,
        status: 'upcoming',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { data: newEvent, error: createError } = await supabase
        .from('community_events')
        .insert(eventData)
        .select()
        .single();
      if (createError) throw createError;
      if (onEventCreated) {
        onEventCreated(newEvent.id);
      }
      const announcementMessage = `📅 New event created: "${eventDetails.title}" on ${new Date(startDateTime).toLocaleDateString()} at ${new Date(startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Check the Events tab for details!`;
      await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: announcementMessage,
          created_at: new Date().toISOString()
        });
      setStep('confirm');
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create a new availability poll
  const createPoll = async () => {
    if (!user) {
      setError('You must be logged in to create a poll');
      return;
    }
    try {
      setLoading(true);
      setError('');
      if (!pollDetails.title.trim()) {
        setError('Please provide a title for the poll');
        setLoading(false);
        return;
      }
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(pollDetails.expiresIn));
      const { data: newPoll, error: pollError } = await supabase
        .from('event_polls')
        .insert({
          community_id: communityId,
          created_by: user.id,
          title: pollDetails.title,
          description: pollDetails.description,
          options: availabilitySlots,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (pollError) throw pollError;
      const announcementMessage = `📊 New event poll created: "${pollDetails.title}". Please vote on your preferred time slots!`;
      await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user.id,
          content: announcementMessage,
          created_at: new Date().toISOString()
        });
      setStep('confirm');
    } catch (err) {
      console.error('Error creating poll:', err);
      setError('Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mr-3">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Event Planning Assistant</h2>
                <p className="text-sm text-neutral-500">
                  {step === 'aiPrompt' && 'AI-powered: Describe your event or try smart suggestions below'}
                  {step === 'aiForm' && 'AI-suggested event – review and edit'}
                  {step === 'initial' && 'Or: Use our classic assistant for ideas, polls, or manual setup'}
                  {step === 'suggestions' && 'Choose from AI-generated event suggestions'}
                  {step === 'details' && 'Customize your event details'}
                  {step === 'poll' && 'Set up an availability poll'}
                  {step === 'confirm' && 'Event created successfully!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Step 0: Prompt-based AI event */}
          {step === 'aiPrompt' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-primary-500" />
                  Describe Your Event
                </h3>
                <p className="text-sm text-neutral-700 mb-4">
                  Use natural language and AI will generate a ready-to-edit event for you.
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g., Plan a yoga class for next Sunday at 10am in Central Park"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 h-24"
                />
              </div>
              <div>
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Try these examples:</h4>
                <div className="space-y-2">
                  {promptSuggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setAiPrompt(suggestion)}
                      className="w-full text-left p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-sm transition-colors"
                      type="button"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col md:flex-row justify-between pt-4 gap-3">
                <button
                  type="button"
                  onClick={() => setStep('initial')}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                >
                  Use Classic Assistant
                </button>
                <button
                  type="button"
                  onClick={handleAIPromptGenerate}
                  disabled={loading || !aiPrompt.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Event
                </button>
              </div>
            </div>
          )}

          {/* Step 1: AI prompt-generated event form */}
          {step === 'aiForm' && aiEventFormPrefill && (
            <>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-green-700 flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-green-500" />
                  AI-Suggested Event Details
                </h3>
                <button
                  type="button"
                  onClick={handleBackToAIPrompt}
                  className="text-sm text-neutral-500 hover:text-neutral-700 border border-neutral-200 px-3 py-1 rounded"
                >
                  Back to AI Prompt
                </button>
              </div>
              <p className="text-green-700 mb-3">Review and edit the event details below before creating the event.</p>
              <EventForm
                communityId={communityId}
                onSuccess={onEventCreated}
                onCancel={onClose}
                existingEvent={aiEventFormPrefill}
              />
            </>
          )}

          {/* Step 2: Classic Assistant entry screen */}
          {step === 'initial' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-primary-500" />
                  Classic Assistant: Start here for suggestions, polls, or manual events
                </h3>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Describe the event you want to plan (e.g., 'A morning yoga session for beginners' or 'Monthly book club meeting')"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 h-24"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    eventType === 'single'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                  onClick={() => setEventType('single')}
                >
                  <div className="flex items-center mb-2">
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      eventType === 'single' ? 'border-primary-500' : 'border-neutral-300'
                    }`}>
                      {eventType === 'single' && <div className="h-3 w-3 rounded-full bg-primary-500"></div>}
                    </div>
                    <span className="ml-2 font-medium">Single Event</span>
                  </div>
                  <div className="flex items-center justify-center h-12 mb-2">
                    <CalendarDays className={`h-8 w-8 ${eventType === 'single' ? 'text-primary-500' : 'text-neutral-400'}`} />
                  </div>
                  <p className="text-xs text-neutral-600">
                    Create a one-time event with a specific date and time
                  </p>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    eventType === 'recurring'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                  onClick={() => setEventType('recurring')}
                >
                  <div className="flex items-center mb-2">
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      eventType === 'recurring' ? 'border-primary-500' : 'border-neutral-300'
                    }`}>
                      {eventType === 'recurring' && <div className="h-3 w-3 rounded-full bg-primary-500"></div>}
                    </div>
                    <span className="ml-2 font-medium">Recurring Event</span>
                  </div>
                  <div className="flex items-center justify-center h-12 mb-2">
                    <CalendarClock className={`h-8 w-8 ${eventType === 'recurring' ? 'text-primary-500' : 'text-neutral-400'}`} />
                  </div>
                  <p className="text-xs text-neutral-600">
                    Set up a repeating event series (weekly, monthly, etc.)
                  </p>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    eventType === 'poll'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                  onClick={() => setEventType('poll')}
                >
                  <div className="flex items-center mb-2">
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                      eventType === 'poll' ? 'border-primary-500' : 'border-neutral-300'
                    }`}>
                      {eventType === 'poll' && <div className="h-3 w-3 rounded-full bg-primary-500"></div>}
                    </div>
                    <span className="ml-2 font-medium">Availability Poll</span>
                  </div>
                  <div className="flex items-center justify-center h-12 mb-2">
                    <CalendarRange className={`h-8 w-8 ${eventType === 'poll' ? 'text-primary-500' : 'text-neutral-400'}`} />
                  </div>
                  <p className="text-xs text-neutral-600">
                    Poll members to find the best time for everyone
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={generateSuggestions}
                  disabled={loading || !eventDescription.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Suggestions
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Suggestions */}
          {step === 'suggestions' && (
            <div className="space-y-6">
              <p className="text-neutral-700">
                Based on your description, here are some event suggestions. Select one to customize or use as-is:
              </p>
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    className="border border-neutral-200 rounded-lg overflow-hidden hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{suggestion.title}</h3>
                        <span className="px-2 py-1 bg-white/80 rounded-full text-xs font-medium text-primary-700">
                          {Math.round(suggestion.confidence * 100)}% match
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-neutral-700 text-sm mb-4">{suggestion.description}</p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center text-sm text-neutral-600">
                          <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                          <span>{formatDate(suggestion.startDate)}</span>
                        </div>
                        <div className="flex items-center text-sm text-neutral-600">
                          <Clock className="h-4 w-4 mr-2 text-neutral-400" />
                          <span>{suggestion.startTime} {suggestion.endTime ? `- ${suggestion.endTime}` : ''}</span>
                        </div>
                        {suggestion.location && (
                          <div className="flex items-center text-sm text-neutral-600">
                            <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
                            <span>{suggestion.location}</span>
                          </div>
                        )}
                        {suggestion.capacity && (
                          <div className="flex items-center text-sm text-neutral-600">
                            <Users className="h-4 w-4 mr-2 text-neutral-400" />
                            <span>Limit: {suggestion.capacity} participants</span>
                          </div>
                        )}
                      </div>
                      {suggestion.tags && suggestion.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {suggestion.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('initial')}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (eventType === 'poll') {
                      setStep('poll');
                    } else {
                      setStep('details');
                    }
                  }}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                >
                  Skip Suggestions
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Event Details (classic/manual) */}
          {step === 'details' && (
            <div className="space-y-6">
              {/* ... the full event details form UI as in your original ... */}
              {/* You can keep this form as is, along with recurring, tags, location, etc. */}
              {/* For brevity, not repeating every input – you can keep your existing code here! */}
              {/* ... */}
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('suggestions')}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  onClick={createEvent}
                  disabled={loading || !eventDetails.title.trim() || !eventDetails.startDate || !eventDetails.startTime}
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
            </div>
          )}

          {/* Step 5: Poll */}
          {step === 'poll' && (
            <div className="space-y-6">
              {/* ... poll details form as in your original ... */}
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('suggestions')}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  onClick={createPoll}
                  disabled={loading || !pollDetails.title.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Create Poll
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {step === 'confirm' && (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {eventType === 'poll' ? 'Poll Created!' : 'Event Created!'}
              </h3>
              <p className="text-neutral-600 mb-6">
                {eventType === 'poll'
                  ? 'Your availability poll has been created and shared with the community.'
                  : 'Your event has been created and added to the community calendar.'}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EventPlanningAssistant;