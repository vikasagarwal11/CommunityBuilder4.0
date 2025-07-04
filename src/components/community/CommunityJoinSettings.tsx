import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Settings, 
  Save, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface CommunityJoinSettingsProps {
  communityId: string;
  communityName: string;
  isAdmin: boolean;
  onSettingsUpdate?: () => void;
  className?: string;
}

const CommunityJoinSettings: React.FC<CommunityJoinSettingsProps> = ({
  communityId,
  communityName,
  isAdmin,
  onSettingsUpdate,
  className = ''
}) => {
  const { user } = useAuth();
  const [joinApprovalRequired, setJoinApprovalRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('communities')
          .select('join_approval_required')
          .eq('id', communityId)
          .single();

        if (error) throw error;
        setJoinApprovalRequired(data?.join_approval_required || false);
      } catch (error) {
        console.error('Error fetching community settings:', error);
        toast.error('Failed to load community settings');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchSettings();
    }
  }, [communityId, isAdmin]);

  const handleSaveSettings = async () => {
    if (!user || !isAdmin) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('communities')
        .update({
          join_approval_required: joinApprovalRequired
        })
        .eq('id', communityId);

      if (error) throw error;

      toast.success('Community settings updated successfully');
      onSettingsUpdate?.();
    } catch (error) {
      console.error('Error updating community settings:', error);
      toast.error('Failed to update community settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Join Settings</h3>
            <p className="text-sm text-gray-600">Configure how users can join this community</p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="p-6 space-y-6">
        {/* Join Approval Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Require Admin Approval</h4>
                <p className="text-sm text-gray-600">
                  When enabled, new members must be approved by admins before joining
                </p>
              </div>
            </div>
            <motion.button
              onClick={() => setJoinApprovalRequired(!joinApprovalRequired)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                joinApprovalRequired ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  joinApprovalRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </motion.button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              className={`p-4 rounded-lg border-2 transition-colors ${
                joinApprovalRequired
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${
                  joinApprovalRequired ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Users className={`w-4 h-4 ${
                    joinApprovalRequired ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">
                    {joinApprovalRequired ? 'Approval Required' : 'Open Join'}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {joinApprovalRequired
                      ? 'Users must request to join and be approved by admins'
                      : 'Users can join directly without admin approval'
                    }
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className={`p-4 rounded-lg border-2 transition-colors ${
                joinApprovalRequired
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-green-200 bg-green-50'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${
                  joinApprovalRequired ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <AlertCircle className={`w-4 h-4 ${
                    joinApprovalRequired ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">
                    {joinApprovalRequired ? 'Admin Review' : 'Instant Access'}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {joinApprovalRequired
                      ? 'Admins will review and approve/reject join requests'
                      : 'Users get immediate access to the community'
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Current Status */}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">
              Current setting: {joinApprovalRequired ? 'Approval Required' : 'Open Join'}
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <motion.button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CommunityJoinSettings; 