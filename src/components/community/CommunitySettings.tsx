import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  MessageSquare, 
  UserPlus, 
  Shield, 
  Save,
  CheckCircle,
  X,
  Upload,
  Edit,
  Camera,
  Lock,
  Users,
  AlertTriangle,
  Power,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { generateSlug } from '../../lib/types/community';

interface CommunitySettingsProps {
  communityId: string;
  communityName: string;
  onClose: () => void;
}

interface CommunitySettingsData {
  id: string;
  community_id: string;
  allow_direct_messages: boolean;
  allow_member_invites: boolean;
  require_admin_approval: boolean;
}

interface CommunityData {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  tags?: string[];
  slug?: string;
  is_active?: boolean;
  deactivated_at?: string | null;
  deleted_at?: string | null;
}

const CommunitySettings = ({ 
  communityId, 
  communityName, 
  onClose 
}: CommunitySettingsProps) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CommunitySettingsData | null>(null);
  const [communityData, setCommunityData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'details' | 'danger'>('privacy');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugMessage, setSlugMessage] = useState('');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Check if user is admin
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

  // Fetch community settings
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('community_settings')
        .select('*')
        .eq('community_id', communityId)
        .maybeSingle();

      if (!data) {
        // If no settings exist, create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('community_settings')
          .insert({
            community_id: communityId,
            allow_direct_messages: true,
            allow_member_invites: true,
            require_admin_approval: false
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      } else {
        if (error) throw error;
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching community settings:', error);
      setError('Failed to load settings');
    }
  };

  // Fetch community details
  const fetchCommunityDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, description, image_url, tags, slug, is_active, deactivated_at, deleted_at')
        .eq('id', communityId)
        .single();

      if (error) throw error;
      setCommunityData(data);
      setNewName(data.name);
      setNewDescription(data.description);
      setNewTags(data.tags || []);
      setNewSlug(data.slug || generateSlug(data.name));
    } catch (error) {
      console.error('Error fetching community details:', error);
      setError('Failed to load community details');
    } finally {
      setLoading(false);
    }
  };

  // Check slug availability
  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug === communityData?.slug) {
      setSlugAvailable(true);
      setSlugMessage('');
      return;
    }
    
    // Slug validation
    if (slug.length < 3) {
      setSlugAvailable(false);
      setSlugMessage('Slug must be at least 3 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      setSlugAvailable(false);
      setSlugMessage('Slug can only contain letters, numbers, underscores and hyphens');
      return;
    }
    
    try {
      setCheckingSlug(true);
      
      const { data, error } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', slug)
        .neq('id', communityId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (!data) {
        // No rows returned means slug is available
        setSlugAvailable(true);
        setSlugMessage('Slug is available');
      } else {
        // Data exists, slug is taken
        setSlugAvailable(false);
        setSlugMessage('Slug is already taken');
      }
    } catch (err) {
      console.error('Error checking slug:', err);
      setSlugMessage('Error checking slug availability');
    } finally {
      setCheckingSlug(false);
    }
  };

  // Watch for slug changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newSlug) {
        checkSlugAvailability(newSlug);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [newSlug, communityData?.slug]);

  // Save settings
  const saveSettings = async () => {
    if (!settings || !isAdmin) return;

    try {
      setSaving(true);
      setError('');

      const { error } = await supabase
        .from('community_settings')
        .update({
          allow_direct_messages: settings.allow_direct_messages,
          allow_member_invites: settings.allow_member_invites,
          require_admin_approval: settings.require_admin_approval,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Save community details
  const saveCommunityDetails = async () => {
    if (!communityData || !isAdmin) return;

    try {
      setSaving(true);
      setError('');

      // Validate slug
      if (!slugAvailable) {
        setError('Please choose a different URL slug');
        setSaving(false);
        return;
      }

      let imageUrl = communityData.image_url;

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${communityId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('community-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('community-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Update community details
      const { error } = await supabase
        .from('communities')
        .update({
          name: newName,
          description: newDescription,
          image_url: imageUrl,
          tags: newTags,
          slug: newSlug,
          updated_at: new Date().toISOString()
        })
        .eq('id', communityId);

      if (error) throw error;

      // Update local state
      setCommunityData({
        ...communityData,
        name: newName,
        description: newDescription,
        image_url: imageUrl,
        tags: newTags,
        slug: newSlug
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving community details:', error);
      setError('Failed to save community details');
    } finally {
      setSaving(false);
    }
  };

  // Handle deactivate community
  const handleDeactivateCommunity = async () => {
    if (!user || !isAdmin || !communityData) return;

    try {
      setDeactivating(true);
      setError('');

      // Call the deactivate_community function
      const { error } = await supabase.rpc('deactivate_community', {
        community_uuid: communityId,
        user_uuid: user.id
      });

      if (error) throw error;

      // Update local state
      setCommunityData({
        ...communityData,
        is_active: false,
        deactivated_at: new Date().toISOString()
      });

      setShowDeactivateConfirm(false);
      
      // Show success message
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
        // Redirect to communities page
        window.location.href = '/communities';
      }, 2000);
    } catch (error) {
      console.error('Error deactivating community:', error);
      setError('Failed to deactivate community');
    } finally {
      setDeactivating(false);
    }
  };

  // Handle reactivate community
  const handleReactivateCommunity = async () => {
    if (!user || !isAdmin || !communityData) return;

    try {
      setDeactivating(true);
      setError('');

      // Call the reactivate_community function
      const { error } = await supabase.rpc('reactivate_community', {
        community_uuid: communityId,
        user_uuid: user.id
      });

      if (error) throw error;

      // Update local state
      setCommunityData({
        ...communityData,
        is_active: true,
        deactivated_at: null
      });
      
      // Show success message
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error reactivating community:', error);
      setError('Failed to reactivate community');
    } finally {
      setDeactivating(false);
    }
  };

  // Handle delete community
  const handleDeleteCommunity = async () => {
    if (!user || !isAdmin || !communityData) return;

    // Verify the confirmation text
    if (deleteConfirmText !== communityData.name) {
      setError(`Please type "${communityData.name}" to confirm deletion`);
      return;
    }

    try {
      setDeleting(true);
      setError('');

      // Call the soft_delete_community function
      const { error } = await supabase.rpc('soft_delete_community', {
        community_uuid: communityId,
        user_uuid: user.id
      });

      if (error) throw error;

      setShowDeleteConfirm(false);
      
      // Show success message
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
        // Redirect to communities page
        window.location.href = '/communities';
      }, 2000);
    } catch (error) {
      console.error('Error deleting community:', error);
      setError('Failed to delete community');
    } finally {
      setDeleting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    if (newTag.trim() && !newTags.includes(newTag.trim()) && newTags.length < 5) {
      setNewTags([...newTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewTags(newTags.filter(tag => tag !== tagToRemove));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Convert to lowercase and replace spaces with hyphens
    const formattedSlug = value.toLowerCase().replace(/\s+/g, '-');
    setNewSlug(formattedSlug);
  };

  const generateSlugFromName = () => {
    if (newName) {
      const slug = generateSlug(newName);
      setNewSlug(slug);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await checkAdminStatus();
      await fetchSettings();
      await fetchCommunityDetails();
    };

    loadData();
  }, [communityId, user]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-center mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div 
          className="bg-white rounded-xl p-6 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Admin Access Required</h3>
          <p className="text-neutral-600 mb-6">
            Only community administrators can access community settings.
          </p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </motion.div>
      </div>
    );
  }

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
            <div>
              <h2 className="text-xl font-semibold flex items-center">
                <Settings className="h-5 w-5 mr-2 text-primary-500" />
                Community Settings
              </h2>
              <p className="text-neutral-600 text-sm mt-1">
                Manage settings for "{communityName}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200">
          <div className="flex">
            <button
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'details'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Community Details
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'privacy'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy & Access
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm border-b-2 ${
                activeTab === 'danger'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
              onClick={() => setActiveTab('danger')}
            >
              Danger Zone
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {saved && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <CheckCircle className="h-5 w-5 mr-2" />
              Settings saved successfully
            </div>
          )}

          {activeTab === 'privacy' && settings && (
            <div className="space-y-6">
              {/* Direct Messages */}
              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-primary-500" />
                    <h3 className="font-medium">Direct Messages</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_direct_messages}
                      onChange={() => setSettings({
                        ...settings,
                        allow_direct_messages: !settings.allow_direct_messages
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                <p className="text-sm text-neutral-600">
                  {settings.allow_direct_messages 
                    ? "Members can send direct messages to each other"
                    : "Direct messaging is disabled for this community"
                  }
                </p>
              </div>

              {/* Member Invites */}
              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <UserPlus className="h-5 w-5 mr-2 text-primary-500" />
                    <h3 className="font-medium">Member Invites</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_member_invites}
                      onChange={() => setSettings({
                        ...settings,
                        allow_member_invites: !settings.allow_member_invites
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                <p className="text-sm text-neutral-600">
                  {settings.allow_member_invites 
                    ? "Members can invite others to join this community"
                    : "Only admins can invite new members"
                  }
                </p>
              </div>

              {/* Admin Approval */}
              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-primary-500" />
                    <h3 className="font-medium">Admin Approval</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.require_admin_approval}
                      onChange={() => setSettings({
                        ...settings,
                        require_admin_approval: !settings.require_admin_approval
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                <p className="text-sm text-neutral-600">
                  {settings.require_admin_approval 
                    ? "New members require admin approval to join"
                    : "New members can join without approval"
                  }
                </p>
              </div>

              {/* Privacy Level */}
              <div className="bg-neutral-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Lock className="h-5 w-5 mr-2 text-primary-500" />
                    <h3 className="font-medium">Community Privacy</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="privacy"
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500"
                      checked={true}
                    />
                    <span className="ml-2 text-sm text-neutral-700">
                      <span className="font-medium">Open</span> - Anyone can see and join this community
                    </span>
                  </label>
                  <label className="flex items-center opacity-50 cursor-not-allowed">
                    <input
                      type="radio"
                      name="privacy"
                      className="h-4 w-4 text-neutral-300 focus:ring-neutral-300"
                      disabled
                    />
                    <span className="ml-2 text-sm text-neutral-500">
                      <span className="font-medium">Restricted</span> - Anyone can see this community, but only approved members can join
                    </span>
                  </label>
                  <label className="flex items-center opacity-50 cursor-not-allowed">
                    <input
                      type="radio"
                      name="privacy"
                      className="h-4 w-4 text-neutral-300 focus:ring-neutral-300"
                      disabled
                    />
                    <span className="ml-2 text-sm text-neutral-500">
                      <span className="font-medium">Private</span> - Only members can see and access this community
                    </span>
                  </label>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Additional privacy options coming soon
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 mr-3"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'details' && communityData && (
            <div className="space-y-6">
              {/* Community Image */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Community Image
                </label>
                <div className="flex items-center">
                  <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-neutral-100 mr-4">
                    {(imagePreview || communityData.image_url) ? (
                      <img 
                        src={imagePreview || communityData.image_url} 
                        alt={communityData.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Users className="h-12 w-12 text-neutral-400" />
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-8 w-8 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-700 mb-1">Upload a new image</p>
                    <p className="text-xs text-neutral-500">
                      Recommended size: 800x800px. Max size: 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Community Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Community Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input w-full"
                  placeholder="Enter community name"
                  maxLength={100}
                />
              </div>

              {/* Community URL Slug */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Community URL
                </label>
                <div className="flex items-center">
                  <span className="bg-neutral-100 px-3 py-2 rounded-l-lg border border-r-0 border-neutral-300 text-neutral-500">
                    {window.location.origin}/c/
                  </span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={handleSlugChange}
                    className={`input rounded-l-none flex-grow ${!slugAvailable ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="community-url-slug"
                  />
                  <button
                    type="button"
                    onClick={generateSlugFromName}
                    className="ml-2 px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                    title="Generate from name"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
                {checkingSlug && (
                  <p className="mt-1 text-sm text-neutral-500">Checking availability...</p>
                )}
                {slugMessage && !checkingSlug && (
                  <p className={`mt-1 text-sm ${slugAvailable ? 'text-green-600' : 'text-red-600'}`}>
                    {slugMessage}
                  </p>
                )}
                <p className="mt-1 text-xs text-neutral-500">
                  This will be the URL for your community: {window.location.origin}/c/{newSlug || '[slug]'}
                </p>
              </div>

              {/* Community Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input w-full"
                  placeholder="Describe your community"
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Community Tags */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {newTags.map((tag) => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm"
                    >
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
                    placeholder="Add a tag (e.g., fitness, parenting, wellness)"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!newTag.trim() || newTags.length >= 5}
                    className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Add up to 5 tags to help people find your community
                </p>
              </div>

              {/* Share URL */}
              <div className="bg-neutral-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Community URL</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Share this URL with others to invite them to your community:
                </p>
                <div className="flex">
                  <input
                    type="text"
                    value={`${window.location.origin}/c/${newSlug || communityData.slug || communityId}`}
                    readOnly
                    className="flex-grow input rounded-r-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/c/${newSlug || communityData.slug || communityId}`);
                      // Could add a toast notification here
                    }}
                    className="px-4 py-2 bg-primary-500 text-white rounded-r-lg hover:bg-primary-600"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 mr-3"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCommunityDetails}
                  disabled={saving || !newName.trim() || !newDescription.trim() || !slugAvailable}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'danger' && communityData && (
            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Danger Zone
                </h3>
                <p className="text-neutral-700 mb-6">
                  Actions in this section can have serious consequences. Please proceed with caution.
                </p>

                {/* Deactivate Community */}
                <div className="border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-red-700 flex items-center">
                        <Power className="h-4 w-4 mr-2" />
                        {communityData.is_active === false ? 'Reactivate' : 'Deactivate'} Community
                      </h4>
                      <p className="text-sm text-neutral-600 mt-1">
                        {communityData.is_active === false 
                          ? 'Make this community visible and accessible to members again.' 
                          : 'Temporarily hide this community from all users. You can reactivate it later.'}
                      </p>
                      {communityData.deactivated_at && (
                        <p className="text-xs text-red-600 mt-1">
                          Deactivated on {new Date(communityData.deactivated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => communityData.is_active === false 
                        ? handleReactivateCommunity() 
                        : setShowDeactivateConfirm(true)}
                      className={`px-4 py-2 rounded-lg text-white ${
                        communityData.is_active === false 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                      disabled={deactivating}
                    >
                      {deactivating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        communityData.is_active === false ? 'Reactivate' : 'Deactivate'
                      )}
                    </button>
                  </div>
                </div>

                {/* Delete Community */}
                <div className="border border-red-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-red-700 flex items-center">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Community
                      </h4>
                      <p className="text-sm text-neutral-600 mt-1">
                        Permanently delete this community and all its data. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Deactivate Confirmation Modal */}
              {showDeactivateConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold mb-4 text-red-700 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Deactivate Community
                    </h3>
                    <p className="text-neutral-700 mb-4">
                      Are you sure you want to deactivate "{communityName}"? This will:
                    </p>
                    <ul className="list-disc list-inside text-neutral-600 mb-6 space-y-1 text-sm">
                      <li>Hide the community from all users</li>
                      <li>Prevent members from accessing community content</li>
                      <li>Disable all community features temporarily</li>
                    </ul>
                    <p className="text-sm text-neutral-600 mb-6">
                      You can reactivate the community at any time.
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowDeactivateConfirm(false)}
                        className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeactivateCommunity}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        disabled={deactivating}
                      >
                        {deactivating ? 'Deactivating...' : 'Deactivate Community'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold mb-4 text-red-700 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Delete Community
                    </h3>
                    <p className="text-neutral-700 mb-4">
                      Are you sure you want to delete "{communityName}"? This will:
                    </p>
                    <ul className="list-disc list-inside text-neutral-600 mb-6 space-y-1 text-sm">
                      <li>Permanently remove the community</li>
                      <li>Delete all community content and data</li>
                      <li>Remove all members from the community</li>
                      <li>This action <span className="font-bold">cannot</span> be undone</li>
                    </ul>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-6">
                      <p className="text-sm text-yellow-700 flex items-start">
                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                        To confirm, please type <span className="font-bold mx-1">{communityName}</span> below
                      </p>
                      <input
                        type="text"
                        className="input mt-2 w-full"
                        placeholder={`Type "${communityName}" to confirm`}
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteCommunity}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        disabled={deleting || deleteConfirmText !== communityName}
                      >
                        {deleting ? 'Deleting...' : 'Delete Permanently'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommunitySettings;