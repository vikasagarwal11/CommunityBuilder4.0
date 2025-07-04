import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Shield,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface CommunityJoinButtonProps {
  community: {
    id: string;
    name: string;
    join_approval_required?: boolean;
  };
  isMember: boolean;
  onJoinSuccess?: () => void;
  onRequestSent?: () => void;
  className?: string;
}

interface JoinRequest {
  id: string;
  community_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

const CommunityJoinButton: React.FC<CommunityJoinButtonProps> = ({
  community,
  isMember,
  onJoinSuccess,
  onRequestSent,
  className = ''
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Check for existing join request
  useEffect(() => {
    if (!user || isMember) return;

    const checkJoinRequest = async () => {
      try {
        const { data, error } = await supabase
          .from('community_join_requests')
          .select('*')
          .eq('community_id', community.id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (error) {
          console.error('Error checking join request:', error);
          return;
        }

        setJoinRequest(data);
      } catch (error) {
        console.error('Error checking join request:', error);
      }
    };

    checkJoinRequest();
  }, [user, community.id, isMember]);

  const handleJoinCommunity = async () => {
    if (!user) {
      toast.error('Please log in to join communities');
      return;
    }

    setLoading(true);

    try {
      if (community.join_approval_required) {
        // Send join request for approval
        const { data, error } = await supabase
          .from('community_join_requests')
          .insert({
            community_id: community.id,
            user_id: user.id,
            status: 'pending',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            toast.error('You already have a pending request for this community');
          } else {
            throw error;
          }
          return;
        }

        setJoinRequest(data);
        toast.success('Join request sent! Admins will review your request.');
        onRequestSent?.();
      } else {
        // Direct join
        const { error } = await supabase
          .from('community_members')
          .insert({
            user_id: user.id,
            community_id: community.id,
            role: 'member',
            joined_at: new Date().toISOString(),
          });

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            toast.error('You are already a member of this community');
          } else {
            throw error;
          }
          return;
        }

        toast.success(`Welcome to ${community.name}!`);
        onJoinSuccess?.();
      }
    } catch (error) {
      console.error('Error joining community:', error);
      toast.error('Failed to join community. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!joinRequest) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('community_join_requests')
        .delete()
        .eq('id', joinRequest.id);

      if (error) throw error;

      setJoinRequest(null);
      toast.success('Join request cancelled');
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If user is already a member
  if (isMember) {
    return (
      <motion.button
        className={`flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <CheckCircle className="w-4 h-4" />
        <span>Member</span>
      </motion.button>
    );
  }

  // If there's a pending request
  if (joinRequest) {
    return (
      <motion.div
        className={`flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Clock className="w-4 h-4" />
        <span>Request Pending</span>
        <button
          onClick={handleCancelRequest}
          disabled={loading}
          className="ml-2 p-1 hover:bg-yellow-200 rounded-full transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
        </button>
      </motion.div>
    );
  }

  // Join button
  return (
    <>
      <motion.button
        onClick={handleJoinCommunity}
        disabled={loading}
        className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        <span>
          {community.join_approval_required ? 'Request to Join' : 'Join Community'}
        </span>
        {community.join_approval_required && (
          <Shield className="w-3 h-3 ml-1" />
        )}
      </motion.button>

      {/* Info modal for approval-required communities */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Admin Approval Required</h3>
                  <p className="text-sm text-gray-600">This community requires admin approval to join</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-blue-500" />
                  <span>Your request will be reviewed by community admins</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 text-green-500" />
                  <span>You'll be notified once your request is approved</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
                  <span>You can cancel your request at any time</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    handleJoinCommunity();
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info button for approval-required communities */}
      {community.join_approval_required && (
        <button
          onClick={() => setShowRequestModal(true)}
          className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Learn about approval process"
        >
          <AlertCircle className="w-4 h-4" />
        </button>
      )}
    </>
  );
};

export default CommunityJoinButton; 