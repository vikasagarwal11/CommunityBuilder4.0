import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  Shield,
  AlertCircle,
  Loader2,
  Eye,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import UserAvatar from '../profile/UserAvatar';

interface JoinRequest {
  id: string;
  community_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
  };
}

interface AdminJoinRequestPanelProps {
  communityId: string;
  communityName: string;
  onRequestUpdate?: () => void;
  className?: string;
}

const AdminJoinRequestPanel: React.FC<AdminJoinRequestPanelProps> = ({
  communityId,
  communityName,
  onRequestUpdate,
  className = ''
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Fetch join requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_join_requests')
        .select(`
          *,
          user_profile:profiles!user_id(
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('community_id', communityId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching join requests:', error);
      toast.error('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for join requests
  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel(`join_requests_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_join_requests',
          filter: `community_id=eq.${communityId}`
        },
        (payload) => {
          console.log('Join request change:', payload);
          fetchRequests();
          onRequestUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  const handleApproveRequest = async (requestId: string) => {
    if (!user) return;

    setProcessingRequest(requestId);

    try {
      // Get the request details
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Start a transaction
      const { error: updateError } = await supabase
        .from('community_join_requests')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add user to community members
      const { error: memberError } = await supabase
        .from('community_members')
        .insert({
          user_id: request.user_id,
          community_id: communityId,
          role: 'member',
          joined_at: new Date().toISOString()
        });

      if (memberError) {
        // Rollback the request status if member insertion fails
        await supabase
          .from('community_join_requests')
          .update({ status: 'pending' })
          .eq('id', requestId);
        throw memberError;
      }

      toast.success('Join request approved');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user) return;

    setProcessingRequest(requestId);

    try {
      const { error } = await supabase
        .from('community_join_requests')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Join request rejected');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Join Requests</h3>
            <p className="text-sm text-gray-600">
              {requests.length} pending request{requests.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="divide-y divide-gray-200">
        <AnimatePresence>
          {requests.length === 0 ? (
            <motion.div
              className="p-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No pending join requests</p>
              <p className="text-sm text-gray-400 mt-1">
                New requests will appear here automatically
              </p>
            </motion.div>
          ) : (
            requests.map((request) => (
              <motion.div
                key={request.id}
                className="p-4 hover:bg-gray-50 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                                         <UserAvatar
                       src={request.user_profile?.avatar_url}
                       alt={request.user_profile?.full_name || 'User'}
                       size="md"
                       className="flex-shrink-0"
                     />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {request.user_profile?.full_name || 'Anonymous User'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {request.user_profile?.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        Requested {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowUserModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View user details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleApproveRequest(request.id)}
                      disabled={processingRequest === request.id}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
                      title="Approve request"
                    >
                      {processingRequest === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={processingRequest === request.id}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                      title="Reject request"
                    >
                      {processingRequest === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && selectedRequest && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                                 <UserAvatar
                   src={selectedRequest.user_profile?.avatar_url}
                   alt={selectedRequest.user_profile?.full_name || 'User'}
                   size="lg"
                 />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedRequest.user_profile?.full_name || 'Anonymous User'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.user_profile?.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Requested {formatDate(selectedRequest.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MessageSquare className="w-4 h-4" />
                  <span>Wants to join {communityName}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Status: Pending approval</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    handleRejectRequest(selectedRequest.id);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    handleApproveRequest(selectedRequest.id);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminJoinRequestPanel; 