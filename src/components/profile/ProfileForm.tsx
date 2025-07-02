import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, ProfileUpdate } from '../../lib/supabase';
import { User, Mail, Camera, AlertCircle, Plus, X, Check, Info } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { learningSystem } from '../../lib/ai/learningSystem';

interface ProfileFormData {
  full_name: string;
  bio: string;
  interests?: string[];
  custom_interests?: string[];
  age_range?: string;
  location?: string;
  experience_level?: string;
  preferences: {
    notifications_enabled: boolean;
    private_profile: boolean;
  };
  username?: string;
}

const ProfileForm = ({ profile, onUpdate }: { profile: Profile | null; onUpdate: () => void }) => {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [newInterest, setNewInterest] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');
  
  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<ProfileFormData>({
    defaultValues: {
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      interests: profile?.interests || [],
      custom_interests: profile?.custom_interests || [],
      age_range: profile?.age_range || '',
      location: profile?.location || '',
      experience_level: profile?.experience_level || 'beginner',
      preferences: {
        notifications_enabled: profile?.preferences?.notifications_enabled !== false,
        private_profile: profile?.preferences?.private_profile || false
      },
      username: profile?.username || ''
    }
  });

  const customInterests = watch('custom_interests') || [];
  const username = watch('username');

  // Check username availability when it changes
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username === profile?.username) {
        setUsernameAvailable(true);
        setUsernameMessage('');
        return;
      }
      
      // Username validation
      if (username.length < 3) {
        setUsernameAvailable(false);
        setUsernameMessage('Username must be at least 3 characters');
        return;
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        setUsernameAvailable(false);
        setUsernameMessage('Username can only contain letters, numbers, underscores and hyphens');
        return;
      }
      
      try {
        setCheckingUsername(true);
        
        // Check if username is already taken
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user?.id || '')
          .maybeSingle();
        
        if (error) throw error;
        
        const isAvailable = !data;
        setUsernameAvailable(isAvailable);
        setUsernameMessage(isAvailable ? 'Username is available' : 'Username is already taken');
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameMessage('Error checking username availability');
      } finally {
        setCheckingUsername(false);
      }
    };
    
    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username, profile?.username, user?.id]);

  const addCustomInterest = () => {
    if (newInterest.trim() && !customInterests.includes(newInterest.trim()) && customInterests.length < 5) {
      setValue('custom_interests', [...customInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeCustomInterest = (interest: string) => {
    setValue('custom_interests', customInterests.filter(i => i !== interest));
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true);
      setError('');

      // Validate username if changed
      if (data.username && data.username !== profile?.username) {
        if (!usernameAvailable) {
          setError('Please choose a different username');
          setIsSubmitting(false);
          return;
        }
      }

      if (!user) {
        setError('You must be logged in to update your profile');
        return;
      }

      const updates: ProfileUpdate = {
        full_name: data.full_name,
        bio: data.bio,
        interests: data.interests,
        custom_interests: data.custom_interests,
        age_range: data.age_range,
        location: data.location,
        experience_level: data.experience_level,
        preferences: data.preferences,
        username: data.username,
        updated_at: new Date().toISOString()
      };

      // Update profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update avatar if changed
      if (avatarUrl && avatarUrl !== profile?.avatar_url) {
        // In a real implementation, this would upload the avatar to storage
        // For now, we'll just update the avatar_url in the profile
        const { error: avatarError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);

        if (avatarError) throw avatarError;
      }

      // Trigger AI learning system to regenerate user interest vectors
      try {
        await learningSystem.onUserProfileUpdate(user.id);
      } catch (aiError) {
        console.warn('Failed to regenerate user interest vectors:', aiError);
        // Don't show error to user - this is not critical
      }

      onUpdate();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !user) return;

      // Upload avatar to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      setAvatarUrl(publicUrl);
      
      // Update avatar_url in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      onUpdate();
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar. Please try again.');
    }
  };

  const interestCategories = [
    {
      name: 'Fitness',
      options: ['Yoga', 'Running', 'Strength Training', 'HIIT', 'Pilates']
    },
    {
      name: 'Wellness',
      options: ['Meditation', 'Nutrition', 'Mental Health', 'Sleep', 'Self-Care']
    },
    {
      name: 'Lifestyle',
      options: ['Parenting', 'Career', 'Education', 'Travel', 'Food']
    }
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="flex items-center space-x-6">
        <div className="relative">
          <UserAvatar 
            src={avatarUrl} 
            alt={profile?.full_name || 'Profile'} 
            size="xl" 
          />
          <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer">
            <Camera className="h-4 w-4 text-neutral-500" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        <div>
          <h3 className="text-lg font-medium">{profile?.full_name || 'Your Profile'}</h3>
          <p className="text-neutral-500 flex items-center">
            <Mail className="h-4 w-4 mr-1" />
            {profile?.email}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Full Name
        </label>
        <input
          type="text"
          {...register('full_name', { required: 'Full name is required' })}
          className={`input ${errors.full_name ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        {errors.full_name && (
          <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Username (for your profile URL)
        </label>
        <div className="relative">
          <input
            type="text"
            {...register('username', { 
              required: 'Username is required',
              minLength: { value: 3, message: 'Username must be at least 3 characters' },
              pattern: { 
                value: /^[a-zA-Z0-9_-]+$/, 
                message: 'Username can only contain letters, numbers, underscores and hyphens' 
              }
            })}
            className={`input ${errors.username ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="your-username"
          />
          {checkingUsername && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
            </div>
          )}
          {!checkingUsername && username && username !== profile?.username && (
            <div className="absolute right-3 top-3">
              {usernameAvailable ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>
        {errors.username && (
          <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
        )}
        {usernameMessage && !errors.username && (
          <p className={`mt-1 text-sm ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
            {usernameMessage}
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          Your profile will be available at: {window.location.origin}/user/{username || '[username]'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Bio
        </label>
        <textarea
          {...register('bio')}
          rows={4}
          className="input"
          placeholder="Tell us about yourself, your interests, and what you hope to find in our communities..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Location
        </label>
        <input
          type="text"
          {...register('location')}
          className="input"
          placeholder="City, Country"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Age Range
        </label>
        <select
          {...register('age_range')}
          className="input"
        >
          <option value="">Prefer not to say</option>
          <option value="18-24">18-24</option>
          <option value="25-34">25-34</option>
          <option value="35-44">35-44</option>
          <option value="45-54">45-54</option>
          <option value="55-64">55-64</option>
          <option value="65+">65+</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Experience Level
        </label>
        <select
          {...register('experience_level')}
          className="input"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          This helps us recommend appropriate content and communities
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Interests
        </label>
        
        <div className="space-y-4">
          {interestCategories.map((category) => (
            <div key={category.name} className="bg-neutral-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">{category.name}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {category.options.map((interest) => (
                  <label key={interest} className="flex items-center">
                    <input
                      type="checkbox"
                      value={interest}
                      {...register('interests')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-neutral-700">{interest}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Custom Interests
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {customInterests.map((interest) => (
            <span 
              key={interest}
              className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm"
            >
              {interest}
              <button
                type="button"
                onClick={() => removeCustomInterest(interest)}
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
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
            className="input flex-1"
            placeholder="Add your own interest"
          />
          <button
            type="button"
            onClick={addCustomInterest}
            className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-neutral-700 mb-3">Preferences</h4>
        <div className="space-y-3 bg-neutral-50 p-4 rounded-lg">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('preferences.notifications_enabled')}
              className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-neutral-700">Enable notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('preferences.private_profile')}
              className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="ml-2 text-neutral-700">Private profile (only community members can see your details)</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !usernameAvailable}
        className="btn-primary w-full"
      >
        {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
};

export default ProfileForm;