import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Target, Users, Calendar, MessageSquare, RefreshCw, Tag, X, Send, Smile, Paperclip, ChevronDown, ChevronUp, Settings, Info, Image, Mic, Plus, Command, AlertTriangle, Zap, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { multiModelChat, type ChatMessage, type ChatResponse, type MultiModelChatOptions } from '../../lib/ai/multiModelChat';
import UserAvatar from '../profile/UserAvatar';
import AIModelSelector from './AIModelSelector';
import AIFeatureToggles from './AIFeatureToggles';
import AISettingsModal from './AISettingsModal';
import AIMessageBubble from './AIMessageBubble';
import UserMessageBubble from './UserMessageBubble';
import AIVoiceControls from './AIVoiceControls';
import AIContentModerationDialog from './AIContentModerationDialog';
import AIImageAnalysisPreview from './AIImageAnalysisPreview';
import AITypingIndicator from './AITypingIndicator';
import AIContextPanel from './AIContextPanel';
import AIMessageHistory from './AIMessageHistory';
import EventPlanningAssistant from './EventPlanningAssistant';
import EventSchedulingButton from './EventSchedulingButton';
import AvailabilityPollCard from './AvailabilityPollCard';
import EventReminderCard from './EventReminderCard';
import MultimodalChatInput from './MultimodalChatInput';
import ImageAnalysisResult from './ImageAnalysisResult';
import AdminChatDashboard from '../admin/AdminChatDashboard';
import { googleAI } from '../../lib/ai/googleAI';
import EmojiPicker from './EmojiPicker';
import ImageUploadButton from './ImageUploadButton';
import VoiceInputButton from './VoiceInputButton';

interface AdvancedMultiModelChatProps {
  communityId: string;
  onClose: () => void;
}

const AdvancedMultiModelChat: React.FC<AdvancedMultiModelChatProps> = ({
  communityId,
  onClose,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<ChatMessage & { id: string; isLoading?: boolean; audioUrl?: string; feedback?: 'positive' | 'negative' | null; isTemporary?: boolean; communityPostId?: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showEventPlanner, setShowEventPlanner] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatOptions, setChatOptions] = useState<MultiModelChatOptions>({
    preferredModel: 'xai',
    moodSync: { enabled: true, adaptToSentiment: true, personalityType: 'supportive' },
    memoryEcho: { enabled: true, depth: 5, includeUserProfile: true },
    holoVoice: { enabled: false, voice: 'feminine', emotionIntensity: 0.7, speed: 1.0 },
    moderationEnabled: true,
    temperature: 0.7,
  });
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [communityInfo, setCommunityInfo] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [imageAttachments, setImageAttachments] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activePolls, setActivePolls] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const disabled = isProcessing;

  const handleReply = (messageId: string) => {
    console.log(`Replying to message ${messageId}`);
    alert(`Reply to message ${messageId} not implemented yet.`);
  };

  const processCommand = (message: string) => {
    if (message.startsWith('/admin') && isAdmin) {
      setShowAdminDashboard(true);
      return true;
    }
    if (message.startsWith('/event')) {
      setShowEventPlanner(true);
      return true;
    }
    if (message.startsWith('/help')) {
      const helpMessage = {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: `
Available commands:
- /admin - Open admin dashboard (admin only)
- /event - Open event planning assistant
- /help - Show this help message
        `,
        feedback: null,
        isTemporary: true,
      };
      setMessages(prev => [...prev, helpMessage]);
      return true;
    }
    return false;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && imageAttachments.length === 0) return;
    if (!user || isProcessing) return;

    if (inputMessage.startsWith('/') && processCommand(inputMessage)) {
      setInputMessage('');
      return;
    }

    if (chatOptions.moderationEnabled && inputMessage.trim()) {
      try {
        const moderationResult = await googleAI.moderateContent(inputMessage);
        if (!moderationResult.isSafe) {
          setModerationResult(moderationResult);
          setPendingMessage(inputMessage);
          setShowModerationDialog(true);
          return;
        }
      } catch (error) {
        console.error('Error moderating content:', error);
      }
    }

    await sendMessage(inputMessage);
  };

  const sendMessage = async (content: string) => {
    if (!user || isProcessing) return;

    let fullContent = content.trim();
    if (!fullContent && imageAttachments.length === 0) {
      setError('Please enter a message or attach an image.');
      return;
    }

    if (imageAttachments.length > 0) {
      if (fullContent) fullContent += '\n\n';
      fullContent += 'Attached images:\n';
      imageAttachments.forEach((img, index) => {
        if (img.analysis) {
          fullContent += `[Image ${index + 1}]: ${img.analysis.description}\n`;
        } else {
          fullContent += `[Image ${index + 1}]: Image attached\n`;
        }
      });
    }

    try {
      setIsProcessing(true);
      setError('');

      const { data: savedMessage, error: saveError } = await supabase
        .from('ai_chats')
        .insert({
          user_id: user.id,
          community_id: communityId,
          content: fullContent,
          is_response: false,
          created_at: new Date(),
          metadata: {
            source: 'ai_chat',
            attachments: imageAttachments.map(img => ({ type: 'image', analysis: img.analysis })),
          },
        })
        .select('id')
        .single();

      if (saveError) throw new Error(`Failed to save message: ${saveError.message}`);

      const userMessage = {
        id: savedMessage.id,
        role: 'user',
        content: fullContent,
        feedback: null,
        isTemporary: false,
      };

      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setImageAttachments([]);

      const loadingMessageId = `assistant-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: loadingMessageId,
        role: 'assistant',
        content: '',
        isLoading: true,
        feedback: null,
        isTemporary: true,
      }]);

      const context = { userProfile: userProfile || { bio: '' }, community: communityInfo };
      const response = await multiModelChat.sendMessage(fullContent, { ...chatOptions, context });

      const { data: savedAIMessage, error: aiSaveError } = await supabase
        .from('ai_chats')
        .insert({
          user_id: user.id,
          community_id: communityId,
          content: response.message,
          is_response: true,
          parent_id: savedMessage.id,
          created_at: new Date(),
          metadata: {
            source: 'ai_response',
            model: response.model,
            sentiment: response.sentiment,
            audioUrl: response.audioUrl,
            in_reply_to: savedMessage.id,
          },
        })
        .select('id')
        .single();

      if (aiSaveError) throw new Error(`Failed to save AI response: ${aiSaveError.message}`);

      let aiMessageId = savedAIMessage.id;
      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessageId ? {
          id: aiMessageId,
          role: 'assistant',
          content: response.message,
          isLoading: false,
          model: response.model,
          sentiment: response.sentiment,
          audioUrl: response.audioUrl,
          feedback: null,
          isTemporary: false,
        } : msg
      ));

      if (chatOptions.holoVoice.enabled && response.audioUrl) {
        const audio = new Audio(response.audioUrl);
        setAudioElement(audio);
        audio.oncanplaythrough = () => { audio.play(); setIsAudioPlaying(true); };
        audio.onended = () => setIsAudioPlaying(false);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      setMessages(prev => prev.filter(msg => !msg.isLoading));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePostToFeed = async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !user || !communityId) return;

    try {
      const { data, error } = await supabase
        .from('ai_chats')
        .select('content, user_id, community_id, created_at')
        .eq('id', messageId)
        .single();
      if (error) throw error;

      const { data: savedPost, error: saveError } = await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: data.user_id,
          content: data.content,
          created_at: data.created_at,
        })
        .select('id')
        .single();
      if (saveError) throw saveError;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, communityPostId: savedPost.id } : msg
      ));
      alert('Message posted to Community Feed!');
    } catch (error) {
      console.error('Error posting to feed:', error);
      setError('Failed to post to Feed. Please try again.');
    }
  };

  const toggleAudio = () => {
    if (!audioElement) return;
    if (isAudioPlaying) {
      audioElement.pause();
      setIsAudioPlaying(false);
    } else {
      audioElement.play();
      setIsAudioPlaying(true);
    }
  };

  const handleModelChange = (model: 'xai' | 'gemini' | 'groq') => {
    setChatOptions(prev => ({ ...prev, preferredModel: model }));
  };

  const handleMoodSyncToggle = () => {
    setChatOptions(prev => ({
      ...prev,
      moodSync: { ...prev.moodSync, enabled: !prev.moodSync.enabled },
    }));
  };

  const handleMemoryEchoToggle = () => {
    setChatOptions(prev => ({
      ...prev,
      memoryEcho: { ...prev.memoryEcho, enabled: !prev.memoryEcho.enabled },
    }));
  };

  const handleHoloVoiceToggle = () => {
    setChatOptions(prev => ({
      ...prev,
      holoVoice: { ...prev.holoVoice, enabled: !prev.holoVoice.enabled },
    }));
  };

  const handlePersonalityChange = (personality: 'empathetic' | 'motivational' | 'analytical' | 'supportive') => {
    setChatOptions(prev => ({
      ...prev,
      moodSync: { ...prev.moodSync, personalityType: personality },
    }));
  };

  const handleVoiceChange = (voice: 'feminine' | 'masculine' | 'neutral') => {
    setChatOptions(prev => ({
      ...prev,
      holoVoice: { ...prev.holoVoice, voice },
    }));
  };

  const handleTemperatureChange = (temperature: number) => {
    setChatOptions(prev => ({ ...prev, temperature }));
  };

  const handleMemoryDepthChange = (depth: number) => {
    setChatOptions(prev => ({
      ...prev,
      memoryEcho: { ...prev.memoryEcho, depth },
    }));
  };

  const handleModerationToggle = () => {
    setChatOptions(prev => ({ ...prev, moderationEnabled: !prev.moderationEnabled }));
  };

  const handleClearChat = () => {
    const welcomeMessage = messages.find(msg => msg.id.startsWith('welcome'));
    setMessages(welcomeMessage ? [welcomeMessage] : []);
  };

  const handleApproveModeratedContent = () => {
    sendMessage(pendingMessage);
    setShowModerationDialog(false);
    setPendingMessage('');
  };

  const handleRejectModeratedContent = () => {
    setShowModerationDialog(false);
    setPendingMessage('');
  };

  const handleImagesSelected = (files: File[]) => {
    files.forEach(file => {
      const imageUrl = URL.createObjectURL(file);
      setImageAttachments(prev => [
        ...prev,
        { url: imageUrl, file, isAnalyzing: true, analysis: null },
      ]);

      setTimeout(() => {
        setImageAttachments(prev =>
          prev.map(img =>
            img.url === imageUrl
              ? {
                  ...img,
                  isAnalyzing: false,
                  analysis: {
                    description: "Image of a fitness activity or venue",
                    tags: ["fitness", "exercise", "wellness", "health"],
                    safetyCheck: { isSafe: true },
                    objects: ["person", "gym equipment", "workout space"],
                    colors: [
                      { name: "Blue", hex: "#4285F4" },
                      { name: "White", hex: "#FFFFFF" },
                      { name: "Gray", hex: "#9AA0A6" },
                    ],
                  },
                }
              : img
          )
        );
      }, 1500);
    });
  };

  const removeImageAttachment = (index: number) => {
    setImageAttachments(prev => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].url);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleMessageFeedback = (messageId: string, isPositive: boolean) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback: isPositive ? 'positive' : 'negative' } : msg
      )
    );
    supabase
      .from('ai_chats')
      .update({ feedback: isPositive ? 'positive' : 'negative' })
      .eq('id', messageId)
      .then(() => console.log('Feedback saved'))
      .catch(err => console.error('Error saving feedback:', err));
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    if (showMessageMenu === messageId) {
      setShowMessageMenu(null);
    }
  };

  const getModelIcon = (model: string) => {
    if (model?.includes('xai') || model?.includes('grok')) return <Zap className="h-4 w-4 text-purple-500" />;
    if (model?.includes('gemini')) return <Brain className="h-4 w-4 text-blue-500" />;
    if (model?.includes('groq')) return <Sparkles className="h-4 w-4 text-green-500" />;
    return <Bot className="h-4 w-4 text-neutral-500" />;
  };

  const getModelColor = (model: string) => {
    if (model?.includes('xai') || model?.includes('grok')) return 'bg-purple-100 text-purple-700';
    if (model?.includes('gemini')) return 'bg-blue-100 text-blue-700';
    if (model?.includes('groq')) return 'bg-green-100 text-green-700';
    return 'bg-neutral-100 text-neutral-700';
  };

  const handleEventCreated = (eventId: string) => {
    setShowEventPlanner(false);
    const eventMessage = {
      id: `system-${Date.now()}`,
      role: 'assistant',
      content: `✅ Event created successfully! You can view it in the Events tab.`,
      feedback: null,
      isTemporary: true,
    };
    setMessages(prev => [...prev, eventMessage]);
    fetchUpcomingEvents();
  };

  const fetchUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('community_events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          is_online,
          meeting_url,
          community_id
        `)
        .eq('community_id', communityId)
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) throw error;

      const eventsWithCommunity = await Promise.all(data.map(async (event) => {
        const { data: community } = await supabase
          .from('communities')
          .select('name, slug')
          .eq('id', event.community_id)
          .single();
        return {
          ...event,
          community_name: community?.name || 'Unknown Community',
          community_slug: community?.slug,
        };
      }));

      if (user) {
        const eventsWithRsvp = await Promise.all(eventsWithCommunity.map(async (event) => {
          const { data: rsvp } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .maybeSingle();
          return {
            ...event,
            rsvp_status: rsvp?.status,
          };
        }));
        setUpcomingEvents(eventsWithRsvp);
      } else {
        setUpcomingEvents(eventsWithCommunity);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setInputMessage(prev => (prev ? `${prev} ${text}` : text));
    if (isAdmin && text.trim()) {
      googleAI.analyzeMessage(text).then(analysis => {
        if (analysis.actionItems && analysis.actionItems.length > 0) {
          console.log('Action items detected in voice input:', analysis.actionItems);
        }
      }).catch(err => console.error('Error analyzing voice transcription:', err));
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', user.id);
        if (error) throw error;
        setIsAdmin(data.length > 0 && (data[0].role === 'admin' || data[0].role === 'co-admin'));
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkAdminStatus();
  }, [communityId, user]);

  useEffect(() => {
    const fetchCommunityInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('name, description, tags')
          .eq('id', communityId)
          .single();
        if (error) throw error;
        setCommunityInfo(data);
      } catch (error) {
        console.error('Error fetching community info:', error);
      }
    };
    fetchCommunityInfo();
  }, [communityId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('interests, custom_interests, experience_level, fitness_goals, bio')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const fetchActivePolls = async () => {
      try {
        const { data, error } = await supabase
          .from('event_polls')
          .select('*')
          .eq('community_id', communityId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(3);
        if (error) throw error;
        setActivePolls(data || []);
      } catch (error) {
        console.error('Error fetching active polls:', error);
      }
    };
    fetchActivePolls();
  }, [communityId]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!user || !communityId || isInitialized) return;

      try {
        const { data, error } = await supabase
          .from('ai_chats')
          .select('*')
          .eq('community_id', communityId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (error) throw error;

        if (data.length === 0) {
          const welcomePrompt = `Generate a welcome message for a user joining the ${communityInfo?.name || 'this community'} community. Use the community description: "${communityInfo?.description || 'a vibrant community'}", tags: ${JSON.stringify(communityInfo?.tags || [])}, and the user's bio: "${userProfile?.bio || 'no bio available'}". Keep it friendly, relevant to the community's focus, and invite the user to engage.`;
          const response = await multiModelChat.sendMessage(welcomePrompt, { ...chatOptions, context: { community: communityInfo, userProfile: userProfile || { bio: '' } }, temperature: 0.8 });
          const welcomeMessage = {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: response.message || 'Welcome to the community! How can I assist you today?',
            feedback: null,
            isTemporary: true,
          };
          const { error: saveError } = await supabase
            .from('ai_chats')
            .insert({
              user_id: user.id,
              community_id: communityId,
              content: welcomeMessage.content,
              is_response: true,
              created_at: new Date(),
            });
          if (saveError) throw saveError;
          setMessages([welcomeMessage]);
        } else {
          setMessages(data.map(msg => ({
            id: msg.id,
            role: msg.is_response ? 'assistant' : 'user',
            content: msg.content,
            feedback: msg.feedback || null,
            isTemporary: false,
            communityPostId: msg.community_post_id,
          })));
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        setError('Failed to load chat history. Starting fresh.');
        const fallbackMessage = {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Welcome to the AI assistant for ${communityInfo?.name || 'this community'}! I'm here to assist you and help with community activities. What would you like to talk about?`,
          feedback: null,
          isTemporary: true,
        };
        setMessages([fallbackMessage]);
      }
    };
    fetchChatHistory();
  }, [user, communityId, communityInfo, userProfile, isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node) &&
        !document.querySelector('.emoji-picker-container')?.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-white rounded-xl max-w-4xl w-full h-[80vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">MomFit AI Assistant</h2>
              <p className="text-xs text-neutral-500">Powered by multiple AI models</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdminDashboard(!showAdminDashboard)}
                className={`p-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100 ${showAdminDashboard ? 'bg-primary-100 text-primary-700' : ''}`}
                title="Admin dashboard"
              >
                <Command className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className={`p-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100 ${showContextPanel ? 'bg-primary-100 text-primary-700' : ''}`}
              title="View AI context"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className={`p-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100 ${showHistoryPanel ? 'bg-primary-100 text-primary-700' : ''}`}
              title="Chat history"
            >
              <Calendar className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {showAdminDashboard ? (
              <div className="flex-1 overflow-y-auto p-4">
                <AdminChatDashboard communityId={communityId} />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'user' ? (
                        <UserMessageBubble
                          message={{
                            id: message.id,
                            content: message.content,
                            timestamp: new Date(),
                            attachments: message.attachments || [],
                          }}
                          showMessageMenu={showMessageMenu}
                          communityId={communityId}
                          onShowMessageMenu={setShowMessageMenu}
                          voiceEnabled={chatOptions.holoVoice.enabled}
                          onTranscription={handleVoiceTranscription}
                          isAdmin={isAdmin}
                          isTemporary={message.isTemporary}
                          onPostToFeed={handlePostToFeed}
                          onReply={handleReply}
                          messageId={message.communityPostId || message.id}
                          onDelete={handleDeleteMessage}
                          onFeedback={handleMessageFeedback}
                        />
                      ) : (
                        <AIMessageBubble
                          message={message}
                          isAudioPlaying={isAudioPlaying}
                          onToggleAudio={toggleAudio}
                          getModelIcon={getModelIcon}
                          getModelColor={getModelColor}
                          onPostToFeed={handlePostToFeed}
                          onReply={handleReply}
                          messageId={message.communityPostId || message.id}
                          onDelete={handleDeleteMessage}
                          onFeedback={handleMessageFeedback}
                        />
                      )}
                    </div>
                  ))}

                  {activePolls.length > 0 && (
                    <div className="space-y-4 my-6">
                      <h3 className="text-sm font-medium text-neutral-500 mb-3">ACTIVE POLLS</h3>
                      {activePolls.map(poll => (
                        <AvailabilityPollCard key={poll.id} pollId={poll.id} communityId={communityId} />
                      ))}
                    </div>
                  )}

                  {upcomingEvents.length > 0 && (
                    <div className="space-y-4 my-6">
                      <h3 className="text-sm font-medium text-neutral-500 mb-3">UPCOMING EVENTS</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingEvents.map(event => (
                          <EventReminderCard key={event.id} event={event} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {imageAttachments.length > 0 && (
                  <div className="px-4 mb-4 space-y-2">
                    <h3 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
                      <Image className="h-4 w-4 mr-2 text-primary-500" />
                      Image Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2">
                      {imageAttachments.map((image, index) => (
                        <ImageAnalysisResult
                          key={index}
                          image={image}
                          onRemove={() => removeImageAttachment(index)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{error}</span>
                    <button
                      onClick={() => setError('')}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {chatOptions.holoVoice.enabled && (
                  <div className="px-4 mb-2">
                    <AIVoiceControls
                      isPlaying={isAudioPlaying}
                      onTogglePlay={toggleAudio}
                      voice={chatOptions.holoVoice.voice}
                      onVoiceChange={handleVoiceChange}
                      speed={chatOptions.holoVoice.speed}
                      onSpeedChange={(speed) => setChatOptions(prev => ({ ...prev, holoVoice: { ...prev.holoVoice, speed } }))}
                      emotionIntensity={chatOptions.holoVoice.emotionIntensity}
                      onEmotionIntensityChange={(intensity) => setChatOptions(prev => ({ ...prev, holoVoice: { ...prev.holoVoice, emotionIntensity: intensity } }))}
                    />
                  </div>
                )}

                <div className="px-4 py-2 border-t border-neutral-200">
                  <AIModelSelector selectedModel={chatOptions.preferredModel} onModelChange={handleModelChange} />
                </div>

                <div className="px-4 py-2 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <AIFeatureToggles
                      moodSyncEnabled={chatOptions.moodSync.enabled}
                      memoryEchoEnabled={chatOptions.memoryEcho.enabled}
                      holoVoiceEnabled={chatOptions.holoVoice.enabled}
                      onMoodSyncToggle={handleMoodSyncToggle}
                      onMemoryEchoToggle={handleMemoryEchoToggle}
                      onHoloVoiceToggle={handleHoloVoiceToggle}
                    />
                    <button
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="px-2 py-1 rounded-full text-xs flex items-center bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    >
                      {showAdvancedOptions ? <><ChevronUp className="h-3 w-3 mr-1" /> Less</> : <><ChevronDown className="h-3 w-3 mr-1" /> More</>}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showAdvancedOptions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-neutral-200"
                    >
                      <div className="p-4 bg-neutral-50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium">Advanced Options</h3>
                          <EventSchedulingButton communityId={communityId} onEventCreated={handleEventCreated} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">Personality</label>
                            <select
                              value={chatOptions.moodSync.personalityType}
                              onChange={(e) => handlePersonalityChange(e.target.value as any)}
                              className="w-full px-2 py-1 border border-neutral-300 rounded text-xs"
                              disabled={!chatOptions.moodSync.enabled}
                            >
                              <option value="supportive">Supportive</option>
                              <option value="empathetic">Empathetic</option>
                              <option value="motivational">Motivational</option>
                              <option value="analytical">Analytical</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">Creativity: {chatOptions.temperature.toFixed(1)}</label>
                            <input
                              type="range"
                              min="0.1"
                              max="1"
                              step="0.1"
                              value={chatOptions.temperature}
                              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between mt-3 pt-2 border-t border-neutral-200">
                          <button
                            onClick={handleClearChat}
                            className="text-red-600 hover:text-red-700 flex items-center text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Clear Chat
                          </button>
                          <div className="text-xs text-neutral-500">Type /help for available commands</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-4 border-t border-neutral-200">
                  <div className="flex items-center bg-neutral-50 rounded-lg p-2">
                    <button
                      ref={emojiButtonRef}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full"
                      title="Add emoji"
                    >
                      <Smile size={20} />
                    </button>
                    <ImageUploadButton onImagesSelected={handleImagesSelected} disabled={disabled} />
                    <textarea
                      className="flex-grow mx-2 bg-transparent resize-none outline-none py-2 max-h-32 min-h-[2.5rem]"
                      placeholder="Type a message or use /commands..."
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                      disabled={disabled}
                    />
                    <VoiceInputButton
                      onTranscription={handleVoiceTranscription}
                      isListening={isListening}
                      setIsListening={setIsListening}
                    />
                    <button
                      className={`p-2 rounded-full ${inputMessage.trim() || imageAttachments.length > 0 ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-neutral-200 text-neutral-500'}`}
                      onClick={handleSendMessage}
                      disabled={disabled || (inputMessage.trim() === '' && imageAttachments.length === 0)}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="emoji-picker-container"
                      >
                        <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          <AnimatePresence>
            {showContextPanel && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-l border-neutral-200 overflow-hidden"
              >
                <div className="w-[300px] h-full p-4 overflow-y-auto">
                  <AIContextPanel
                    userProfile={userProfile}
                    communityInfo={communityInfo}
                    conversationContext={{
                      recentTopics: ['fitness', 'nutrition', 'motivation'],
                      messageCount: messages.length,
                      lastInteraction: new Date(),
                    }}
                    onClose={() => setShowContextPanel(false)}
                  />
                </div>
              </motion.div>
            )}
            {showHistoryPanel && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-l border-neutral-200 overflow-hidden"
              >
                <div className="w-[300px] h-full p-4 overflow-y-auto">
                  <AIMessageHistory
                    sessions={[
                      {
                        id: '1',
                        date: new Date(),
                        title: 'Fitness Advice',
                        preview: 'We discussed workout routines and nutrition tips',
                        messageCount: 12,
                        models: ['grok', 'gemini'],
                      },
                      {
                        id: '2',
                        date: new Date(Date.now() - 86400000),
                        title: 'Meal Planning',
                        preview: 'Discussed healthy meal options for busy moms',
                        messageCount: 8,
                        models: ['mistral'],
                      },
                    ]}
                    onSelectSession={() => {}}
                    onClearHistory={handleClearChat}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showSettings && (
          <AISettingsModal
            chatOptions={chatOptions}
            onClose={() => setShowSettings(false)}
            onModelChange={handleModelChange}
            onMoodSyncToggle={handleMoodSyncToggle}
            onMemoryEchoToggle={handleMemoryEchoToggle}
            onHoloVoiceToggle={handleHoloVoiceToggle}
            onPersonalityChange={handlePersonalityChange}
            onVoiceChange={handleVoiceChange}
            onTemperatureChange={handleTemperatureChange}
            onMemoryDepthChange={handleMemoryDepthChange}
            onModerationToggle={handleModerationToggle}
          />
        )}
        {showModerationDialog && moderationResult && (
          <AIContentModerationDialog
            content={pendingMessage}
            moderationResult={moderationResult}
            onApprove={handleApproveModeratedContent}
            onReject={handleRejectModeratedContent}
            onClose={() => setShowModerationDialog(false)}
          />
        )}
        {showEventPlanner && (
          <EventPlanningAssistant
            communityId={communityId}
            onClose={() => setShowEventPlanner(false)}
            onEventCreated={handleEventCreated}
          />
        )}
      </motion.div>
    </div>
  );
};

export default AdvancedMultiModelChat;