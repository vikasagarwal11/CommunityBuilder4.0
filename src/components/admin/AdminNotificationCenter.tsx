import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Bell, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Filter,
  Clock,
  MapPin,
  Sparkles,
  Lightbulb,
  MessageSquare,
  UserPlus,
  Flag,
  Zap,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminNotification {
  id: string;
  community_id: string;
  message_id?: string;
  intent_type: string;
  intent_details: {
    type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    summary: string;
    category: 'event_suggestion' | 'join_request' | 'content_moderation' | 'member_issue' | 'system_alert' | 'ai_insight';
    details: any;
    suggestedActions?: string[];
  };
  is_read: boolean;
  created_by: string;
  created_at: string;
  read_at: string | null;
  user_profile?: {
    full_name: string;
    avatar_url: string;
  };
  community?: {
    name: string;
    image_url: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

const AdminNotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRead, setShowRead] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byCategory: {},
    byPriority: {}
  });
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [showRead, selectedCategory, selectedPriority]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all communities where user is admin
      const { data: adminCommunities } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .in('role', ['admin', 'co-admin']);

      if (!adminCommunities || adminCommunities.length === 0) {
        setNotifications([]);
        setStats({ total: 0, unread: 0, byCategory: {}, byPriority: {} });
        return;
      }

      const communityIds = adminCommunities.map(c => c.community_id);

      // Fetch notifications for all admin communities
      let query = supabase
        .from('admin_notifications')
        .select(`
          *,
          user_profile:profiles!admin_notifications_created_by_fkey(
            full_name,
            avatar_url
          ),
          community:communities(
            name,
            image_url
          )
        `)
        .in('community_id', communityIds)
        .order('created_at', { ascending: false });

      if (!showRead) {
        query = query.eq('is_read', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Filter by category and priority
      let filteredNotifications = data || [];
      
      if (selectedCategory !== 'all') {
        filteredNotifications = filteredNotifications.filter(
          n => n.intent_details?.category === selectedCategory
        );
      }

      if (selectedPriority !== 'all') {
        filteredNotifications = filteredNotifications.filter(
          n => n.intent_details?.priority === selectedPriority
        );
      }

      setNotifications(filteredNotifications);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (allNotifications: AdminNotification[]) => {
    const stats: NotificationStats = {
      total: allNotifications.length,
      unread: allNotifications.filter(n => !n.is_read).length,
      byCategory: {},
      byPriority: {}
    };

    allNotifications.forEach(notification => {
      const category = notification.intent_details?.category || 'unknown';
      const priority = notification.intent_details?.priority || 'medium';
      
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    });

    setStats(stats);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleAction = async (notification: AdminNotification, action: string) => {
    try {
      setProcessingAction(notification.id);
      
      switch (action) {
        case 'approve_event':
          await handleApproveEvent(notification);
          break;
        case 'approve_join':
          await handleApproveJoin(notification);
          break;
        case 'moderate_content':
          await handleModerateContent(notification);
          break;
        case 'resolve_issue':
          await handleResolveIssue(notification);
          break;
        default:
          console.log('Unknown action:', action);
      }
      
      await markAsRead(notification.id);
    } catch (error) {
      console.error('Error handling action:', error);
      setError('Failed to process action');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleApproveEvent = async (notification: AdminNotification) => {
    // Implementation for approving events
    console.log('Approving event from notification:', notification.id);
  };

  const handleApproveJoin = async (notification: AdminNotification) => {
    // Implementation for approving join requests
    console.log('Approving join request from notification:', notification.id);
  };

  const handleModerateContent = async (notification: AdminNotification) => {
    // Implementation for content moderation
    console.log('Moderating content from notification:', notification.id);
  };

  const handleResolveIssue = async (notification: AdminNotification) => {
    // Implementation for resolving member issues
    console.log('Resolving issue from notification:', notification.id);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'event_suggestion': return <Calendar className="h-4 w-4" />;
      case 'join_request': return <UserPlus className="h-4 w-4" />;
      case 'content_moderation': return <Flag className="h-4 w-4" />;
      case 'member_issue': return <AlertTriangle className="h-4 w-4" />;
      case 'system_alert': return <Zap className="h-4 w-4" />;
      case 'ai_insight': return <Lightbulb className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'event_suggestion': return 'text-blue-600 bg-blue-100';
      case 'join_request': return 'text-green-600 bg-green-100';
      case 'content_moderation': return 'text-red-600 bg-red-100';
      case 'member_issue': return 'text-orange-600 bg-orange-100';
      case 'system_alert': return 'text-purple-600 bg-purple-100';
      case 'ai_insight': return 'text-indigo-600 bg-indigo-100';
      default: return 'text-neutral-600 bg-neutral-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-neutral-200 bg-white';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const categories = [
    { key: 'all', label: 'All', icon: <Bell className="h-4 w-4" /> },
    { key: 'event_suggestion', label: 'Events', icon: <Calendar className="h-4 w-4" /> },
    { key: 'join_request', label: 'Join Requests', icon: <UserPlus className="h-4 w-4" /> },
    { key: 'content_moderation', label: 'Moderation', icon: <Flag className="h-4 w-4" /> },
    { key: 'member_issue', label: 'Issues', icon: <AlertTriangle className="h-4 w-4" /> },
    { key: 'system_alert', label: 'System', icon: <Zap className="h-4 w-4" /> },
    { key: 'ai_insight', label: 'AI Insights', icon: <Lightbulb className="h-4 w-4" /> }
  ];

  const priorities = [
    { key: 'all', label: 'All Priorities' },
    { key: 'urgent', label: 'Urgent', color: 'text-red-600' },
    { key: 'high', label: 'High', color: 'text-orange-600' },
    { key: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { key: 'low', label: 'Low', color: 'text-green-600' }
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-neutral-200 rounded"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-neutral-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center">
          <Bell className="h-6 w-6 mr-2 text-primary-500" />
          Admin Notification Center
          {stats.unread > 0 && (
            <span className="ml-3 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
              {stats.unread} new
            </span>
          )}
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRead(!showRead)}
            className="flex items-center text-sm text-neutral-600 hover:text-neutral-800"
          >
            {showRead ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showRead ? 'Hide Read' : 'Show All'}
          </button>
          <button
            onClick={fetchNotifications}
            className="p-2 bg-neutral-100 rounded-lg text-neutral-600 hover:bg-neutral-200"
            title="Refresh notifications"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-neutral-500">Total Notifications</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.unread}</p>
              <p className="text-sm text-neutral-500">Unread</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.byCategory['event_suggestion'] || 0}</p>
              <p className="text-sm text-neutral-500">Event Suggestions</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Flag className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.byCategory['content_moderation'] || 0}</p>
              <p className="text-sm text-neutral-500">Moderation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {categories.map(category => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {priorities.map(priority => (
                <option key={priority.key} value={priority.key}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <Bell className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-lg font-medium mb-2">No notifications</h3>
          <p className="text-neutral-600">
            {selectedCategory !== 'all' || selectedPriority !== 'all'
              ? "No notifications match your current filters."
              : "You're all caught up! No new notifications."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-lg border ${getPriorityColor(notification.intent_details?.priority || 'medium')} ${
                  notification.is_read ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(notification.intent_details?.category || 'unknown')}`}>
                      {getCategoryIcon(notification.intent_details?.category || 'unknown')}
                    </div>
                    <div>
                      <h3 className="font-medium">{notification.intent_details?.summary}</h3>
                      <div className="flex items-center space-x-2 text-sm text-neutral-500">
                        {notification.community && (
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {notification.community.name}
                          </span>
                        )}
                        <span>{formatTimeAgo(notification.created_at)}</span>
                        {!notification.is_read && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAction(notification, 'dismiss')}
                      className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-neutral-700 mb-2">
                    {notification.intent_details?.details?.originalMessage || 'No details available'}
                  </p>
                  
                  {notification.intent_details?.details?.aiGeneratedDetails && (
                    <div className="bg-green-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center mb-2">
                        <Sparkles className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm font-medium text-green-800">AI Enhanced Details</span>
                      </div>
                      <div className="text-sm text-green-700">
                        <p><strong>Enhanced Title:</strong> {notification.intent_details.details.aiGeneratedDetails.title}</p>
                        <p><strong>Description:</strong> {notification.intent_details.details.aiGeneratedDetails.description}</p>
                      </div>
                    </div>
                  )}

                  {notification.intent_details?.suggestedActions && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-neutral-700 mb-2">Suggested Actions:</p>
                      <ul className="text-sm text-neutral-600 space-y-1">
                        {notification.intent_details.suggestedActions.map((action, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-neutral-400 rounded-full mr-2"></span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {notification.intent_details?.category === 'event_suggestion' && (
                      <button
                        onClick={() => handleAction(notification, 'approve_event')}
                        disabled={processingAction === notification.id}
                        className="flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        {processingAction === notification.id ? (
                          <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Create Event
                      </button>
                    )}
                    {notification.intent_details?.category === 'join_request' && (
                      <button
                        onClick={() => handleAction(notification, 'approve_join')}
                        disabled={processingAction === notification.id}
                        className="flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Approve Join
                      </button>
                    )}
                    {notification.intent_details?.category === 'content_moderation' && (
                      <button
                        onClick={() => handleAction(notification, 'moderate_content')}
                        disabled={processingAction === notification.id}
                        className="flex items-center px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
                      >
                        <Flag className="h-4 w-4 mr-1" />
                        Review Content
                      </button>
                    )}
                    {notification.intent_details?.category === 'member_issue' && (
                      <button
                        onClick={() => handleAction(notification, 'resolve_issue')}
                        disabled={processingAction === notification.id}
                        className="flex items-center px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Resolve Issue
                      </button>
                    )}
                  </div>
                  
                  {notification.user_profile && (
                    <div className="text-xs text-neutral-500">
                      From {notification.user_profile.full_name}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationCenter; 