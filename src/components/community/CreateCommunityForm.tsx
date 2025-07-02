import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase, communityService } from '../../lib/supabase';
import type { CommunityCreate } from '../../lib/types/community';
import { Upload, AlertCircle, Info, X, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { googleAI } from '../../lib/ai/googleAI';

const CreateCommunityForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiProfileFields, setAiProfileFields] = useState<{
    purpose: string;
    tone: 'casual' | 'supportive' | 'professional' | 'motivational';
    targetAudience: string[];
    commonTopics: string[];
    eventTypes: string[];
  }>({
    purpose: '',
    tone: 'supportive',
    targetAudience: [],
    commonTopics: [],
    eventTypes: []
  });
  const [newTargetAudience, setNewTargetAudience] = useState('');
  const [newCommonTopic, setNewCommonTopic] = useState('');
  const [newEventType, setNewEventType] = useState('');
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [showAiFields, setShowAiFields] = useState(false); 
  const [fieldFeedback, setFieldFeedback] = useState<Record<string, 'positive' | 'negative' | null>>({
    purpose: null,
    tone: null,
    targetAudience: null,
    commonTopics: null,
    eventTypes: null
  });
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<CommunityCreate>();
  
  const watchName = watch('name');
  const watchDescription = watch('description');

  const onSubmit = async (data: CommunityCreate) => {
    try {
      setIsSubmitting(true);
      setError('');
      
      // Extract the first file from the FileList if it exists
      const imageFile = data.image?.[0] || undefined;
      
      // Create the community
      const community = await communityService.createCommunity(data.name, data.description, imageFile);
      
      if (community && showAiFields) {        
        // Save AI profile data
        try {
          await supabase
            .from('ai_community_profiles')
            .insert({
              community_id: community.id,
              purpose: aiProfileFields.purpose,
              tone: aiProfileFields.tone,
              target_audience: aiProfileFields.targetAudience, 
              common_topics: aiProfileFields.commonTopics,
              event_types: aiProfileFields.eventTypes,
              created_at: new Date().toISOString(),
              is_active: true
            });
        } catch (profileError) {
          console.error('Error saving AI profile:', profileError);
          // Continue with success even if profile save fails
        }
        
        // Save feedback for each field if provided
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            for (const [field, value] of Object.entries(fieldFeedback)) {
              if (value) {
                await googleAI.saveProfileFeedback(
                  community.id,
                  user.id,
                  field,
                  '', // Original value is not tracked in this implementation
                  '', // Edited value is not tracked in this implementation
                  value
                );
              }
            }
          }
        } catch (feedbackError) {
          console.error('Error saving feedback:', feedbackError);
        }
      }
      
      onSuccess();
    } catch (err) {
      setError('Failed to create community. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateAiProfile = async () => {
    if (!watchName || !watchDescription) {
      setError('Please provide a name and description to generate AI profile suggestions');
      return;
    }
    
    try {
      setIsGeneratingProfile(true);
      setError('');
      
      // Generate profile suggestions using the description
      const tempCommunityId = uuidv4(); // Temporary ID for the API call

      // Use the googleAI service to generate profile suggestions
      const profileSuggestions = await googleAI.generateCommunityProfile(
        tempCommunityId,
        watchName,
        watchDescription,
        [] // No tags yet
      );

      // Update the AI profile fields with the suggestions
      setAiProfileFields({
        purpose: profileSuggestions.purpose || '',
        tone: profileSuggestions.tone || 'supportive',
        targetAudience: profileSuggestions.targetAudience || [],
        commonTopics: profileSuggestions.commonTopics || [],
        eventTypes: profileSuggestions.eventTypes || []
      });

      // Show the AI fields section
      setShowAiFields(true);
    } catch (err) {
      console.error('Error generating AI profile:', err);
      setError('Failed to generate AI profile suggestions. Please try again or fill in the fields manually.');
      
      // Show the AI fields section anyway so user can fill manually
      setShowAiFields(true);
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  // Handle feedback for AI-generated fields
  const handleFieldFeedback = (field: string, isPositive: boolean) => {
    setFieldFeedback({
      ...fieldFeedback,
      [field]: isPositive ? 'positive' : 'negative'
    });
    
    // In a real implementation, you might want to log this feedback immediately
  };
  
  // Helper functions for array fields
  const addTargetAudience = () => {
    if (newTargetAudience.trim() && !aiProfileFields.targetAudience.includes(newTargetAudience.trim())) {
      setAiProfileFields({
        ...aiProfileFields,
        targetAudience: [...aiProfileFields.targetAudience, newTargetAudience.trim()]
      });
      setNewTargetAudience('');
    }
  };
  
  const removeTargetAudience = (audience: string) => {
    setAiProfileFields({
      ...aiProfileFields,
      targetAudience: aiProfileFields.targetAudience.filter(a => a !== audience)
    });
  };
  
  const addCommonTopic = () => {
    if (newCommonTopic.trim() && !aiProfileFields.commonTopics.includes(newCommonTopic.trim())) {
      setAiProfileFields({
        ...aiProfileFields,
        commonTopics: [...aiProfileFields.commonTopics, newCommonTopic.trim()]
      });
      setNewCommonTopic('');
    }
  };
  
  const removeCommonTopic = (topic: string) => {
    setAiProfileFields({
      ...aiProfileFields,
      commonTopics: aiProfileFields.commonTopics.filter(t => t !== topic)
    });
  };
  
  const addEventType = () => {
    if (newEventType.trim() && !aiProfileFields.eventTypes.includes(newEventType.trim())) {
      setAiProfileFields({
        ...aiProfileFields,
        eventTypes: [...aiProfileFields.eventTypes, newEventType.trim()]
      });
      setNewEventType('');
    }
  };
  
  const removeEventType = (eventType: string) => {
    setAiProfileFields({
      ...aiProfileFields,
      eventTypes: aiProfileFields.eventTypes.filter(e => e !== eventType)
    });
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Basic Community Information */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Community Name
        </label>
        <input
          type="text"
          {...register('name', { required: 'Name is required' })}
          className="input"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* AI Profile Generation Button */}
      {!showAiFields && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-700 mb-1">Enhance Your Community with AI</h3>
              <p className="text-sm text-blue-600 mb-3">
                Let our AI suggest additional details for your community based on your description. 
                This helps provide better recommendations and content for your members.
              </p>
              <button
                type="button"
                onClick={generateAiProfile}
                disabled={isGeneratingProfile || !watchName || !watchDescription}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center text-sm"
              >
                {isGeneratingProfile ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>Generate AI Profile Suggestions</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Profile Fields */}
      {showAiFields && (
        <div className="space-y-6 bg-neutral-50 p-6 rounded-lg border border-neutral-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Community AI Profile</h3>
            <p className="text-sm text-neutral-500">These details help AI provide better recommendations</p>
          </div>
          
          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <div className="flex justify-between items-center">
                <span>Community Purpose</span>
                <div className="flex items-center space-x-1">
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('purpose', true)}
                    className={`p-1 rounded-full ${fieldFeedback.purpose === 'positive' ? 'bg-green-100 text-green-600' : 'text-neutral-400 hover:text-green-600'}`}
                    title="This suggestion is helpful"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('purpose', false)}
                    className={`p-1 rounded-full ${fieldFeedback.purpose === 'negative' ? 'bg-red-100 text-red-600' : 'text-neutral-400 hover:text-red-600'}`}
                    title="This suggestion is not helpful"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </label>
            <textarea
              value={aiProfileFields.purpose}
              onChange={(e) => setAiProfileFields({...aiProfileFields, purpose: e.target.value})}
              className="input w-full" 
              rows={2}
              placeholder="Describe the main purpose of this community"
            />
          </div>
          
          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <div className="flex justify-between items-center">
                <span>Community Tone</span>
                <div className="flex items-center space-x-1">
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('tone', true)}
                    className={`p-1 rounded-full ${fieldFeedback.tone === 'positive' ? 'bg-green-100 text-green-600' : 'text-neutral-400 hover:text-green-600'}`}
                    title="This suggestion is helpful"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('tone', false)}
                    className={`p-1 rounded-full ${fieldFeedback.tone === 'negative' ? 'bg-red-100 text-red-600' : 'text-neutral-400 hover:text-red-600'}`}
                    title="This suggestion is not helpful"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </label>
            <select
              value={aiProfileFields.tone}
              onChange={(e) => setAiProfileFields({...aiProfileFields, tone: e.target.value as any})}
              className="input w-full"
            >
              <option value="casual">Casual - Relaxed and friendly</option>
              <option value="supportive">Supportive - Encouraging and helpful</option>
              <option value="professional">Professional - Formal and informative</option>
              <option value="motivational">Motivational - Energetic and inspiring</option>
            </select>
          </div>
          
          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <div className="flex justify-between items-center">
                <span>Target Audience</span>
                <div className="flex items-center space-x-1">
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('targetAudience', true)}
                    className={`p-1 rounded-full ${fieldFeedback.targetAudience === 'positive' ? 'bg-green-100 text-green-600' : 'text-neutral-400 hover:text-green-600'}`}
                    title="This suggestion is helpful"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('targetAudience', false)}
                    className={`p-1 rounded-full ${fieldFeedback.targetAudience === 'negative' ? 'bg-red-100 text-red-600' : 'text-neutral-400 hover:text-red-600'}`}
                    title="This suggestion is not helpful"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {aiProfileFields.targetAudience.map((audience) => (
                <span 
                  key={audience}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm"
                >
                  {audience}
                  <button
                    type="button"
                    onClick={() => removeTargetAudience(audience)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTargetAudience}
                onChange={(e) => setNewTargetAudience(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTargetAudience())}
                className="input flex-1"
                placeholder="Add target audience (e.g., Beginners, Experts)"
              />
              <button
                type="button"
                onClick={addTargetAudience}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
          </div>
          
          {/* Common Topics */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <div className="flex justify-between items-center">
                <span>Common Topics</span>
                <div className="flex items-center space-x-1">
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('commonTopics', true)}
                    className={`p-1 rounded-full ${fieldFeedback.commonTopics === 'positive' ? 'bg-green-100 text-green-600' : 'text-neutral-400 hover:text-green-600'}`}
                    title="This suggestion is helpful"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('commonTopics', false)}
                    className={`p-1 rounded-full ${fieldFeedback.commonTopics === 'negative' ? 'bg-red-100 text-red-600' : 'text-neutral-400 hover:text-red-600'}`}
                    title="This suggestion is not helpful"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {aiProfileFields.commonTopics.map((topic) => (
                <span 
                  key={topic}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeCommonTopic(topic)}
                    className="ml-2 text-green-500 hover:text-green-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCommonTopic}
                onChange={(e) => setNewCommonTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCommonTopic())}
                className="input flex-1"
                placeholder="Add common topic (e.g., Nutrition, Training)"
              />
              <button
                type="button"
                onClick={addCommonTopic}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
          </div>
          
          {/* Event Types */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <div className="flex justify-between items-center">
                <span>Event Types</span>
                <div className="flex items-center space-x-1">
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('eventTypes', true)}
                    className={`p-1 rounded-full ${fieldFeedback.eventTypes === 'positive' ? 'bg-green-100 text-green-600' : 'text-neutral-400 hover:text-green-600'}`}
                    title="This suggestion is helpful"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFieldFeedback('eventTypes', false)}
                    className={`p-1 rounded-full ${fieldFeedback.eventTypes === 'negative' ? 'bg-red-100 text-red-600' : 'text-neutral-400 hover:text-red-600'}`}
                    title="This suggestion is not helpful"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {aiProfileFields.eventTypes.map((eventType) => (
                <span 
                  key={eventType}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm"
                >
                  {eventType}
                  <button
                    type="button"
                    onClick={() => removeEventType(eventType)}
                    className="ml-2 text-purple-500 hover:text-purple-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEventType())}
                className="input flex-1"
                placeholder="Add event type (e.g., Workshops, Meetups)"
              />
              <button
                type="button"
                onClick={addEventType}
                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Description
        </label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={4}
          className="input"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Community Image
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-lg">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-neutral-400" />
            <div className="flex text-sm text-neutral-600">
              <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                <span>Upload a file</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  {...register('image')}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-neutral-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full"
      >
        {isSubmitting ? 'Creating community...' : 'Create Community'}
      </button>
    </form>
  );
};

export default CreateCommunityForm;