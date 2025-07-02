import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Users, Bell, Check, X, Sparkles, Eye, EyeOff, AlertTriangle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminEventNotificationsProps {
  communityId: string;
  onEventCreated?: (eventId: string) => void;
}

interface Notification {
  id: string;
  community_id: string;
  message_id: string;
  intent_type: string;
  intent_details: {
    type: string;
    priority: string;
    summary: string;
    details: {
      originalMessage: string;
      extractedDetails: any;
      aiGeneratedDetails?: any;
      suggestedActions: string[];
    };
  };
  is_read: boolean;
  created_by: string;
  created_at: string;
  read_at: string | null;
  user_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

const AdminEventNotifications: React.FC<AdminEventNotificationsProps> = ({
  communityId,
  onEventCreated
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRead, setShowRead] = useState(false);
  const [processingEvent, setProcessingEvent] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [communityId, showRead]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('admin_notifications')
        .select(`
          *,
          user_profile:profiles!admin_notifications_created_by_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .eq('intent_type', 'event')
        .order('created_at', { ascending: false });

      if (!showRead) {
        query = query.eq('is_read', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
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

  const createEventFromNotification = async (notification: Notification) => {
    try {
      setProcessingEvent(notification.id);
      
      const details = notification.intent_details.details.extractedDetails;
      const aiDetails = notification.intent_details.details.aiGeneratedDetails;
      
      // Combine date and time
      const eventDate = new Date(`${details.date}T${details.time}`);
      
      // Create event with enhanced details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          community_id: communityId,
          title: aiDetails?.title || details.title,
          description: aiDetails?.description || details.description,
          date: eventDate.toISOString(),
          location: details.location,
          capacity: details.suggestedCapacity || aiDetails?.recommendedCapacity,
          duration: details.suggestedDuration || aiDetails?.recommendedDuration,
          tags: details.tags || aiDetails?.suggestedTags,
          is_online: details.isOnline,
          meeting_url: details.meetingUrl,
          created_by: user?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (eventError) throw eventError;
      
      // Mark notification as read
      await markAsRead(notification.id);
      
      // Create a community post announcing the event
      await supabase
        .from('community_posts')
        .insert({
          community_id: communityId,
          user_id: user?.id,
          content: `📅 New event created: "${event.title}" on ${new Date(eventDate).toLocaleDateString()} at ${new Date(eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Check the Events tab for details!`,
          created_at: new Date().toISOString()
        });
      
      // Notify parent component
      if (onEventCreated) {
        onEventCreated(event.id);
      }
      
    } catch (error) {
      console.error('Error creating event from notification:', error);
      setError('Failed to create event');
    } finally {
      setProcessingEvent(null);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Error dismissing notification:', error);
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-neutral-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <Bell className="h-5 w-5 mr-2 text-primary-500" />
          Event Suggestions
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowRead(!showRead)}
          className="flex items-center text-sm text-neutral-600 hover:text-neutral-800"
        >
          {showRead ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {showRead ? 'Hide Read' : 'Show All'}
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <Bell className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
          <p>No event suggestions yet</p>
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
                className={`p-4 rounded-lg border ${
                  notification.is_read 
                    ? 'bg-neutral-50 border-neutral-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-sm font-medium">
                        {notification.intent_details.summary}
                      </span>
                    </div>
                    {!notification.is_read && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">
                    {formatTimeAgo(notification.created_at)}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-neutral-700 mb-2">
                    <strong>Original message:</strong> "{notification.intent_details.details.originalMessage}"
                  </p>
                  
                  {notification.intent_details.details.aiGeneratedDetails && (
                    <div className="bg-green-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center mb-2">
                        <Lightbulb className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm font-medium text-green-800">AI Enhanced Details</span>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <p><strong>Enhanced Title:</strong> {notification.intent_details.details.aiGeneratedDetails.title}</p>
                        <p><strong>Description:</strong> {notification.intent_details.details.aiGeneratedDetails.description}</p>
                        {notification.intent_details.details.aiGeneratedDetails.suggestedTags?.length > 0 && (
                          <p><strong>Suggested Tags:</strong> {notification.intent_details.details.aiGeneratedDetails.suggestedTags.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-neutral-500 mr-2" />
                      <span>{notification.intent_details.details.extractedDetails.date}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-neutral-500 mr-2" />
                      <span>{notification.intent_details.details.extractedDetails.time}</span>
                    </div>
                    {notification.intent_details.details.extractedDetails.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-neutral-500 mr-2" />
                        <span>{notification.intent_details.details.extractedDetails.location}</span>
                      </div>
                    )}
                    {notification.intent_details.details.extractedDetails.suggestedCapacity && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-neutral-500 mr-2" />
                        <span>Capacity: {notification.intent_details.details.extractedDetails.suggestedCapacity}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => createEventFromNotification(notification)}
                      disabled={processingEvent === notification.id}
                      className="flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {processingEvent === notification.id ? (
                        <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Create Event
                    </button>
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="flex items-center px-3 py-1 bg-neutral-200 text-neutral-700 text-sm rounded-lg hover:bg-neutral-300"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Dismiss
                    </button>
                  </div>
                  
                  {notification.user_profile && (
                    <div className="text-xs text-neutral-500">
                      Suggested by {notification.user_profile.full_name}
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

export default AdminEventNotifications; 