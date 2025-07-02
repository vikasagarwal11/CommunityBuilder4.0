import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  User, 
  Send, 
  Search, 
  X, 
  Shield,
  Eye,
  EyeOff,
  UserX,
  Settings,
  Smile
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import UserAvatar from '../profile/UserAvatar';
import EmojiPicker from './EmojiPicker';

interface DirectConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  community_id: string;
  last_message_at: string;
  other_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  unread_count: number;
  last_message?: string;
}

interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface CommunityMember {
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface DirectMessagingProps {
  communityId: string;
  communityName: string;
  onClose: () => void;
  initialUser?: any;
}

const DirectMessaging: React.FC<DirectMessagingProps> = ({ 
  communityId, 
  communityName, 
  onClose,
  initialUser
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>([]);
  const [dmEnabled, setDmEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Check if DMs are enabled for this community
  const checkDMSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('community_settings')
        .select('allow_direct_messages')
        .eq('community_id', communityId)
        .single();

      if (error) throw error;
      setDmEnabled(data?.allow_direct_messages ?? true);
    } catch (error) {
      console.error('Error checking DM settings:', error);
    }
  };

  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data: conversationsData, error } = await supabase
        .from('direct_conversations')
        .select('*')
        .eq('community_id', communityId)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      // Get other user IDs
      const otherUserIds = conversationsData.map(conv => 
        conv.user1_id === user.id ? conv.user2_id : conv.user1_id
      );

      // Fetch profiles for other users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', otherUserIds);

      if (profilesError) throw profilesError;

      // Transform conversations with user data and unread counts
      const conversationsWithData = await Promise.all(
        conversationsData.map(async (conv) => {
          const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
          const otherUser = profiles?.find(p => p.id === otherUserId);

          // Get unread count
          const { count } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          // Get last message - use maybeSingle() to handle conversations with no messages
          const { data: lastMessage } = await supabase
            .from('direct_messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            other_user: {
              id: otherUserId,
              full_name: otherUser?.full_name || 'Unknown User',
              avatar_url: otherUser?.avatar_url
            },
            unread_count: count || 0,
            last_message: lastMessage?.content
          };
        })
      );

      setConversations(conversationsWithData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch community members for new chat
  const fetchCommunityMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          user_id,
          profiles!inner(
            full_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .neq('user_id', user?.id);

      if (error) throw error;
      setCommunityMembers(data || []);
    } catch (error) {
      console.error('Error fetching community members:', error);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('direct_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id);

      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Start new conversation
  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    // Prevent starting a conversation with yourself
    if (otherUserId === user.id) {
      console.error("Cannot start a conversation with yourself");
      return;
    }

    try {
      // Check if conversation already exists
      const { data: existingConv, error } = await supabase
        .from('direct_conversations')
        .select('*')
        .eq('community_id', communityId)
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (error) {
        console.error('Error checking existing conversation:', error);
      } else if (existingConv) {
        // Conversation exists, select it
        const otherUser = communityMembers.find(m => m.user_id === otherUserId);
        setSelectedConversation({
          ...existingConv,
          other_user: {
            id: otherUserId,
            full_name: otherUser?.profiles.full_name || 'Unknown User',
            avatar_url: otherUser?.profiles.avatar_url
          },
          unread_count: 0
        });
        fetchMessages(existingConv.id);
      } else {
        // Create new conversation
        const { data: newConv, error: insertError } = await supabase
          .from('direct_conversations')
          .insert({
            user1_id: user.id,
            user2_id: otherUserId,
            community_id: communityId,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const otherUser = communityMembers.find(m => m.user_id === otherUserId);
        setSelectedConversation({
          ...newConv,
          other_user: {
            id: otherUserId,
            full_name: otherUser?.profiles.full_name || 'Unknown User',
            avatar_url: otherUser?.profiles.avatar_url
          },
          unread_count: 0
        });
        setMessages([]);
        fetchConversations();
      }

      setShowNewChat(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      setSending(true);

      const { error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim(),
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

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        checkDMSettings(),
        fetchConversations(),
        fetchCommunityMembers()
      ]);
      setLoading(false);
    };

    loadData();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`direct_messages_${communityId}_${user?.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'direct_messages' }, 
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
  }, [communityId, user]);

  // If initialUser is provided, start a conversation with them
  useEffect(() => {
    if (initialUser && user && !loading) {
      startConversation(initialUser.user_id);
    }
  }, [initialUser, user, loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-center mt-4">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!dmEnabled) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div 
          className="bg-white rounded-xl max-w-md w-full p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <UserX className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Direct Messages Disabled</h3>
          <p className="text-neutral-600 mb-6">
            Direct messaging has been disabled for this community by the administrators.
          </p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </motion.div>
      </div>
    );
  }

  const filteredMembers = communityMembers.filter(member =>
    member.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Conversations List */}
        <div className="w-1/3 border-r border-neutral-200 flex flex-col">
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-primary-500" />
                Direct Messages
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="w-full btn-primary text-sm"
            >
              New Message
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-neutral-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                <p>No conversations yet</p>
                <p className="text-xs">Start a new message!</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    fetchMessages(conversation.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3">
                        {conversation.other_user.avatar_url ? (
                          <img 
                            src={conversation.other_user.avatar_url} 
                            alt={conversation.other_user.full_name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-6 w-6 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{conversation.other_user.full_name}</p>
                        {conversation.last_message && (
                          <p className="text-xs text-neutral-500 truncate max-w-32">
                            {conversation.last_message}
                          </p>
                        )}
                      </div>
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {new Date(conversation.last_message_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {showNewChat ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Start New Conversation</h3>
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center p-3 hover:bg-neutral-50 rounded-lg cursor-pointer"
                      onClick={() => startConversation(member.user_id)}
                    >
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3">
                        {member.profiles.avatar_url ? (
                          <img 
                            src={member.profiles.avatar_url} 
                            alt={member.profiles.full_name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-6 w-6 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.profiles.full_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3">
                    {selectedConversation.other_user.avatar_url ? (
                      <img 
                        src={selectedConversation.other_user.avatar_url} 
                        alt={selectedConversation.other_user.full_name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <User className="h-6 w-6 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedConversation.other_user.full_name}</h3>
                    <p className="text-xs text-neutral-500">
                      {communityName} member
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
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
                          <div className={`rounded-lg p-3 ${
                            isCurrentUser 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-neutral-100 text-neutral-800'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            
                            <div className={`text-xs mt-1 flex items-center justify-between ${
                              isCurrentUser ? 'text-primary-100' : 'text-neutral-500'
                            }`}>
                              <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                              {isCurrentUser && (
                                <div className="flex items-center">
                                  {message.is_read ? (
                                    <Eye className="h-3 w-3 ml-1" title="Read" />
                                  ) : (
                                    <EyeOff className="h-3 w-3 ml-1" title="Unread" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-neutral-200">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 left-0">
                        <EmojiPicker
                          onEmojiSelect={(emoji) => {
                            setNewMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
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
                <p className="text-sm">Or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DirectMessaging;