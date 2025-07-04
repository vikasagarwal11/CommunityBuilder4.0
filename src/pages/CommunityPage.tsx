import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Calendar,
  Settings,
  UserPlus,
  LogOut,
  Bot,
  Shield,
  ThumbsUp,
  Heart,
  Bell,
  Info,
  Clock,
  MapPin,
  ArrowRight,
  Zap,
  Award,
  Sparkles,
  TrendingUp,
  Star,
  Tag,
  Crown,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/profile/UserAvatar';
import AdvancedMultiModelChat from '../components/chat/AdvancedMultiModelChat';
import CommunityHeader from '../components/community/CommunityHeader';
import CommunityAIProfile from '../components/community/CommunityAIProfile';
import CommunityAdminContact from '../components/community/CommunityAdminContact';
import DirectMessaging from '../components/chat/DirectMessaging';
import AIRealtimeRecommendations from '../components/chat/AIRealtimeRecommendations';
import ErrorBoundary from '../components/ErrorBoundary';
import CommunitySettings from '../components/community/CommunitySettings';
import CommunityJoinButton from '../components/community/CommunityJoinButton';
import MessageReactions from '../components/chat/MessageReactions';
import MessageIntentDetector from '../components/chat/MessageIntentDetector';
import { handleNewMessage } from '../lib/ai/chatOrchestrator';


// Types
interface Community {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  tags?: string[];
  created_at: string;
}

interface Profile {
  full_name?: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: Profile;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Profile;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  is_online?: boolean;
  meeting_url?: string;
  community_id: string;
  rsvp_status?: 'going' | 'maybe' | 'not_going';
}

interface UserActivity {
  posts: number;
  likes: number;
  comments: number;
  events: number;
}

const StatBox = React.memo(({ label, value }: { label: string; value: number }) => (
  <div className="bg-neutral-50 p-3 rounded-lg text-center">
    <p className="text-xl font-semibold text-primary-500">{value}</p>
    <p className="text-xs text-neutral-500">{label}</p>
  </div>
));

