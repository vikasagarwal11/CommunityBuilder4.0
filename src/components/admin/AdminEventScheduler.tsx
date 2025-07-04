import React, { useState } from 'react';
import { X, Wand2, Sparkles, AlertTriangle } from 'lucide-react';
import EventForm from '../events/EventForm';
import { intentDetectionService } from '../../lib/ai/modules/intentDetection';

interface AdminEventSchedulerProps {
  communityId: string;
  onClose: () => void;
  onEventCreated: (eventId: string) => void;
}

const AdminEventScheduler: React.FC<AdminEventSchedulerProps> = ({
  communityId,
  onClose,
  onEventCreated
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prefilledEvent, setPrefilledEvent] = useState<any | null>(null);

  // Example prompt suggestions
  const promptSuggestions = [
    "Schedule a morning yoga session for beginners next Tuesday at 8am",
    "Create a monthly book club meeting on the first Thursday of each month at 7pm"
  ];
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

  const handleGenerate = async () => {
    setError('');
    if (!prompt.trim()) {
      setError('Please enter a description of the event you want to create.');
      return;
    }
    setLoading(true);
    try {
      const extractedDetails = await intentDetectionService.extractEventDetailsFromPrompt(prompt, { communityId });

      // Validate and fallback for AI date/time extraction
      const start_date = extractedDetails.date;
      const start_time = extractedDetails.time;

      if (!start_date || !start_time) {
        setError(
          "The AI could not extract a concrete start date and time from your description. Please try a more specific prompt (e.g., 'next Tuesday at 9am'), or fill in the missing information manually in the next step."
        );
      }

      setPrefilledEvent({
        title: extractedDetails.title || '',
        description: extractedDetails.description || '',
        location: extractedDetails.location || '',
        start_date,
        start_time,
        end_date: '', // Will be calculated based on duration
        end_time: '', // Will be calculated based on duration
        capacity: extractedDetails.suggestedCapacity ? String(extractedDetails.suggestedCapacity) : '',
        is_online: extractedDetails.isOnline || false,
        meeting_url: extractedDetails.meetingUrl || '',
        is_recurring: false,
        recurrence_type: 'weekly',
        recurrence_interval: '1',
        recurrence_end_date: '',
        tags: extractedDetails.tags || [],
      });
    } catch (err: any) {
      setError('Failed to generate event from AI. Please try again or refine your prompt.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setPrefilledEvent(null);
    setPrompt('');
    setError('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary-500" />
          AI Event Scheduler
        </h2>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-neutral-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!prefilledEvent ? (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-medium mb-2 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary-500" />
              Describe Your Event
            </h3>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g., Schedule a morning yoga session for beginners next Tuesday at 8am"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 h-24"
            />
          </div>
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Try these examples:</h4>
            <div className="space-y-2">
              {promptSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(suggestion)}
                  className="w-full text-left p-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-sm transition-colors"
                  type="button"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
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
        </>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-green-700 flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-green-500" />
                AI-Suggested Event Details
              </h3>
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-neutral-500 hover:text-neutral-700 border border-neutral-200 px-3 py-1 rounded"
              >
                Back to AI Prompt
              </button>
            </div>
            <p className="text-green-700 mb-3">Review and edit the event details below before creating the event.</p>
          </div>
          <EventForm
            communityId={communityId}
            onSuccess={onEventCreated}
            onCancel={onClose}
            existingEvent={prefilledEvent}
          />
        </>
      )}
    </div>
  );
};

export default AdminEventScheduler;