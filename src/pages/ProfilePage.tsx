import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Settings, Calendar, AlertTriangle, Crown, Shield, ArrowRight, RefreshCw, Trash2, User, Mail, Info, Tag, X, Save, Check, Camera } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Community } from '../lib/types/community';
import EventManagementDashboard from '../components/profile/EventManagementDashboard';
import ProfileAdminDashboard from '../components/profile/ProfileAdminDashboard';
import UserAvatar from '../components/profile/UserAvatar';
import type { Profile, ProfileUpdate } from '../lib/supabase';

const ProfilePage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  
  const [ownedCommunities, setOwnedCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'communities' | 'events' | 'preferences' | 'admin'>(initialTab as any || 'profile');
  const [inactiveCommunities, setInactiveCommunities] = useState<any[]>([]);
  const [deletedCommunities, setDeletedCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<'all' | 'owned' | 'joined' | 'inactive' | 'deleted'>('all');
  const [profile, setProfile] = useState<any | null>(null);
  
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
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Username validation
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setProfile(data);
      
      // Set form values
      if (data) {
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
      }
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role_id, roles(name)')
        .eq('user_id', user?.id);
        
      const isPlatformAdmin = roleData?.some(role => 
        role.roles?.name === 'Platform Owner' || 
        role.roles?.name === 'Platform Admin'
      );
      
      setIsAdmin(isPlatformAdmin);
    } catch (err) {
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunities = async () => {
    if (!user) return;
    
    try {
      setLoadingCommunities(true);
      
      const { data: memberData, error: memberError } = await supabase
        .from('community_members')
        .select(`
          community_id,
          role,
          joined_at,
          communities (
            id,
            name,
            description,
            image_url,
            tags,
            is_active,
            deleted_at,
            created_by
          )
        `)
        .eq('user_id', user.id);
        
      if (memberError) throw memberError;
      
      const communitiesWithDetails = await Promise.all(
        memberData.map(async (membership) => {
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', membership.community_id);
            
          let creatorProfile = null;
          if (membership.communities.created_by) {
            const { data: creatorData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', membership.communities.created_by)
              .maybeSingle();
              
            if (creatorData) {
              creatorProfile = {
                ...creatorData,
                role: 'admin'
              };
            }
          }
            
          return {
            ...membership.communities,
            role: membership.role,
            joined_at: membership.joined_at,
            member_count: count || 0,
            creator_profile: creatorProfile
          };
        })
      );
      
      const owned = communitiesWithDetails.filter(c => 
        c.created_by === user.id && !c.deleted_at && c.is_active !== false
      );
      
      const joined = communitiesWithDetails.filter(c => 
        c.created_by !== user.id && !c.deleted_at && c.is_active !== false
      );
      
      const inactive = communitiesWithDetails.filter(c => 
        c.is_active === false && !c.deleted_at
      );
      
      const deleted = communitiesWithDetails.filter(c => 
        c.deleted_at !== null
      );
      
      setOwnedCommunities(owned);
      setJoinedCommunities(joined);
      setInactiveCommunities(inactive);
      setDeletedCommunities(deleted);
    } catch (error) {
      console.error('Error fetching joined communities:', error);
    } finally {
      setLoadingCommunities(false);
    }
  };

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

  useEffect(() => {
    if (user) {
      fetchProfile();
      if (activeTab === 'communities') {
        fetchCommunities();
      }
    }
  }, [user, activeTab]);

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

  const getFilteredCommunities = () => {
    switch (communityFilter) {
      case 'owned':
        return ownedCommunities;
      case 'joined':
        return joinedCommunities;
      case 'inactive':
        return inactiveCommunities;
      case 'deleted':
        return deletedCommunities;
      case 'all':
      default:
        return [...ownedCommunities, ...joinedCommunities];
    }
  };

  const filteredCommunities = getFilteredCommunities();

  const handleReactivate = async (communityId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('communities')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', communityId);
      if (error) throw error;
      fetchCommunities(); // Refresh data
    } catch (err) {
      setError('Failed to reactivate community.');
    }
  };

  const handlePermanentDelete = async (communityId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId);
      if (error) throw error;
      fetchCommunities(); // Refresh data
    } catch (err) {
      setError('Failed to delete community.');
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
    <div className="min-h-screen bg-neutral-50 py-12 pt-32">
      <div className="container max-w-4xl">
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {[
                { id: 'profile', label: 'Profile Settings', icon: <User className="h-4 w-4" /> },
                { id: 'communities', label: 'My Communities', icon: <Users className="h-4 w-4" /> },
                { id: 'events', label: 'Event Management', icon: <Calendar className="h-4 w-4" /> },
                { id: 'preferences', label: 'Preferences', icon: <Settings className="h-4 w-4" /> },
                ...(ownedCommunities.length > 0 ? [{ id: 'admin', label: 'Admin Dashboard', icon: <Crown className="h-4 w-4" /> }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
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
            <div>
              <h1 className="text-2xl font-semibold mb-6">Profile Settings</h1>
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
            </div>
          )}

          {activeTab === 'communities' && (
            <div>
              <h1 className="text-2xl font-semibold mb-6">My Communities</h1>
              
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setCommunityFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    communityFilter === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCommunityFilter('owned')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    communityFilter === 'owned'
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Created by Me
                </button>
                <button
                  onClick={() => setCommunityFilter('joined')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    communityFilter === 'joined'
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Joined
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setCommunityFilter('inactive')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        communityFilter === 'inactive'
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      Inactive
                    </button>
                    <button
                      onClick={() => setCommunityFilter('deleted')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        communityFilter === 'deleted'
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      Deleted
                    </button>
                  </>
                )}
              </div>
              
              {loadingCommunities ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : error ? (
                <p className="text-red-600">{error}</p>
              ) : filteredCommunities.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCommunities.map((community) => (
                      <div
                        key={community.id}
                        className={`bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                          community.deleted_at ? 'opacity-60' : community.is_active === false ? 'opacity-80' : ''
                        }`}
                      >
                        {(community.deleted_at || community.is_active === false) && (
                          <div className="bg-red-50 border-b border-red-200 px-3 py-1 text-xs text-red-700 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {community.deleted_at ? 'Deleted Community' : 'Inactive Community'}
                          </div>
                        )}
                        
                        <div className="h-32 overflow-hidden">
                          <img 
                            src={community.image_url || 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'} 
                            alt={community.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{community.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              community.role === 'admin' 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : community.role === 'co-admin'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {community.role === 'admin' ? (
                                <Crown className="h-3 w-3 inline mr-1" />
                              ) : community.role === 'co-admin' ? (
                                <Shield className="h-3 w-3 inline mr-1" />
                              ) : null}
                              {community.role}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{community.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-neutral-500">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{community.member_count} members</span>
                            </div>
                            <Link to={`/community/${community.id}`} className="text-primary-500 text-sm font-medium">
                              Enter <ArrowRight className="h-4 w-4 ml-1 inline" />
                            </Link>
                          </div>
                          {isAdmin && (community.is_active === false || community.deleted_at) && (
                            <div className="mt-4 space-x-2">
                              {community.is_active === false && (
                                <button
                                  onClick={() => handleReactivate(community.id)}
                                  className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                >
                                  <RefreshCw className="h-4 w-4 inline mr-1" /> Reactivate
                                </button>
                              )}
                              {community.deleted_at && (
                                <button
                                  onClick={() => handlePermanentDelete(community.id)}
                                  className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                >
                                  <Trash2 className="h-4 w-4 inline mr-1" /> Delete Permanently
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
                    <p className="text-neutral-600">
                      {filteredCommunities.length} {filteredCommunities.length === 1 ? 'community' : 'communities'}
                    </p>
                    <Link to="/communities" className="btn-primary">
                      Explore More Communities
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {communityFilter === 'owned' 
                      ? "You haven't created any communities yet"
                      : communityFilter === 'joined'
                        ? "You haven't joined any communities yet"
                        : communityFilter === 'inactive'
                          ? "You don't have any inactive communities"
                          : communityFilter === 'deleted'
                            ? "You don't have any deleted communities"
                            : "You haven't joined any communities yet"}
                  </h3>
                  <p className="text-neutral-600 mb-6">
                    Communities are a great way to connect with like-minded people who share your interests.
                  </p>
                  <Link to="/communities" className="btn-outline">
                    Explore Communities
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h1 className="text-2xl font-semibold mb-6">Event Management</h1>
              {user && <EventManagementDashboard userId={user.id} />}
            </div>
          )}

          {activeTab === 'admin' && (
            <div>
              <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
              <ProfileAdminDashboard />
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-8">
              <h1 className="text-2xl font-semibold mb-6">Preferences</h1>
              
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
  );
};

export default ProfilePage;