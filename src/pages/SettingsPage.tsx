import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, Check, Tag, X, User, Settings as SettingsIcon, Camera, Mail, Info } from 'lucide-react';
import UserAvatar from '../components/profile/UserAvatar';
import type { Profile, ProfileUpdate } from '../lib/supabase';

const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  
  // Preferences fields
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] = useState(true);
  const [contentAnalysisEnabled, setContentAnalysisEnabled] = useState(true);
  const [feedbackLearningEnabled, setFeedbackLearningEnabled] = useState(true);
  
  // Username validation
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        // Handle case where profile doesn't exist yet
        if (data) {
          setProfile(data);
          setFullName(data.full_name || '');
          setUsername(data.username || '');
          setBio(data.bio || '');
          setLocation(data.location || '');
          setAgeRange(data.age_range || '');
          setExperienceLevel(data.experience_level || 'beginner');
          setAvatarUrl(data.avatar_url || '');
          setInterests(data.interests || []);
          setCustomInterests(data.custom_interests || []);
          
          if (data.preferences) {
            setNotificationsEnabled(data.preferences.notifications_enabled !== false);
            setPrivateProfile(data.preferences.private_profile || false);
            setAiRecommendationsEnabled(data.preferences.ai_recommendations_enabled !== false);
            setContentAnalysisEnabled(data.preferences.content_analysis_enabled !== false);
            setFeedbackLearningEnabled(data.preferences.feedback_learning_enabled !== false);
          }
        } else {
          // Profile doesn't exist yet, use defaults
          setProfile(null);
          setFullName('');
          setUsername('');
          setBio('');
          setLocation('');
          setAgeRange('');
          setExperienceLevel('beginner');
          setAvatarUrl('');
          setInterests([]);
          setCustomInterests([]);
          setNotificationsEnabled(true);
          setPrivateProfile(false);
          setAiRecommendationsEnabled(true);
          setContentAnalysisEnabled(true);
          setFeedbackLearningEnabled(true);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Check username availability
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
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameMessage('Error checking username availability');
      } finally {
        setCheckingUsername(false);
      }
    };
    
    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username, profile?.username, user?.id]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess(false);
      
      // Validate username
      if (username && !usernameAvailable) {
        setError('Please choose a different username');
        setSaving(false);
        return;
      }
      
      const updates: ProfileUpdate = {
        full_name: fullName,
        username,
        bio,
        location,
        age_range: ageRange,
        experience_level: experienceLevel,
        interests,
        custom_interests: customInterests,
        updated_at: new Date().toISOString()
      };
      
      // Update profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess(false);
      
      const preferences = {
        notifications_enabled: notificationsEnabled,
        private_profile: privateProfile,
        ai_recommendations_enabled: aiRecommendationsEnabled,
        content_analysis_enabled: contentAnalysisEnabled,
        feedback_learning_enabled: feedbackLearningEnabled
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
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
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar. Please try again.');
    }
  };

  const addCustomInterest = () => {
    if (newInterest.trim() && !customInterests.includes(newInterest.trim()) && customInterests.length < 5) {
      setCustomInterests([...customInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeCustomInterest = (interest: string) => {
    setCustomInterests(customInterests.filter(i => i !== interest));
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-neutral-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container max-w-4xl">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                <SettingsIcon className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-neutral-600">Manage your profile and preferences</p>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-neutral-200">
            <div className="flex">
              <button
                className={`px-6 py-3 font-medium text-sm border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                <User className="h-4 w-4 inline mr-2" />
                Profile
              </button>
              <button
                className={`px-6 py-3 font-medium text-sm border-b-2 ${
                  activeTab === 'preferences'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
                onClick={() => setActiveTab('preferences')}
              >
                <SettingsIcon className="h-4 w-4 inline mr-2" />
                Preferences
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
                <Check className="h-5 w-5 mr-2" />
                {activeTab === 'profile' ? 'Profile updated successfully' : 'Preferences saved successfully'}
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Avatar and Basic Info */}
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="relative">
                    <UserAvatar 
                      src={avatarUrl} 
                      alt={fullName || 'Profile'} 
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
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Username (for your profile URL)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`w-full px-3 py-2 border ${!usernameAvailable ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 focus:ring-primary-500'} rounded-lg focus:outline-none focus:ring-2`}
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
                      {usernameMessage && !checkingUsername && (
                        <p className={`mt-1 text-sm ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {usernameMessage}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-neutral-500">
                        Your profile will be available at: {window.location.origin}/user/{username || '[username]'}
                      </p>
                    </div>
                    
                    {user && (
                      <div className="flex items-center text-neutral-500">
                        <Mail className="h-4 w-4 mr-2" />
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Tell us about yourself, your interests, and what you hope to find in our communities..."
                  />
                </div>
                
                {/* Location and Age Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="City, Country"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Age Range
                    </label>
                    <select
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                </div>
                
                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                
                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Interests
                  </label>
                  
                  <div className="space-y-4">
                    {interestCategories.map((category) => (
                      <div key={category.name} className="bg-neutral-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">{category.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {category.options.map((interest) => (
                            <button
                              key={interest}
                              onClick={() => toggleInterest(interest)}
                              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                interests.includes(interest)
                                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                                  : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              {interest}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Custom Interests */}
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
                        <Tag className="h-3 w-3 mr-1" />
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
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Add a custom interest"
                    />
                    <button
                      type="button"
                      onClick={addCustomInterest}
                      disabled={!newInterest.trim() || customInterests.length >= 5}
                      className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    You can add up to 5 custom interests
                  </p>
                </div>
                
                {/* Save Button */}
                <div className="pt-4 border-t border-neutral-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'preferences' && (
              <div className="space-y-8">
                {/* Notification Preferences */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium">Enable Notifications</p>
                        <p className="text-sm text-neutral-600">
                          Receive notifications about community activity
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium">Private Profile</p>
                        <p className="text-sm text-neutral-600">
                          Only show your profile to community members
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privateProfile}
                          onChange={() => setPrivateProfile(!privateProfile)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* AI Personalization */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">AI Personalization</h2>
                  <p className="text-neutral-600 mb-4">
                    Control how AI features use your data to provide personalized recommendations
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium">Enable AI Recommendations</p>
                        <p className="text-sm text-neutral-600">
                          Allow AI to suggest content based on your interests and activity
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiRecommendationsEnabled}
                          onChange={() => setAiRecommendationsEnabled(!aiRecommendationsEnabled)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium">Content Analysis</p>
                        <p className="text-sm text-neutral-600">
                          Allow AI to analyze your posts and comments for better recommendations
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contentAnalysisEnabled}
                          onChange={() => setContentAnalysisEnabled(!contentAnalysisEnabled)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium">Learning from Feedback</p>
                        <p className="text-sm text-neutral-600">
                          Allow AI to learn from your feedback on recommendations
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feedbackLearningEnabled}
                          onChange={() => setFeedbackLearningEnabled(!feedbackLearningEnabled)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Data Privacy */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Data Privacy</h2>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-blue-700 font-medium">Your Data Privacy</p>
                        <p className="text-sm text-blue-600 mt-1">
                          We take your privacy seriously. Your data is only used to improve your experience and is never shared with third parties without your consent.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="font-medium mb-2">Data Retention</p>
                    <p className="text-sm text-neutral-600 mb-4">
                      You can request a copy of your data or delete your account at any time.
                    </p>
                    <button className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-sm">
                      Request Data Export
                    </button>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="pt-4 border-t border-neutral-200">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;