import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { intentDetectionService } from '../../lib/ai/modules/intentDetection';
import { Calendar, Clock, MapPin, Users, Link as LinkIcon, Upload, Tag, X, Plus, Info, Sparkles, Wand2 } from 'lucide-react';
// ---- Community Pulse Store START ----
import {
  getPulseIdeas,
  addPulseIdea,
  votePulseIdea,
  PulseIdea,
} from '../../store/communityPulseStore.ts';
// ---- Community Pulse Store END ----

interface EventFormProps {
  communityId: string;
  onSuccess: (eventId: string) => void;
  onCancel: () => void;
  existingEvent?: any; // For editing existing events or AI prefill
  showAIOption?: boolean; // Show AI-based field extraction option
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  capacity: string;
  is_online: boolean;
  meeting_url: string;
  is_recurring: boolean;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrence_interval: string;
  recurrence_end_date: string;
  image?: FileList;
  tags: string[];
}

const DEFAULT_TIME = "09:00";
const today = new Date().toISOString().split('T')[0];

function safeDateParse(date?: string, time?: string) {
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}`);
  return isNaN(dt.getTime()) ? null : dt;
}

const EventForm = ({ communityId, onSuccess, onCancel, existingEvent, showAIOption = false }: EventFormProps) => {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(existingEvent?.image_url || null);
  const [newTag, setNewTag] = useState('');
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(existingEvent?.is_recurring || false);
  
  // AI-based field extraction state
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // ---- Community Pulse State START ----
  const [pulseIdeas, setPulseIdeas] = useState<PulseIdea[]>(getPulseIdeas());
  const [newIdea, setNewIdea] = useState('');
  const [voteUpdate, setVoteUpdate] = useState(0);
  // ---- Community Pulse State END ----

  // Extract start/end dates/times safely for AI or partial data
  function extractDate(val?: string) {
    if (!val) return today;
    try {
      return new Date(val).toISOString().split('T')[0];
    } catch {
      return today;
    }
  }
  function extractTime(val?: string) {
    if (!val) return DEFAULT_TIME;
    try {
      return new Date(val).toTimeString().slice(0, 5);
    } catch {
      return DEFAULT_TIME;
    }
  }

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<EventFormData>({
    defaultValues: existingEvent ? {
      title: existingEvent.title || '',
      description: existingEvent.description || '',
      location: existingEvent.location || '',
      start_date: existingEvent.start_date
        || extractDate(existingEvent.start_time)
        || today,
      start_time: existingEvent.start_time
        ? extractTime(existingEvent.start_time)
        : DEFAULT_TIME,
      end_date: existingEvent.end_date
        || extractDate(existingEvent.end_time),
      end_time: existingEvent.end_time
        ? extractTime(existingEvent.end_time)
        : '',
      capacity: existingEvent.capacity?.toString() || '',
      is_online: existingEvent.is_online || false,
      meeting_url: existingEvent.meeting_url || '',
      is_recurring: existingEvent.is_recurring || false,
      recurrence_type: existingEvent.recurrence_type || 'weekly',
      recurrence_interval: existingEvent.recurrence_interval || '1',
      recurrence_end_date: existingEvent.recurrence_end_date || '',
      tags: Array.isArray(existingEvent.tags) ? existingEvent.tags : [],
    } : {
      title: '',
      description: '',
      location: '',
      start_date: today,
      start_time: DEFAULT_TIME,
      end_date: '',
      end_time: '',
      capacity: '',
      is_online: false,
      meeting_url: '',
      is_recurring: false,
      recurrence_type: 'weekly',
      recurrence_interval: '1',
      recurrence_end_date: '',
      tags: [],
    }
  });

  const watchedImage = watch('image');
  const watchedIsOnline = watch('is_online');
  const watchedIsRecurring = watch('is_recurring');
  const watchedRecurrenceType = watch('recurrence_type');
  const watchedTags = watch('tags') || [];

  // ---- Community Pulse Handlers START ----
  const handlePulseSelect = (idea: PulseIdea) => {
    setValue('title', idea.text, { shouldValidate: true });
  };
  const handleSuggest = () => {
    if (newIdea.trim()) {
      addPulseIdea(newIdea.trim());
      setPulseIdeas(getPulseIdeas());
      setNewIdea('');
    }
  };
  const handleVote = (id: string) => {
    votePulseIdea(id);
    setVoteUpdate(voteUpdate + 1);
    setPulseIdeas(getPulseIdeas());
  };
  // ---- Community Pulse Handlers END ----

  // Generate RRULE string for recurring events
  const generateRRule = (data: EventFormData): string | null => {
    if (!data.is_recurring) return null;
    let rrule = 'FREQ=';
    switch (data.recurrence_type) {
      case 'daily':
        rrule += 'DAILY'; break;
      case 'weekly':
        rrule += 'WEEKLY'; break;
      case 'monthly':
        rrule += 'MONTHLY'; break;
      case 'custom':
        return data.recurrence_interval; // Custom RRULE string
      default:
        rrule += 'WEEKLY';
    }
    if (data.recurrence_interval && data.recurrence_interval !== '1') {
      rrule += `;INTERVAL=${data.recurrence_interval}`;
    }
    if (data.recurrence_end_date) {
      const endDate = safeDateParse(data.recurrence_end_date, "00:00");
      if (endDate)
        rrule += `;UNTIL=${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }
    return rrule;
  };

  // Handle image preview
  useEffect(() => {
    if (watchedImage && watchedImage[0]) {
      const file = watchedImage[0];
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (!watchedImage && existingEvent?.image_url) {
      setImagePreview(existingEvent.image_url);
    }
  }, [watchedImage, existingEvent?.image_url]);

  useEffect(() => {
    setShowRecurrenceOptions(watchedIsRecurring);
  }, [watchedIsRecurring]);

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim()) && watchedTags.length < 5) {
      setValue('tags', [...watchedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove));
  };

  // AI-based field extraction
  const handleAIExtraction = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Please enter a description of the event you want to create.');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const extractedDetails = await intentDetectionService.extractEventDetailsFromPrompt(aiPrompt, {
        communityId
      });

      // Auto-populate form fields with extracted details
      if (extractedDetails.title) {
        setValue('title', extractedDetails.title);
      }
      if (extractedDetails.description) {
        setValue('description', extractedDetails.description);
      }
      if (extractedDetails.date) {
        setValue('start_date', extractedDetails.date);
      }
      if (extractedDetails.time) {
        setValue('start_time', extractedDetails.time);
      }
      if (extractedDetails.location) {
        setValue('location', extractedDetails.location);
      }
      if (extractedDetails.suggestedCapacity) {
        setValue('capacity', extractedDetails.suggestedCapacity.toString());
      }
      if (extractedDetails.isOnline) {
        setValue('is_online', extractedDetails.isOnline);
      }
      if (extractedDetails.meetingUrl) {
        setValue('meeting_url', extractedDetails.meetingUrl);
      }
      if (extractedDetails.tags && extractedDetails.tags.length > 0) {
        setValue('tags', extractedDetails.tags);
      }

      setShowAIPrompt(false);
      setAiPrompt('');
    } catch (error) {
      console.error('AI extraction failed:', error);
      setAiError('Failed to extract event details. Please try again or fill in the details manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // components/events/EventForm.tsx (partial update)
const onSubmit = async (data: EventFormData) => {
  if (!user) {
    setError('You must be logged in to create an event');
    return;
  }

  try {
    setIsSubmitting(true);
    setError('');

    // Get community profile for context
    const { data: communityProfile } = await supabase
      .from('ai_community_profiles')
      .select('event_types')
      .eq('community_id', communityId)
      .single();

    // Generate tags using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Generate 3-5 relevant tags (each under 20 characters) for this event, considering community event types (${communityProfile?.event_types?.join(', ')}): Title: ${data.title}, Description: ${data.description}. Return JSON: {"tags": ["tag1", "tag2", ...]}`,
          },
        ],
      }),
    });
    const { choices } = await response.json();
    const aiTags = JSON.parse(choices[0]?.message?.content || '{"tags": []}').tags || [];
    const combinedTags = [...new Set([...data.tags, ...aiTags])].slice(0, 5);

    const startDateTime = safeDateParse(data.start_date, data.start_time);
    let endDateTime: Date | null = null;
    if (data.end_date && data.end_time) {
      endDateTime = safeDateParse(data.end_date, data.end_time);
    }

    if (!startDateTime) {
      setError('Please enter a valid start date and time.');
      setIsSubmitting(false);
      return;
    }
    if (endDateTime && endDateTime <= startDateTime) {
      setError('End time must be after start time');
      setIsSubmitting(false);
      return;
    }

    let imageUrl = existingEvent?.image_url || '';
    if (data.image && data.image[0]) {
      const file = data.image[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${communityId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);
      if (uploadError) {
        console.error('Upload error:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }
    }

    const recurrenceRule = generateRRule(data);
    const eventData = {
      community_id: communityId,
      created_by: user.id,
      title: data.title,
      description: data.description,
      location: data.location,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime ? endDateTime.toISOString() : null,
      image_url: imageUrl,
      capacity: data.capacity ? parseInt(data.capacity) : null,
      is_online: data.is_online,
      meeting_url: data.is_online ? data.meeting_url : null,
      is_recurring: data.is_recurring,
      recurrence_rule: recurrenceRule,
      tags: combinedTags,
      updated_at: new Date().toISOString(),
    };

    let eventId;
    if (existingEvent && existingEvent.id) {
      const { data: updatedEvent, error: updateError } = await supabase
        .from('community_events')
        .update(eventData)
        .eq('id', existingEvent.id)
        .select()
        .single();
      if (updateError) throw updateError;
      eventId = updatedEvent.id;
    } else {
      const { data: newEvent, error: createError } = await supabase
        .from('community_events')
        .insert(eventData)
        .select()
        .single();
      if (createError) throw createError;
      eventId = newEvent.id;
    }
    // Log AI operation
    await supabase.from('ai_generation_logs').insert({
      operation_type: 'event_tag_generation',
      status: 'success',
      community_id: communityId,
      created_at: new Date().toISOString(),
    });
      reset();
    onSuccess(eventId);
  } catch (err: any) {
    console.error('Error creating/updating event:', err);
    await supabase.from('ai_generation_logs').insert({
      operation_type: 'event_tag_generation',
      status: 'error',
      community_id: communityId,
      created_at: new Date().toISOString(),
    });
    setError(err.message || 'Failed to save event. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* ---- Community Pulse UI START ---- */}
      <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-700 text-lg sm:text-xl">Community Pulse: Trending Event Ideas</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {pulseIdeas.map((idea) => (
            <span key={idea.id} className="flex items-center border px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 cursor-pointer mr-2 text-sm sm:text-base">
              <button type="button" onClick={() => handlePulseSelect(idea)} className="font-medium">{idea.text}</button>
              <button type="button" className="ml-2 text-blue-700" onClick={() => handleVote(idea.id)}>▲</button>
              <span className="ml-1 text-xs sm:text-sm text-blue-500">{idea.votes}</span>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="Suggest a new event idea"
            className="border px-2 py-1 rounded w-full text-sm sm:text-base"
            value={newIdea}
            onChange={e => setNewIdea(e.target.value)}
            maxLength={120}
          />
          <button type="button" onClick={handleSuggest} className="btn-primary px-4 py-1 text-sm sm:text-base">Suggest</button>
        </div>
      </div>
      {/* ---- Community Pulse UI END ---- */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm sm:text-base">
          <Info className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* AI-based field extraction section */}
      {showAIOption && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-blue-900">AI-Powered Event Creation</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAIPrompt(!showAIPrompt)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              {showAIPrompt ? 'Hide AI' : 'Use AI'}
              <Wand2 className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          {showAIPrompt && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">
                  Describe your event in natural language
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="input w-full h-24 resize-none text-sm"
                  placeholder="e.g., I want to organize a yoga session tomorrow at 6pm in the community center for 15 people. It should be a beginner-friendly class focusing on relaxation."
                />
              </div>
              
              {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{aiError}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAIExtraction}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract Details
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAIPrompt(false);
                    setAiPrompt('');
                    setAiError('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
              
              <p className="text-xs text-blue-700">
                AI will extract event details from your description and auto-populate the form fields below.
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Event Title*</label>
        <input
          type="text"
          {...register('title', {
            required: 'Title is required',
            maxLength: { value: 100, message: 'Title must be less than 100 characters' }
          })}
          className={`input w-full ${errors.title ? 'border-red-500 focus:ring-red-500' : ''} text-sm sm:text-base`}
          placeholder="e.g., Community Meetup"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
        <textarea
          {...register('description', {
            maxLength: { value: 2000, message: 'Description must be less than 2000 characters' }
          })}
          rows={4}
          className={`input w-full ${errors.description ? 'border-red-500 focus:ring-red-500' : ''} text-sm sm:text-base`}
          placeholder="Describe your event, what to expect, what to bring, etc."
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date*</label>
          <div className="relative">
            <input
              type="date"
              {...register('start_date', { required: 'Start date is required' })}
              className={`input pl-10 w-full ${errors.start_date ? 'border-red-500 focus:ring-red-500' : ''} text-sm sm:text-base`}
            />
            <Calendar className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
          </div>
          {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Start Time*</label>
          <div className="relative">
            <input
              type="time"
              {...register('start_time', { required: 'Start time is required' })}
              className={`input pl-10 w-full ${errors.start_time ? 'border-red-500 focus:ring-red-500' : ''} text-sm sm:text-base`}
            />
            <Clock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
          </div>
          {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
          <div className="relative">
            <input
              type="date"
              {...register('end_date')}
              className="input pl-10 w-full text-sm sm:text-base"
            />
            <Calendar className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">End Time</label>
          <div className="relative">
            <input
              type="time"
              {...register('end_time')}
              className="input pl-10 w-full text-sm sm:text-base"
            />
            <Clock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center text-sm font-medium text-neutral-700 mb-1">
            <input
              type="checkbox"
              {...register('is_online')}
              className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 mr-2"
            />
            Online Event
          </label>
          {watchedIsOnline && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Meeting URL</label>
              <div className="relative">
                <input
                  type="url"
                  {...register('meeting_url', {
                    required: watchedIsOnline ? 'Meeting URL is required for online events' : false,
                    pattern: {
                      value: /^https?:\/\/.+\..+/,
                      message: 'Please enter a valid URL'
                    }
                  })}
                  className={`input pl-10 w-full ${errors.meeting_url ? 'border-red-500 focus:ring-red-500' : ''} text-sm sm:text-base`}
                  placeholder="https://zoom.us/j/123456789"
                />
                <LinkIcon className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
              {errors.meeting_url && <p className="mt-1 text-sm text-red-600">{errors.meeting_url.message}</p>}
            </div>
          )}
        </div>
        <div>
          {!watchedIsOnline && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Location</label>
              <div className="relative">
                <input
                  type="text"
                  {...register('location')}
                  className="input pl-10 w-full text-sm sm:text-base"
                  placeholder="e.g., Community Center, 123 Main St"
                />
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Capacity (leave empty for unlimited)</label>
        <div className="relative">
          <input
            type="number"
            {...register('capacity', {
              min: { value: 1, message: 'Capacity must be at least 1' },
              pattern: { value: /^[0-9]*$/, message: 'Please enter a valid number' }
            })}
            className={`input pl-10 w-full ${errors.capacity ? 'border-red-500 focus:ring-red-500' : ''} text-sm sm:text-base`}
            placeholder="e.g., 20"
          />
          <Users className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
        </div>
        {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>}
      </div>

      <div>
        <label className="flex items-center text-sm font-medium text-neutral-700 mb-1">
          <input
            type="checkbox"
            {...register('is_recurring')}
            className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 mr-2"
          />
          Recurring Event
        </label>
        {showRecurrenceOptions && (
          <div className="mt-3 p-4 bg-neutral-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Recurrence Pattern</label>
              <select
                {...register('recurrence_type')}
                className="input w-full text-sm sm:text-base"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom (Advanced)</option>
              </select>
            </div>
            {watchedRecurrenceType !== 'custom' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Repeat every</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    {...register('recurrence_interval', {
                      min: { value: 1, message: 'Must be at least 1' },
                      pattern: { value: /^[0-9]*$/, message: 'Please enter a valid number' }
                    })}
                    className="input w-20 mr-2 text-sm sm:text-base"
                    min="1"
                    defaultValue="1"
                  />
                  <span className="text-neutral-700 text-sm sm:text-base">
                    {watchedRecurrenceType === 'daily' ? 'days' :
                      watchedRecurrenceType === 'weekly' ? 'weeks' : 'months'}
                  </span>
                </div>
              </div>
            )}
            {watchedRecurrenceType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Custom Recurrence Rule (iCalendar RRULE format)</label>
                <input
                  type="text"
                  {...register('recurrence_interval')}
                  className="input w-full text-sm sm:text-base"
                  placeholder="e.g., FREQ=WEEKLY;BYDAY=MO,WE,FR"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  <a
                    href="https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-500 hover:underline"
                  >
                    Learn about RRULE format
                  </a>
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">End Recurrence (optional)</label>
              <div className="relative">
                <input
                  type="date"
                  {...register('recurrence_end_date')}
                  className="input pl-10 w-full text-sm sm:text-base"
                />
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Event Image (optional)</label>
        {imagePreview ? (
          <div className="mb-4 max-w-lg mx-auto">
            <img
              src={imagePreview}
              alt="Event Preview"
              className="w-full h-auto object-contain rounded-lg max-h-96"
              onError={(e) => {
                console.error('Image load error in preview:', e, { url: imagePreview });
                setImagePreview(null); // Clear preview on error
              }}
            />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                setValue('image', undefined);
              }}
              className="mt-2 text-sm text-neutral-600 hover:text-neutral-800"
            >
              Remove image
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center">
            <Upload className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <div className="flex flex-col sm:flex-row text-sm text-neutral-600 justify-center">
              <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                <span>Upload an image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  {...register('image')}
                />
              </label>
              <p className="pl-1 sm:pl-2">or drag and drop</p>
            </div>
            <p className="text-xs text-neutral-500 mt-2">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Tags (optional)</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {watchedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full bg-primary-100 text-primary-700 text-sm"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-2 text-primary-500 hover:text-primary-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="input flex-1 text-sm sm:text-base"
            placeholder="Add a tag (e.g., workshop, meetup, beginner)"
            maxLength={20}
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!newTag.trim() || watchedTags.length >= 5}
            className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50 flex items-center text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-500">Add up to 5 tags to help people find your event</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-center text-sm sm:text-base"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto btn-primary px-6 py-3 text-sm sm:text-base"
        >
          {isSubmitting ? 'Saving...' : existingEvent ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
};

export default EventForm;