const CommunityPage: React.FC = () => {
  const AI_BOT_ID = '00000000-0000-4000-8000-AI_BOT';   // ⇢ put the same UUID you'll insert in SQL
  const { user } = useAuth();
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate(); 

  // State
const [community, setCommunity] = useState<Community | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string>('');
const [userRole, setUserRole] = useState<string | null>(null);
const [isMember, setIsMember] = useState(false);
const [recentMessages, setRecentMessages] = useState<Message[]>([]);
const [comments, setComments] = useState<Record<string, Comment[]>>({});
const [messageLikes, setMessageLikes] = useState<Record<string, boolean>>({});
const [members, setMembers] = useState<any[]>([]);
const [userCommunities, setUserCommunities] = useState<any[]>([]);
const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
const [directMessageUser, setDirectMessageUser] = useState<any | null>(null);
const [showMembersList, setShowMembersList] = useState(false);
const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
const messagesEndRef = useRef<HTMLDivElement>(null);
const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members' | 'about'>('feed');
const [showWelcomeModal, setShowWelcomeModal] = useState(false);
const [userActivity, setUserActivity] = useState<UserActivity>({ posts: 0, likes: 0, comments: 0, events: 0 });
const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
const [sendingMessage, setSendingMessage] = useState(false);
const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);
const [replyingTo, setReplyingTo] = useState<string | null>(null);
const [replyContent, setReplyContent] = useState('');
const [currentMessage, setCurrentMessage] = useState(''); // Already added from previous fix
const [showAIChat, setShowAIChat] = useState(false); // Added missing state
const [showAIProfile, setShowAIProfile] = useState(false); // Added missing state
const [showAdminContact, setShowAdminContact] = useState(false); // Added missing state
const [showDirectMessage, setShowDirectMessage] = useState(false); // Added missing state
const [showSettings, setShowSettings] = useState(false); // Added missing state

  // Utility Functions
  const isAuthor = (userId: string) => user && userId === user.id;
  const isAdmin = userRole === 'admin' || userRole === 'co-admin';
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Resize Handler with Debounce
  useEffect(() => {
    const handleResize = debounce(() => setSidebarCollapsed(window.innerWidth < 1024), 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        let communityData;
        if (slug) {
          const { data, error } = await supabase.from('communities').select('*').eq('slug', slug).single();
          if (error) throw error;
          communityData = data;
        } else if (id) {
          const { data, error } = await supabase.from('communities').select('*').eq('id', id).single();
          if (error) throw error;
          communityData = data;
        } else {
          throw new Error('Community ID or slug is required');
        }

        setCommunity(communityData);
        setSelectedCommunityId(communityData.id);

        if (user) {
          const { data: memberData, error: memberError } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', communityData.id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (!memberError && memberData) {
            setUserRole(memberData.role);
            setIsMember(true);
            const joinedRecently = sessionStorage.getItem('joinedCommunity') === communityData.id;
            if (joinedRecently) {
              setShowWelcomeModal(true);
              sessionStorage.removeItem('joinedCommunity');
            }
          } else {
            setUserRole(null);
            setIsMember(false);
          }

          const [userPosts, userLikes, userComments, userEvents] = await Promise.all([
            supabase
              .from('community_posts')
              .select('id', { count: 'exact', head: true })
              .eq('community_id', communityData.id)
              .eq('user_id', user.id),
            supabase
              .from('message_reactions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('emoji', '👍'),
            supabase
              .from('post_comments')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
            supabase
              .from('event_rsvps')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('status', 'going'),
          ]);
          setUserActivity({
            posts: userPosts?.count || 0,
            likes: userLikes?.count || 0,
            comments: userComments?.count || 0,
            events: userEvents?.count || 0,
          });
        }

        await Promise.all([
          fetchMessages(communityData.id),
          fetchMembers(communityData.id),
          fetchUserCommunities(),
          fetchTrendingTopics(communityData.id),
          fetchUpcomingEvents(communityData.id),
        ]);
      } catch (error) {
        console.error('Error fetching community data:', error);
        setError('Failed to load community. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, slug, user]);

  // Real-Time Subscription
  useEffect(() => {
    if (!community?.id) return;
    const subscription = supabase
      .channel(`community_posts_${community.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_posts', filter: `community_id=eq.${community.id}` },
        (payload) => {
          const newPost = payload.new as Message;
          setRecentMessages((prev) => [newPost, ...prev].filter((msg) => msg.community_id === community.id).slice(0, 10));
          fetchCommentsForMessages([newPost.id]);
          fetchLikesForMessages([newPost.id]);
        },
      )
      .subscribe();
    return () => subscription.unsubscribe();
  }, [community?.id]);

  // Scroll to Latest Message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentMessages]);

  // Data Fetching Functions
  const fetchMessages = async (communityId: string) => {
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('id, content, created_at, user_id, profiles!user_id(full_name, avatar_url)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        setRecentMessages(data as Message[]);
        await Promise.all([fetchCommentsForMessages(data.map((msg) => msg.id)), fetchLikesForMessages(data.map((msg) => msg.id))]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchMembers = async (communityId: string) => {
    try {
      const { data } = await supabase
        .from('community_members')
        .select(`
          user_id,
          role,
          joined_at,
          profiles!user_id(
            full_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .limit(20);
      if (data) {
        const filteredMembers = user ? data.filter((member) => member.user_id !== user.id) : data;
        setMembers(filteredMembers);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchUserCommunities = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          community_id,
          role,
          communities (
            id,
            name,
            image_url,
            is_active,
            deleted_at
          )
        `)
        .eq('user_id', user.id);
      if (error) throw error;
      const activeCommunities = data
        .filter((item) => item.communities.is_active !== false && !item.communities.deleted_at)
        .map((item) => ({
          id: item.communities.id,
          name: item.communities.name,
          image_url: item.communities.image_url,
          role: item.role,
        }));
      setUserCommunities(activeCommunities);
    } catch (error) {
      console.error('Error fetching user communities:', error);
    }
  };

  const fetchTrendingTopics = async (communityId: string) => {
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('content')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        const keywords = ['workout', 'nutrition', 'yoga', 'running', 'strength', 'motivation', 'recovery', 'sleep', 'stress', 'goals'];
        const topicCounts: Record<string, number> = {};
        data.forEach((msg) => {
          const content = msg.content.toLowerCase();
          keywords.forEach((keyword) => {
            if (content.includes(keyword)) {
              topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
            }
          });
        });
        const sortedTopics = Object.entries(topicCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([topic]) => topic)
          .slice(0, 5);
        setTrendingTopics(sortedTopics);
      }
    } catch (error) {
      console.error('Error fetching trending topics:', error);
    }
  };

  const fetchUpcomingEvents = async (communityId: string) => {
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
      const eventsWithCommunity = await Promise.all(
        data.map(async (event) => {
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
        }),
      );
      if (user) {
        const eventsWithRsvp = await Promise.all(
          eventsWithCommunity.map(async (event) => {
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
          }),
        );
        setUpcomingEvents(eventsWithRsvp);
      } else {
        setUpcomingEvents(eventsWithCommunity);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const fetchCommentsForMessages = async (messageIds: string[]) => {
    if (!messageIds.length) return;
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          profiles!user_id(
            full_name,
            avatar_url
          )
        `)
        .in('post_id', messageIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const commentsByPost: Record<string, Comment[]> = {};
      data?.forEach((comment) => {
        if (!commentsByPost[comment.post_id]) {
          commentsByPost[comment.post_id] = [];
        }
        commentsByPost[comment.post_id].push(comment as Comment);
      });
      setComments((prev) => ({ ...prev, ...commentsByPost }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchLikesForMessages = async (messageIds: string[]) => {
    if (!messageIds.length || !user) return;
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('source_id')
        .eq('source_table', 'community_posts')
        .eq('emoji', '👍')
        .in('source_id', messageIds)
        .eq('user_id', user.id);
      if (error) throw error;
      const likesMap: Record<string, boolean> = {};
      data?.forEach((like) => {
        likesMap[like.source_id] = true;
      });
      setMessageLikes((prev) => ({ ...prev, ...likesMap }));
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  // Action Handlers
  const handleJoinCommunity = async () => {
    if (!user || !community) return;
    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          user_id: user.id,
          community_id: community.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        });
      if (error) throw error;
      setIsMember(true);
      setUserRole('member');
      sessionStorage.setItem('joinedCommunity', community.id);
      setShowWelcomeModal(true);
    } catch (error) {
      console.error('Error joining community:', error);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!user || !community) return;
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('user_id', user.id)
        .eq('community_id', community.id);
      if (error) throw error;
      setIsMember(false);
      setUserRole(null);
    } catch (error) {
      console.error('Error leaving community:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!user || !community || !message.trim()) return;
    try {
      setSendingMessage(true);
      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        content: message.trim(),
        created_at: new Date().toISOString(),
        user_id: user.id,
        profiles: {
          full_name: user.user_metadata?.full_name || 'You',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };
      setRecentMessages((prev) => [tempMessage, ...prev]);
      setCurrentMessage('');
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          community_id: community.id,
          user_id: user.id,
          content: message.trim(),
          created_at: new Date().toISOString(),
        })
        .select();
      if (error) throw error;
      await fetchMessages(community.id);
      setUserActivity((prev) => ({
        ...prev,
        posts: prev.posts + 1,
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setRecentMessages((prev) => prev.filter((msg) => !msg.id.startsWith('temp-')));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReply = async (messageId: string) => {
    if (!user || !community) return;
    setReplyingTo(messageId);
    try {
      if (replyContent.trim()) {
        const { data, error } = await supabase
          .from('post_comments')
          .insert({
            post_id: messageId,
            user_id: user.id,
            content: replyContent.trim(),
            created_at: new Date().toISOString(),
          })
          .select(`
            id,
            post_id,
            user_id,
            content,
            created_at,
            profiles!user_id(
              full_name,
              avatar_url
            )
          `);
        if (error) throw error;
        if (data && data.length > 0) {
          setComments((prev) => ({
            ...prev,
            [messageId]: [...(prev[messageId] || []), data[0] as Comment],
          }));
          setUserActivity((prev) => ({
            ...prev,
            comments: prev.comments + 1,
          }));
        }
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setReplyingTo(null);
      setReplyContent('');
    }
  };

  const handleLike = async (messageId: string) => {
    if (!user || !community) return;
    try {
      const isLiked = messageLikes[messageId];
      setMessageLikes((prev) => ({
        ...prev,
        [messageId]: !isLiked,
      }));
      if (isLiked) {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('source_id', messageId)
          .eq('source_table', 'community_posts')
          .eq('user_id', user.id)
          .eq('emoji', '👍');
        if (error) throw error;
        setUserActivity((prev) => ({
          ...prev,
          likes: Math.max(prev.likes - 1, 0),
        }));
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            source_id: messageId,
            source_table: 'community_posts',
            user_id: user.id,
            emoji: '👍',
          });
        if (error) throw error;
        setUserActivity((prev) => ({
          ...prev,
          likes: prev.likes + 1,
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setMessageLikes((prev) => ({
        ...prev,
        [messageId]: messageLikes[messageId],
      }));
    }
  };

  const handleShowSettings = () => setShowSettings(true);
  const handleStartDirectMessage = (member: any) => {
    setDirectMessageUser(member);
    setShowDirectMessage(true);
  };

  // Debounce Utility
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Render
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Community Not Found</h1>
          <p className="text-gray-600 mb-4">The community you're looking for doesn't exist or has been removed.</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <CommunityHeader
        community={community}
        userRole={userRole || ''}
        isMember={isMember}
        onJoin={handleJoinCommunity}
        onLeave={handleLeaveCommunity}
        onShowSettings={isAdmin ? handleShowSettings : undefined}
        onShowAdminContact={isMember ? () => setShowAdminContact(true) : undefined}
        onShowDirectMessage={isMember ? () => setShowDirectMessage(true) : undefined}
        onShowAIProfile={isMember ? () => setShowAIProfile(true) : undefined}
      />

      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl max-w-md w-full p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="text-center">
                <div className="h-16 w-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Welcome to {community.name}!</h3>
                <p className="text-neutral-600 mb-6">
                  You've successfully joined this community. Here are some things you can do:
                </p>
                <div className="space-y-4 text-left mb-6">
                  <div className="flex items-start">
                    <div className="bg-primary-100 p-2 rounded-full mr-3">
                      <MessageSquare className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium">Introduce yourself</p>
                      <p className="text-sm text-neutral-500">Share a bit about yourself with the community</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-secondary-100 p-2 rounded-full mr-3">
                      <Calendar className="h-5 w-5 text-secondary-500" />
                    </div>
                    <div>
                      <p className="font-medium">Check upcoming events</p>
                      <p className="text-sm text-neutral-500">Join events to connect with other members</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-purple-100 p-2 rounded-full mr-3">
                      <Bot className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Try the AI assistant</p>
                      <p className="text-sm text-neutral-500">Get personalized recommendations and support</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowWelcomeModal(false)} className="btn-primary w-full">
                  Get Started
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container max-w-6xl py-8">
        <div className="mb-6 border-b border-neutral-200">
          <div className="flex overflow-x-auto scrollbar-hide">
            {[
              { id: 'feed', label: 'Community Feed', icon: <MessageSquare className="h-4 w-4" /> },
              { id: 'events', label: 'Events', icon: <Calendar className="h-4 w-4" /> },
              { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
              { id: 'about', label: 'About', icon: <Info className="h-4 w-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
                {tab.id === 'events' && upcomingEvents.length > 0 && (
                  <span className="ml-2 bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 text-xs">
                    {upcomingEvents.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.aside
                className="w-full lg:w-64 shrink-0 space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {user && isMember && (
                  <motion.div
                    className="bg-white rounded-xl shadow-sm p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center mb-4">
                      <UserAvatar src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || 'User'} size="md" />
                      <div className="ml-3">
                        <h3 className="font-semibold">{user.user_metadata?.full_name || 'User'}</h3>
                        <p className="text-xs text-neutral-500 capitalize">{userRole || 'Member'}</p>
                      </div>
                    </div>
                    <h4 className="text-xs font-medium text-neutral-500 mb-2">Your Activity</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <StatBox label="Posts" value={userActivity.posts} />
                      <StatBox label="Comments" value={userActivity.comments} />
                      <StatBox label="Reactions" value={userActivity.likes} />
                      <StatBox label="Events" value={userActivity.events} />
                    </div>
                    <button
                      onClick={() => setShowAIChat(true)}
                      className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:opacity-90 flex items-center justify-center"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      AI Assistant
                    </button>
                  </motion.div>
                )}

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">My Communities</h3>

                  {userCommunities.length ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {userCommunities.map(comm=>(
                       <button
                         key={comm.id}
                         /* navigate to the selected community */
                         onClick={() => navigate(`/community/${comm.id}`)}
                          className={`flex w-full text-left items-center p-2 rounded-lg hover:bg-neutral-100
                                      ${comm.id===community.id?'bg-primary-50 border border-primary-200':''}`}
                        >
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-200 mr-2">
                            {comm.image_url
                              ? <img src={comm.image_url} alt={comm.name} className="h-full w-full object-cover"/>
                              : <div className="h-full w-full flex items-center justify-center">
                                  <Users className="h-4 w-4 text-neutral-400"/>
                                </div>}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-medium text-sm truncate">{comm.name}</p>
                            <p className="text-xs text-neutral-500 capitalize">{comm.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ):(
                    <p className="text-neutral-500 text-center">No communities joined</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <Link to="/communities"
                          className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center justify-center">
                      Explore Communities
                    </Link>
                  </div>
                </div>

                {trendingTopics.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-primary-500" />
                      Trending Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {trendingTopics.map((topic, index) => (
                        <div
                          key={index}
                          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm cursor-pointer flex items-center"
                          onClick={() => setCurrentMessage((prev) => (prev ? `${prev} #${topic}` : `#${topic}`))}
                        >
                          <Tag className="h-3 w-3 mr-1 text-primary-500" />
                          <span className="capitalize">{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {upcomingEvents.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-primary-500" />
                        Upcoming Events
                      </h3>
                      <button onClick={() => setActiveTab('events')} className="text-primary-500 hover:text-primary-600 text-sm">
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {upcomingEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('events')}
                        >
                          <h4 className="font-medium text-sm mb-1">{event.title}</h4>
                          <div className="flex items-center text-xs text-neutral-500 mb-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatDate(event.start_time)}</span>
                            <span className="mx-1">•</span>
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{formatTime(event.start_time)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center text-xs text-neutral-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.rsvp_status && (
                            <div className="mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  event.rsvp_status === 'going'
                                    ? 'bg-green-100 text-green-700'
                                    : event.rsvp_status === 'maybe'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {event.rsvp_status === 'going'
                                  ? 'Going'
                                  : event.rsvp_status === 'maybe'
                                  ? 'Maybe'
                                  : 'Not Going'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Members</h3>
                    <button onClick={() => setActiveTab('members')} className="text-primary-500 hover:text-primary-600 text-sm">
                      View All
                    </button>
                  </div>
                  {members.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {members.slice(0, 5).map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center p-2 rounded-lg hover:bg-neutral-100 cursor-pointer"
                          onClick={() => handleStartDirectMessage(member)}
                        >
                          <UserAvatar src={member.profiles?.avatar_url} alt={member.profiles?.full_name || 'User'} size="sm" />
                          <div className="ml-2">
                            <p className="font-medium text-sm">{member.profiles?.full_name || 'Unknown User'}</p>
                            <p className="text-xs text-neutral-500 capitalize">{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-center">No members yet</p>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="lg:hidden fixed top-1/2 left-4 p-2 bg-white rounded-full shadow-md z-10"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={sidebarCollapsed ? 'M4 6h16M4 12h16m-7 6h7' : 'M6 18L18 6M6 6l12 12'}
              />
            </svg>
          </button>

          <main className="flex-1">
            {activeTab === 'feed' && (
  <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
    <h2 className="text-xl font-semibold mb-4">Community Feed</h2>

    {isMember && (
      <div className="mb-6 sticky top-0 bg-white z-10">
        <textarea
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Share something with the community..."
          className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2 max-w-2xl mx-auto"
          rows={3}
        />
        {currentMessage && (
          <AIRealtimeRecommendations
            communityId={community.id}
            recentMessages={recentMessages}
            currentMessage={currentMessage}
            onSuggestionSelect={(suggestion) => setCurrentMessage(suggestion)}
          />
        )}
        <div className="flex justify-end">
          <button
            onClick={() => handleSendMessage(currentMessage)}
            disabled={!currentMessage.trim() || sendingMessage}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center"
          >
            {sendingMessage ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Posting...
              </>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    )}

    {!isMember && (
      <div className="bg-primary-50 border border-primary-100 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <div className="bg-primary-100 p-3 rounded-full mr-4">
            <Users className="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-700 mb-2">Join this community</h3>
            <p className="text-primary-600 mb-4">
              Join this community to participate in discussions, attend events, and connect with other members.
            </p>
            <CommunityJoinButton
              community={community}
              isMember={isMember}
              onJoinSuccess={() => {
                setIsMember(true);
                setUserRole('member');
                sessionStorage.setItem('joinedCommunity', community.id);
                setShowWelcomeModal(true);
              }}
              onRequestSent={() => {
                // Handle request sent notification
              }}
            />
          </div>
        </div>
      </div>
    )}

    {recentMessages.length > 0 ? (
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {recentMessages.map((message) => (
          <motion.div
            key={message.id}
            className="p-3 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-shadow max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center mb-2">
              <UserAvatar src={message.profiles?.avatar_url} alt={message.profiles?.full_name || 'User'} size="sm" />
              <div className="ml-2">
                <p className="font-semibold text-sm">{message.profiles?.full_name || 'Unknown User'}</p>
                <p className="text-xs text-neutral-500" title={new Date(message.created_at).toLocaleString()}>
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
            <p className="text-neutral-700 whitespace-pre-wrap">{message.content}</p>

            {/* AI Intent Detection */}
            <MessageIntentDetector
              message={message}
              communityId={community.id}
              isAdmin={isAdmin}
              onEventCreated={(eventId) => {
                // Refresh events when a new event is created
                fetchUpcomingEvents(community.id);
              }}
            />

            <MessageReactions
              messageId={message.id}
              sourceTable="community_posts"
              onReply={() => setReplyingTo(message.id)}
              className="mt-3"
              disabled={isAuthor(message.user_id)}
            />

            {replyingTo === message.id && (
              <div className="mt-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
                  rows={2}
                />
                <button
                  onClick={() => handleReply(message.id)}
                  disabled={!replyContent.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                  Send Reply
                </button>
              </div>
            )}

            {comments[message.id] && comments[message.id].length > 0 && (
              <div className="mt-3 pl-4 border-l border-neutral-200 space-y-2">
                {comments[message.id].map((comment) => (
                  <div key={comment.id} className="p-2 bg-neutral-50 rounded">
                    <div className="flex items-center mb-1">
                      <UserAvatar src={comment.profiles?.avatar_url} alt={comment.profiles?.full_name || 'User'} size="xs" />
                      <div className="ml-1">
                        <p className="font-medium text-xs">{comment.profiles?.full_name || 'Unknown User'}</p>
                        <p className="text-xs text-neutral-500" title={new Date(comment.created_at).toLocaleString()}>
                          {formatTime(comment.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    ) : (
      <div className="text-center py-12 bg-neutral-50 rounded-xl">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
        <h3 className="text-lg font-medium mb-2">No messages yet</h3>
        {isMember && (
          <button
            onClick={() => document.querySelector('textarea')?.focus()}
            className="btn-primary"
          >
            Start a Conversation
          </button>
        )}
      </div>
    )}
  </div>
)}

            {activeTab === 'events' && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Upcoming Events</h2>
                  {isAdmin && (
                    <Link to={`/community/${community.id}/events/create`} className="btn-primary flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Link>
                  )}
                </div>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-6">
                    {upcomingEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-1/3 bg-gradient-to-br from-primary-500 to-secondary-500 text-white p-6 flex flex-col justify-center items-center">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{new Date(event.start_time).getDate()}</p>
                              <p className="uppercase">{new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}</p>
                              <p className="mt-2 text-sm">{new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                              <p className="mt-4 text-lg">{formatTime(event.start_time)}</p>
                            </div>
                          </div>
                          <div className="md:w-2/3 p-6">
                            <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                            <p className="text-neutral-600 mb-4 line-clamp-2">{event.description}</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {event.location && (
                                <div className="flex items-center text-sm text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
                                  <MapPin className="h-4 w-4 mr-1 text-neutral-500" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.is_online && (
                                <div className="flex items-center text-sm text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
                                  <Zap className="h-4 w-4 mr-1 text-neutral-500" />
                                  <span>Online Event</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              {event.rsvp_status ? (
                                <span
                                  className={`text-sm px-3 py-1 rounded-full ${
                                    event.rsvp_status === 'going'
                                      ? 'bg-green-100 text-green-700'
                                      : event.rsvp_status === 'maybe'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {event.rsvp_status === 'going'
                                    ? 'Going'
                                    : event.rsvp_status === 'maybe'
                                    ? 'Maybe'
                                    : 'Not Going'}
                                </span>
                              ) : (
                                <span></span>
                              )}
                              <Link
                                to={`/community/${event.community_id}/events?event=${event.id}`}
                                className="text-primary-500 hover:text-primary-600 font-medium flex items-center"
                              >
                                View Details
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-neutral-50 rounded-xl">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                    <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
                    {isAdmin && (
                      <Link to={`/community/${community.id}/events/create`} className="btn-primary">
                        Create First Event
                      </Link>
                    )}
                  </div>
                )}
                <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
                  <Link
                    to={`/community/${community.id}/events`}
                    className="text-primary-500 hover:text-primary-600 font-medium flex items-center justify-center"
                  >
                    View All Events
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-6">Community Members</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <motion.div
                      key={member.user_id}
                      className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-all"
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleStartDirectMessage(member)}
                    >
                      <div className="flex items-center">
                        <UserAvatar src={member.profiles?.avatar_url} alt={member.profiles?.full_name || 'User'} size="md" />
                        <div className="ml-3">
                          <p className="font-semibold">{member.profiles?.full_name || 'Unknown User'}</p>
                          <div className="flex items-center">
                            <p className="text-xs text-neutral-500 capitalize mr-2">{member.role}</p>
                            {member.role === 'admin' ? (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            ) : member.role === 'co-admin' ? (
                              <Shield className="h-3 w-3 text-blue-500" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-between items-center">
                        <span className="text-xs text-neutral-500">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                        <button className="text-primary-500 hover:text-primary-600 text-sm font-medium">Message</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-6">About {community.name}</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Description</h3>
                    <p className="text-neutral-700">{community.description}</p>
                  </div>
                  {community.tags && community.tags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {community.tags.map((tag: string, index: number) => (
                          <span key={index} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-medium mb-3">Community Stats</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-neutral-50 p-4 rounded-lg text-center">
                        <Users className="h-6 w-6 text-primary-500 mx-auto mb-2" />
                        <p className="text-xl font-semibold">{members.length}</p>
                        <p className="text-sm text-neutral-500">Members</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-lg text-center">
                        <MessageSquare className="h-6 w-6 text-secondary-500 mx-auto mb-2" />
                        <p className="text-xl font-semibold">{recentMessages.length}</p>
                        <p className="text-sm text-neutral-500">Posts</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-lg text-center">
                        <Calendar className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-xl font-semibold">{upcomingEvents.length}</p>
                        <p className="text-sm text-neutral-500">Events</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-lg text-center">
                        <Clock className="h-6 w-6 text-green-500 mx-auto mb-2" />
                        <p className="text-xl font-semibold">{Math.floor((new Date().getTime() - new Date(community.created_at).getTime()) / (1000 * 60 * 60 * 24))}</p>
                        <p className="text-sm text-neutral-500">Days Active</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-3">Community Rules</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="bg-primary-100 rounded-full h-6 w-6 flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-primary-700 font-medium">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Be respectful and supportive</p>
                          <p className="text-sm text-neutral-600">Treat all members with kindness and respect</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="bg-primary-100 rounded-full h-6 w-6 flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-primary-700 font-medium">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Share valuable content</p>
                          <p className="text-sm text-neutral-600">Focus on helpful, relevant information</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="bg-primary-100 rounded-full h-6 w-6 flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-primary-700 font-medium">3</span>
                        </div>
                        <div>
                          <p className="font-medium">Respect privacy</p>
                          <p className="text-sm text-neutral-600">Don't share personal information without consent</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-neutral-200">
                    <p className="text-sm text-neutral-500">Community created on {new Date(community.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showAIChat && (
  <ErrorBoundary>
    <AdvancedMultiModelChat communityId={community.id} onClose={() => setShowAIChat(false)} />
  </ErrorBoundary>
)}

{showAIProfile && (
  <CommunityAIProfile communityId={community.id} isAdmin={isAdmin} onClose={() => setShowAIProfile(false)} />
)}

{showAdminContact && (
  <CommunityAdminContact communityId={community.id} communityName={community.name} onClose={() => setShowAdminContact(false)} />
)}

{showDirectMessage && (
  <DirectMessaging
    communityId={community.id}
    communityName={community.name}
    onClose={() => setShowDirectMessage(false)}
    initialUser={directMessageUser}
  />
)}

{showSettings && (
  <CommunitySettings communityId={community.id} communityName={community.name} onClose={() => setShowSettings(false)} />
)}
    </div>
  );
};

export default CommunityPage;