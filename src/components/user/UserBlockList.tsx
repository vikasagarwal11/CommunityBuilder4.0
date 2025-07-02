import React, { useState, useEffect } from 'react';
import { UserX, User, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  community_id: string;
  created_at: string;
  blocked_user: {
    full_name: string;
    avatar_url?: string;
  };
}

interface UserBlockListProps {
  communityId: string;
  onClose: () => void;
}

const UserBlockList: React.FC<UserBlockListProps> = ({ communityId, onClose }) => {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  // Fetch blocked users
  const fetchBlocks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocker_id,
          blocked_id,
          community_id,
          created_at,
          blocked_user:profiles!blocked_id(
            full_name,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id)
        .eq('community_id', communityId);

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      setError('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  // Unblock user
  const handleUnblock = async (blockId: string) => {
    try {
      setUnblocking(blockId);
      setError('');
      setSuccess('');

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId)
        .eq('blocker_id', user?.id); // Ensure only the blocker can unblock

      if (error) throw error;

      setBlocks(blocks.filter(block => block.id !== blockId));
      setSuccess('User unblocked successfully');
    } catch (error) {
      console.error('Error unblocking user:', error);
      setError('Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, [communityId, user]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-xl max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <UserX className="h-5 w-5 mr-2 text-red-500" />
              Blocked Users
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <Check className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-neutral-500">Loading blocked users...</p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="py-8 text-center">
              <UserX className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">You haven't blocked any users in this community</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map(block => (
                <div key={block.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3">
                      {block.blocked_user.avatar_url ? (
                        <img 
                          src={block.blocked_user.avatar_url} 
                          alt={block.blocked_user.full_name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-6 w-6 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{block.blocked_user.full_name}</p>
                      <p className="text-xs text-neutral-500">
                        Blocked on {new Date(block.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(block.id)}
                    disabled={unblocking === block.id}
                    className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm"
                  >
                    {unblocking === block.id ? 'Unblocking...' : 'Unblock'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserBlockList;