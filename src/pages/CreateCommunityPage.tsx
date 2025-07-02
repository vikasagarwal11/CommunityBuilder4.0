import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, AlertCircle, ArrowLeft, Tag, X, Info, Lightbulb, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { googleAI } from '../lib/ai/googleAI';

interface CreateCommunityForm {
  name: string;
  description: string;
  image?: FileList;
  aiFeedback?: string; // New optional field for AI feedback
}

const CreateCommunityPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiProfileData, setAiProfileData] = useState<any>(null);
  const [useAI, setUseAI] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingFromPrompt, setGeneratingFromPrompt] = useState(false);
  const [showAiProfile, setShowAiProfile] = useState(true); // Control AI profile visibility

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreateCommunityForm>();

  const watchedImage = watch('image');
  const watchedName = watch('name');
  const watchedDescription = watch('description');

  // Handle image preview
  React.useEffect(() => {
    if (watchedImage && watchedImage[0]) {
      const file = watchedImage[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [watchedImage]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

 const generateFromPrompt = async () => {
  if (!aiPrompt.trim()) {
    setError('Please enter a prompt to generate community details');
    return;
  }

  try {
    setGeneratingFromPrompt(true);
    setError('');
    setShowAiProfile(true); // Show AI profile during generation

    const response = await googleAI.generateCommunityProfileSuggestions('', aiPrompt, []);
    console.log('AI Response:', response); // Debug the response
    setValue('name', response.name || `Community Based on ${aiPrompt.split(' ')[0]}`); // Fallback name
    setValue('description', response.description || aiPrompt.replace('timefor themselve', 'time for themselves')); // Refine description
    setTags(response.tags?.slice(0, 5) || response.target_audience?.slice(0, 5) || []);

    // Minimize AI profile data to essential metadata
    setAiProfileData({
      purpose: response.purpose,
      tone: response.tone
    });

    // Hide AI profile section if description is populated
    if (response.description) {
      setShowAiProfile(false);
    }
  } catch (err) {
    console.error('Error generating from prompt:', err);
    setError('Failed to generate community details. Please try again or fill in the form manually.');
  } finally {
    setGeneratingFromPrompt(false);
  }
};

  const onSubmit = async (data: CreateCommunityForm) => {
    if (!user) {
      setError('You must be logged in to create a community');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      let imageUrl = '';
      
      // Upload image if provided
      if (data.image && data.image[0]) {
        const file = data.image[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('community-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('community-images')
            .getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
      }

      // Create community
      const { data: community, error: createError } = await supabase
        .from('communities')
        .insert({
          name: data.name,
          description: data.description,
          image_url: imageUrl,
          created_by: user.id,
          tags: tags,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Save AI profile and feedback if enabled
      if (useAI && (aiProfileData || (data.name && data.description))) {
        try {
          let profileToSave = aiProfileData;
          if (!profileToSave) {
            const generatedProfile = await googleAI.generateAndLogCommunityProfile(
              community.id,
              data.name,
              data.description,
              tags
            );
            profileToSave = {
              purpose: generatedProfile.purpose,
              tone: generatedProfile.tone,
              targetAudience: generatedProfile.target_audience || [],
              commonTopics: generatedProfile.common_topics || [],
              eventTypes: generatedProfile.event_types || []
            };
          }

          await supabase
            .from('ai_community_profiles')
            .insert({
              community_id: community.id,
              purpose: profileToSave.purpose,
              tone: profileToSave.tone,
              target_audience: profileToSave.targetAudience,
              common_topics: profileToSave.commonTopics,
              event_types: profileToSave.eventTypes,
              feedback: data.aiFeedback || null, // Store feedback if provided
              created_at: new Date().toISOString(),
              is_active: true
            });
        } catch (profileError) {
          console.error('Error saving AI profile:', profileError);
        }
      }

      navigate(`/community/${community.id}`);
    } catch (err: any) {
      console.error('Error creating community:', err);
      setError(err.message || 'Failed to create community. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
        <div className="container max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-semibold mb-4">Login Required</h1>
            <p className="text-neutral-600 mb-6">
              You need to be logged in to create a community.
            </p>
            <Link to="/login" className="btn-primary">
              Login to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container max-w-2xl">
        <div className="mb-6">
          <Link 
            to="/communities" 
            className="inline-flex items-center text-neutral-600 hover:text-neutral-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communities
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-semibold mb-6">Create New Community</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* AI-Powered Community Creation */}
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
            <div className="flex items-start">
              <Sparkles className="h-6 w-6 text-purple-500 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-2">AI-Powered Community Creation</h3>
                <p className="text-neutral-700 mb-4">
                  Let our AI help you create a community by generating details from your description or prompt.
                </p>
                
                <div className="mb-4">
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 mr-2"
                    />
                    <span className="text-neutral-700">Enable AI assistance for this community</span>
                  </label>
                  <p className="text-sm text-neutral-500 ml-6">
                    AI will analyze your community details to provide better recommendations and content.
                  </p>
                </div>
                
                {useAI && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Describe your community idea
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={3}
                        className="input w-full"
                        placeholder="E.g., I want to create a community for moms who are interested in plant care and gardening as a way to reduce stress and connect with nature..."
                      />
                    </div>
                    
                    <button
                      onClick={generateFromPrompt}
                      disabled={generatingFromPrompt || !aiPrompt.trim()}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center"
                    >
                      {generatingFromPrompt ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Generate Community Details
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Community Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Community Name *
              </label>
              <input
                type="text"
                {...register('name', { 
                  required: 'Community name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' },
                  maxLength: { value: 50, message: 'Name must be less than 50 characters' }
                })}
                className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g., Plant Care Tips for Moms"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', { 
                  required: 'Description is required',
                  minLength: { value: 20, message: 'Description must be at least 20 characters' },
                  maxLength: { value: 500, message: 'Description must be less than 500 characters' }
                })}
                rows={4}
                className={`input ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Describe what your community is about, who should join, and what members can expect..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Tags (Optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span 
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm"
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
                  className="input flex-1"
                  placeholder="Add a tag (e.g., plants, gardening, stress-relief)"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={!newTag.trim() || tags.length >= 5}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Add up to 5 tags to help people find your community
              </p>
            </div>

            {/* Community Image */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Community Image (Optional)
              </label>
              
              {imagePreview ? (
                <div className="mb-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="mt-2 text-sm text-neutral-600 hover:text-neutral-800"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                  <div className="flex text-sm text-neutral-600">
                    <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                      <span>Upload an image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        {...register('image')}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>

            {/* AI Feedback (Optional) */}
            {useAI && watchedName && watchedDescription && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  AI Feedback (Optional)
                </label>
                <textarea
                  {...register('aiFeedback')}
                  rows={2}
                  className="input w-full"
                  placeholder="Was the AI-generated content helpful? Provide feedback to improve it (e.g., 'Great suggestions!' or 'Needs more tags')."
                />
                <p className="mt-1 text-sm text-neutral-500">
                  Your feedback helps us enhance AI learning.
                </p>
              </div>
            )}

            {/* Minimal AI Profile (Optional Metadata) */}
            {useAI && showAiProfile && aiProfileData && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                  AI Community Profile (Optional Metadata)
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-blue-600">Purpose: {aiProfileData.purpose}</p>
                  <p className="text-sm text-blue-600">Tone: {aiProfileData.tone}</p>
                </div>
                <p className="text-xs text-blue-500 mt-2">
                  This metadata will enhance your community with personalized recommendations.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <Link 
                to="/communities"
                className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn-primary"
              >
                {isSubmitting ? 'Creating Community...' : 'Create Community'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunityPage;