import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Shield, 
  Send, 
  Crown, 
  User,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface CommunityAdmin {
  user_id: string;
  role: 'admin' | 'co-admin';
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
  joined_at: string;
}

interface CommunityAdminContactProps {
  communityId: string;
  communityName: string;
  onClose: () => void;
}

const CommunityAdminContact: React.FC<CommunityAdminContactProps> = ({ 
  communityId, 
  communityName, 
  onClose 
}) => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<CommunityAdmin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch community admins
  const fetchCommunityAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          user_id,
          role,
          joined_at,
          profiles!inner(
            full_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .in('role', ['admin', 'co-admin'])
        .order('role', { ascending: true }); // admins first, then co-admins

      if (error) throw error;
      setAdmins(data || []);
      
      // Auto-select the first admin if available
      if (data && data.length > 0) {
        setSelectedAdmin(data[0].user_id);
      }
    } catch (error) {
      console.error('Error fetching community admins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message to community admin
  const sendMessage = async () => {
    if (!user || !selectedAdmin || !subject.trim() || !message.trim()) return;

    try {
      setSending(true);

      // Create a conversation record in community_admin_messages table
      const { data: conversation, error: convError } = await supabase
        .from('community_admin_conversations')
        .insert({
          community_id: communityId,
          user_id: user.id,
          admin_id: selectedAdmin,
          subject: subject.trim(),
          priority,
          status: 'open',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send the initial message
      const { error: messageError } = await supabase
        .from('community_admin_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: message.trim(),
          message_type: 'text',
          created_at: new Date().toISOString()
        });

      if (messageError) throw messageError;

      setSent(true);
      
      // Reset form after a delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchCommunityAdmins();
  }, [communityId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-center mt-4">Loading admins...</p>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div 
          className="bg-white rounded-xl p-6 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
          <p className="text-neutral-600">
            Your message has been sent to the community admin. They'll respond as soon as possible.
          </p>
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
                <Shield className="h-5 w-5 mr-2 text-blue-500" />
                Contact Community Admin
              </h2>
              <p className="text-neutral-600 text-sm mt-1">
                Send a message to the administrators of "{communityName}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {admins.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Admins Available</h3>
              <p className="text-neutral-600">
                This community doesn't have any active administrators at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Select Admin */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Choose an Administrator
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.user_id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAdmin === admin.user_id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                      onClick={() => setSelectedAdmin(admin.user_id)}
                    >
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-neutral-200 mr-3">
                          {admin.profiles.avatar_url ? (
                            <img 
                              src={admin.profiles.avatar_url} 
                              alt={admin.profiles.full_name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="h-6 w-6 text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="font-medium">{admin.profiles.full_name}</h4>
                            {admin.role === 'admin' ? (
                              <Crown className="h-4 w-4 ml-2 text-yellow-500" />
                            ) : (
                              <Shield className="h-4 w-4 ml-2 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 capitalize">
                            Community {admin.role}
                          </p>
                          <p className="text-xs text-neutral-400">
                            Member since {new Date(admin.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedAdmin === admin.user_id && (
                          <CheckCircle className="h-5 w-5 text-primary-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="What's this about?"
                  maxLength={100}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Priority
                </label>
                <div className="flex space-x-3">
                  {[
                    { value: 'low', label: 'Low', color: 'green' },
                    { value: 'normal', label: 'Normal', color: 'blue' },
                    { value: 'high', label: 'High', color: 'orange' }
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setPriority(value as any)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        priority === value
                          ? `bg-${color}-100 text-${color}-700 border border-${color}-200`
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                      }`}
                    >
                      {value === 'high' && <AlertTriangle className="h-4 w-4 mr-1 inline" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your question or concern..."
                  maxLength={1000}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {message.length}/1000 characters
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendMessage}
                  disabled={sending || !selectedAdmin || !subject.trim() || !message.trim()}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommunityAdminContact;