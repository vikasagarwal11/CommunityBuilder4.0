import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User,
  Paperclip,
  Send,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface AdminConversation {
  id: string;
  user_id: string;
  assigned_admin_id?: string;
  subject: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  is_verified: boolean;
  last_message_at: string;
  created_at: string;
  user_profile: {
    full_name: string;
    avatar_url?: string;
  };
  unread_count: number;
}

interface AdminMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_encrypted: boolean;
  message_type: 'text' | 'file' | 'system';
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender_profile: {
    full_name: string;
    avatar_url?: string;
  };
  attachments?: AdminMessageAttachment[];
}

interface AdminMessageAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  is_encrypted: boolean;
}

const AdminMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);

  // Fetch conversations for admin
  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_conversations')
        .select(`
          *,
          user_profile:users!user_id(
            profiles(
              full_name,
              avatar_url
            )
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Transform data and get unread counts
      const conversationsWithUnread = await Promise.all(
        data.map(async (conv) => {
          const { count } = await supabase
            .from('admin_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user?.id);

          return {
            ...conv,
            user_profile: conv.user_profile?.profiles || { full_name: 'Unknown User' },
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithUnread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select(`
          *,
          sender_profile:users!sender_id(
            profiles(
              full_name,
              avatar_url
            )
          ),
          attachments:admin_message_attachments(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedMessages = data.map(msg => ({
        ...msg,
        sender_profile: msg.sender_profile?.profiles || { full_name: 'Unknown User' }
      }));

      setMessages(transformedMessages);

      // Mark messages as read
      await supabase.rpc('mark_messages_as_read', {
        conversation_uuid: conversationId,
        reader_uuid: user?.id
      });

      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      setSending(true);

      const { error } = await supabase
        .from('admin_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim(),
          is_encrypted: encryptionEnabled,
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Update conversation status
  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('admin_conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;
      await fetchConversations();
    } catch (error) {
      console.error('Error updating conversation status:', error);
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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  useEffect(() => {
    fetchConversations();
    setLoading(false);

    // Subscribe to new messages
    const subscription = supabase
      .channel('admin_messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'admin_messages' }, 
        () => {
          fetchConversations();
          if (selectedConversation) {
            fetchMessages(selectedConversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedConversation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[80vh] bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex h-full">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-neutral-200 flex flex-col">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-500" />
              Admin Messages
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Secure conversations with users
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-neutral-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  className={`p-4 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    fetchMessages(conversation.id);
                  }}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3">
                        {conversation.user_profile.avatar_url ? (
                          <img 
                            src={conversation.user_profile.avatar_url} 
                            alt={conversation.user_profile.full_name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-6 w-6 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{conversation.user_profile.full_name}</p>
                        <p className="text-xs text-neutral-500 truncate max-w-32">
                          {conversation.subject}
                        </p>
                      </div>
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(conversation.priority)}`}>
                        {conversation.priority === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                        {conversation.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(conversation.status)}`}>
                        {conversation.status}
                      </span>
                      {conversation.is_verified && (
                        <CheckCircle className="h-4 w-4 text-green-500" title="Verified conversation" />
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {new Date(conversation.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3">
                      {selectedConversation.user_profile.avatar_url ? (
                        <img 
                          src={selectedConversation.user_profile.avatar_url} 
                          alt={selectedConversation.user_profile.full_name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-6 w-6 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.user_profile.full_name}</h3>
                      <p className="text-sm text-neutral-600">{selectedConversation.subject}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedConversation.status}
                      onChange={(e) => updateConversationStatus(selectedConversation.id, e.target.value)}
                      className="text-sm border border-neutral-300 rounded-md px-2 py-1"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = message.sender_id === user?.id;
                  
                  return (
                    <motion.div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                        {!isCurrentUser && (
                          <div className="flex items-center mb-1">
                            <div className="h-6 w-6 rounded-full overflow-hidden bg-neutral-200 mr-2">
                              {message.sender_profile.avatar_url ? (
                                <img 
                                  src={message.sender_profile.avatar_url} 
                                  alt={message.sender_profile.full_name} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <User className="h-3 w-3 text-neutral-400" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-neutral-500">{message.sender_profile.full_name}</span>
                            {message.is_encrypted && (
                              <Lock className="h-3 w-3 ml-2 text-green-500" title="Encrypted message" />
                            )}
                          </div>
                        )}
                        
                        <div className={`rounded-lg p-3 ${
                          isCurrentUser 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-neutral-100 text-neutral-800'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center text-xs">
                                  <Paperclip className="h-3 w-3 mr-1" />
                                  <span>{attachment.file_name}</span>
                                  {attachment.is_encrypted && (
                                    <Lock className="h-3 w-3 ml-1 text-green-400" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className={`text-xs mt-1 flex items-center justify-between ${
                            isCurrentUser ? 'text-blue-100' : 'text-neutral-500'
                          }`}>
                            <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                            {isCurrentUser && (
                              <div className="flex items-center">
                                {message.is_read ? (
                                  <Eye className="h-3 w-3 ml-1\" title="Read" />
                                ) : (
                                  <EyeOff className="h-3 w-3 ml-1\" title="Unread" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-neutral-200">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                    className={`flex items-center text-xs px-2 py-1 rounded-md ${
                      encryptionEnabled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {encryptionEnabled ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                    {encryptionEnabled ? 'Encrypted' : 'Standard'}
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessaging;