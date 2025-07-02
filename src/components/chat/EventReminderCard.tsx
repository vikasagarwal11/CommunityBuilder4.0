import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Bell, BellOff, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface EventReminderCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time?: string;
    location?: string;
    is_online: boolean;
    meeting_url?: string;
    community_id: string;
    community_name: string;
    community_slug?: string;
    rsvp_status?: 'going' | 'maybe' | 'not_going';
  };
  onDismiss?: () => void;
}

const EventReminderCard: React.FC<EventReminderCardProps> = ({
  event,
  onDismiss
}) => {
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  // Calculate time until event
  const getTimeUntilEvent = () => {
    const now = new Date();
    const eventTime = new Date(event.start_time);
    const diffTime = eventTime.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} from now`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} from now`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} from now`;
    } else {
      return 'Starting now!';
    }
  };

  // Get RSVP status color
  const getRsvpStatusColor = () => {
    switch (event.rsvp_status) {
      case 'going':
        return 'bg-green-100 text-green-700';
      case 'maybe':
        return 'bg-yellow-100 text-yellow-700';
      case 'not_going':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  // Get RSVP status text
  const getRsvpStatusText = () => {
    switch (event.rsvp_status) {
      case 'going':
        return 'You\'re going';
      case 'maybe':
        return 'You might go';
      case 'not_going':
        return 'You\'re not going';
      default:
        return 'Not RSVP\'d';
    }
  };

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-md border border-neutral-200 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-3 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            <span className="font-medium">Upcoming Event</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setRemindersEnabled(!remindersEnabled)}
              className="p-1 text-white/80 hover:text-white rounded-full"
              title={remindersEnabled ? "Disable reminders" : "Enable reminders"}
            >
              {remindersEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 text-white/80 hover:text-white rounded-full"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold mb-2">{event.title}</h3>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm text-neutral-600">
            <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{formatDate(event.start_time)}</span>
          </div>
          <div className="flex items-center text-sm text-neutral-600">
            <Clock className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{formatTime(event.start_time)}</span>
            {event.end_time && <span> - {formatTime(event.end_time)}</span>}
          </div>
          {event.location && !event.is_online && (
            <div className="flex items-center text-sm text-neutral-600">
              <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
              <span>{event.location}</span>
            </div>
          )}
          {event.is_online && event.meeting_url && (
            <div className="flex items-center text-sm text-neutral-600">
              <ExternalLink className="h-4 w-4 mr-2 text-neutral-400" />
              <a 
                href={event.meeting_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600"
              >
                Join online meeting
              </a>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-primary-600">
            {getTimeUntilEvent()}
          </span>
          {event.rsvp_status && (
            <span className={`px-2 py-1 rounded-full text-xs ${getRsvpStatusColor()}`}>
              {getRsvpStatusText()}
            </span>
          )}
        </div>
        
        <Link
          to={event.community_slug 
            ? `/c/${event.community_slug}/events?event=${event.id}` 
            : `/community/${event.community_id}/events?event=${event.id}`}
          className="block w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-center text-sm font-medium"
        >
          View Details
        </Link>
      </div>
    </motion.div>
  );
};

export default EventReminderCard;