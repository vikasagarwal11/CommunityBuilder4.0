import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Shield, 
  AlertTriangle, 
  Send, 
  Paperclip, 
  CheckCircle,
  Clock,
  User,
  Lock,
  Unlock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface AdminAvailability {
  admin_id: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  status_message?: string;
  admin_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

interface UserConversation {
  id: string;
  subject: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  is_verified: boolean;
  assigned_admin?: {
    full_name: string;
    avatar_url?: string;
  };
  last_message_at: string;
  created_at: string;
}

const ContactAdmin = () => {
  const { user } = useAuth();
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [adminAvailability, setAdminAvailability] = useState<AdminAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New conversation form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [isUrgent, setIsUrgent] = useState(false);
  const [encryptMessage, setEncryptMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('admin_conversations')
        .select(`
          *,
          assigned_admin:users!assigned_admin_id(
            profiles(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const transformedConversations = data.map(conv => ({
        ...conv,
        assigned_admin: conv.assigned_admin?.profiles
      }));

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch admin availability
  const fetchAdminAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_availability')
        .select(`
          *,
          admin_profile:users!admin_id(
            profiles(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('status', 'available');

      if (error) throw error;

      const transformedData = data.map(admin => ({
        ...admin,
        admin_profile: admin.admin_profile?.profiles || { full_name: 'Admin' }
      }));

      setAdminAvailability(transformedData);
    } catch (error) {
      console.error('Error fetching admin availability:', error);
    }
  };

  // Create new conversation
  const createConversation = async () => {
    if (!user || !subject.trim() || !message.trim()) return;

    try {
      setSubmitting(true);

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('admin_conversations')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          priority: isUrgent ? 'urgent' : priority,
          status: 'open'
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send initial message
      const { error: messageError } = await supabase
        .from('admin_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: message.trim(),
          is_encrypted: encryptMessage,
          message_type: 'text'
        });

      if (messageError) throw messageError;

      // Reset form
      setSubject('');
      setMessage('');
      setPriority('normal');
      setIsUrgent(false);
      setEncryptMessage(false);
      setShowNewConversation(false);

      // Refresh conversations
      await fetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-500';
      case 'busy':
        return 'text-yellow-500';
      case 'away':
        return 'text-orange-500';
      case 'offline':
        return 'text-neutral-400';
      default:
        return 'text-neutral-400';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchConversations(),
        fetchAdminAvailability()
      ]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Shield className="h-6 w-6 mr-2" />
                Contact Administrator
              </h1>
              <p className="text-blue-100 mt-1">
                Secure, private communication with our support team
              </p>
            </div>
            <button
              onClick={() => setShowNewConversation(true)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              New Message
            </button>
          </div>
        </div>

        {/* Admin Availability */}
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold mb-4">Administrator Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminAvailability.map((admin) => (
              <div key={admin.admin_id} className="flex items-center p-3 bg-neutral-50 rounded-lg">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3 relative">
                  {admin.admin_profile.avatar_url ? (
                    <img 
                      src={admin.admin_profile.avatar_url} 
                      alt={admin.admin_profile.full_name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User className="h-6 w-6 text-neutral-400" />
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    admin.status === 'available' ? 'bg-green-500' : 'bg-neutral-400'
                  }`}></div>
                </div>
                <div>
                  <p className="font-medium text-sm">{admin.admin_profile.full_name}</p>
                  <p className={`text-xs ${getStatusColor(admin.status)}`}>
                    {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                  </p>
                  {admin.status_message && (
                    <p className="text-xs text-neutral-500">{admin.status_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {adminAvailability.length === 0 && (
            <p className="text-neutral-500 text-center py-4">
              No administrators currently available. Your message will be queued for response.
            </p>
          )}
        </div>

        {/* New Conversation Modal */}
        {showNewConversation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              className="bg-white rounded-xl max-w-md w-full p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-semibold mb-4">New Admin Message</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your issue in detail..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-red-600 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Urgent
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={encryptMessage}
                      onChange={(e) => setEncryptMessage(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-green-600 flex items-center">
                      {encryptMessage ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                      Encrypt message
                    </span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewConversation(false)}
                    className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createConversation}
                    disabled={submitting || !subject.trim() || !message.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
                  >
                    {submitting ? (
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
            </motion.div>
          </div>
        )}

        {/* Existing Conversations */}
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Your Conversations</h2>
          
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
              <p className="text-lg font-medium">No conversations yet</p>
              <p className="text-sm">Start a conversation with an administrator</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{conversation.subject}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(conversation.priority)}`}>
                          {conversation.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                          {conversation.priority}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {conversation.status.replace('_', ' ')}
                        </span>
                        {conversation.is_verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" title="Verified by administrator" />
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500">
                        {new Date(conversation.last_message_at).toLocaleDateString()}
                      </p>
                      {conversation.assigned_admin && (
                        <div className="flex items-center mt-1">
                          <div className="h-6 w-6 rounded-full overflow-hidden bg-neutral-200 mr-2">
                            {conversation.assigned_admin.avatar_url ? (
                              <img 
                                src={conversation.assigned_admin.avatar_url} 
                                alt={conversation.assigned_admin.full_name} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <User className="h-3 w-3 text-neutral-400" />
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-neutral-600">
                            {conversation.assigned_admin.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-neutral-600">
                    <span>Click to view conversation</span>
                    <Clock className="h-4 w-4" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactAdmin;