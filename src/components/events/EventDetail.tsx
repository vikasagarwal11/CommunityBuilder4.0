import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Link as LinkIcon, ArrowLeft, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import UserAvatar from '../profile/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';

interface EventDetailProps {
  eventId: string;
  communityId: string;
  onBack: () => void;
  onEdit?: (eventId: string) => void;
  onDelete?: () => void;
}

const EventDetail = ({ eventId, communityId, onBack, onEdit, onDelete }: EventDetailProps) => {
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const { user } = useAuth();
  
  // Default placeholder image from Pexels
  const placeholderImage = "https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=400";

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        
        // Fetch the event data from Supabase
        const { data, error } = await supabase
          .from('community_events')
          .select(`
            *,
            creator:users!created_by(
              profiles!id(
                full_name,
                avatar_url,
                username
              )
            ),
            communities(
              name,
              slug
            )
          `)
          .eq('id', eventId)
          .single();

        if (error) throw error;
        
        // Get RSVP count
        const { count } = await supabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'going');
        
        // Check if user has RSVP'd
        if (user) {
          const { data: userRsvp } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (userRsvp) {
            setRsvpStatus(userRsvp.status);
          }
        }
        
        setEvent({
          ...data,
          rsvp_count: count || 0,
          creator_profile: data.creator?.profiles || { full_name: 'Unknown User' },
          community_name: data.communities?.name,
          community_slug: data.communities?.slug
        });
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId, user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  // Check if event is in the past
  const isEventPast = () => {
    if (!event) return false;
    const eventDate = new Date(event.start_time);
    return eventDate < new Date();
  };

  // Handle RSVP
  const handleRSVP = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user || !event) return;
    
    try {
      setRegistering(true);
      setError('');

      // Check if already registered
      const { data: existingRsvp } = await supabase
        .from('event_rsvps')
        .select('id, status')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRsvp) {
        // Update existing RSVP
        const { error: updateError } = await supabase
          .from('event_rsvps')
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRsvp.id);

        if (updateError) throw updateError;
      } else {
        // Check capacity
        if (status === 'going' && event.capacity && event.rsvp_count >= event.capacity) {
          setError('This event is at full capacity');
          return;
        }

        // Create new RSVP
        const { error: registrationError } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: event.id,
            user_id: user.id,
            status,
            created_at: new Date().toISOString()
          });

        if (registrationError) throw registrationError;
      }

      // Update local state
      setRsvpStatus(status);
      
      // Refresh event to update counts
      const { count } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'going');
        
      setEvent({
        ...event,
        rsvp_count: count || 0
      });
    } catch (err) {
      console.error('Error updating RSVP:', err);
      setError('Failed to update RSVP. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-neutral-200 rounded w-1/3 mb-8"></div>
        <div className="h-48 bg-neutral-200 rounded"></div>
        <div className="space-y-2">
          <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
          <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {error || 'Event not found'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-neutral-600 hover:text-neutral-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {event.image_url && (
          <div className="relative">
            <img 
              src={!imageError ? event.image_url : placeholderImage} 
              alt={event.title} 
              className="w-full h-auto object-contain rounded-t-lg max-h-96"
              loading="lazy"
              onError={(e) => {
                console.error('Image load error in EventDetail:', e, { url: event.image_url });
                setImageError(true);
              }}
            />
          </div>
        )}
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <span className={`px-2 py-1 rounded-full text-xs ${
              event.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
              event.status === 'ongoing' ? 'bg-green-100 text-green-700' :
              event.status === 'completed' ? 'bg-neutral-100 text-neutral-700' :
              'bg-red-100 text-red-700'
            }`}>
              {event.status}
            </span>
          </div>
          
          {event.description && (
            <p className="text-neutral-600 mb-6">{event.description}</p>
          )}
          
          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <div className="space-y-4">
              <div className="flex items-center text-neutral-700">
                <Calendar className="h-5 w-5 mr-3 text-neutral-500" />
                <div>
                  <div className="font-medium">{formatDate(event.start_time)}</div>
                  <div className="text-sm">{formatTime(event.start_time)}</div>
                  {event.end_time && (
                    <div className="text-sm text-neutral-500">
                      to {formatDate(event.end_time) === formatDate(event.start_time) ? 
                          formatTime(event.end_time) : 
                          `${formatDate(event.end_time)} ${formatTime(event.end_time)}`}
                    </div>
                  )}
                </div>
              </div>
              
              {event.location && (
                <div className="flex items-center text-neutral-700">
                  <MapPin className="h-5 w-5 mr-3 text-neutral-500" />
                  <div className="font-medium">{event.location}</div>
                </div>
              )}
              
              <div className="flex items-center text-neutral-700">
                <Users className="h-5 w-5 mr-3 text-neutral-500" />
                <div>
                  <div className="font-medium">
                    {event.rsvp_count} {event.rsvp_count === 1 ? 'person' : 'people'} going
                    {event.capacity && ` (${event.capacity - event.rsvp_count} spots left)`}
                  </div>
                  {event.capacity && event.rsvp_count >= event.capacity && (
                    <div className="text-sm text-red-600">Event is full</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Event creator */}
          {event.creator_profile && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <h3 className="text-sm font-medium text-neutral-500 mb-3">EVENT ORGANIZER</h3>
              <div className="flex items-center">
                <UserAvatar 
                  src={event.creator_profile.avatar_url}
                  alt={event.creator_profile.full_name}
                  size="md"
                />
                <div className="ml-3">
                  <Link 
                    to={event.creator_profile.username ? `/user/${event.creator_profile.username}` : '#'}
                    className="font-medium hover:text-primary-600"
                  >
                    {event.creator_profile.full_name}
                  </Link>
                  <p className="text-xs text-neutral-500">Event Creator</p>
                </div>
              </div>
            </div>
          )}
          
          {/* RSVP section */}
          <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
            <h3 className="text-sm font-medium text-neutral-500 mb-3">RSVP TO THIS EVENT</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {isEventPast() ? (
              <div className="p-3 bg-neutral-100 text-neutral-700 rounded-lg text-center">
                This event has already passed
              </div>
            ) : user ? (
              rsvpStatus ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg text-center font-medium ${
                    rsvpStatus === 'going' 
                      ? 'bg-green-100 text-green-700' 
                      : rsvpStatus === 'maybe'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}>
                    You're {rsvpStatus === 'going' ? 'going' : 
                           rsvpStatus === 'maybe' ? 'maybe going' : 'not going'}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleRSVP('going')}
                      disabled={registering || (rsvpStatus === 'going')}
                      className={`p-2 rounded-lg text-center text-sm font-medium ${
                        rsvpStatus === 'going'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-white border border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      Going
                    </button>
                    <button
                      onClick={() => handleRSVP('maybe')}
                      disabled={registering || (rsvpStatus === 'maybe')}
                      className={`p-2 rounded-lg text-center text-sm font-medium ${
                        rsvpStatus === 'maybe'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-white border border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      Maybe
                    </button>
                    <button
                      onClick={() => handleRSVP('not_going')}
                      disabled={registering || (rsvpStatus === 'not_going')}
                      className={`p-2 rounded-lg text-center text-sm font-medium ${
                        rsvpStatus === 'not_going'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-white border border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      Can't Go
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => handleRSVP('going')}
                    disabled={registering || (event.capacity && event.rsvp_count >= event.capacity)}
                    className="w-full py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
                  >
                    {registering ? 'Processing...' : 
                     (event.capacity && event.rsvp_count >= event.capacity) ? 'Event Full' : 'RSVP - Going'}
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRSVP('maybe')}
                      disabled={registering}
                      className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium"
                    >
                      Maybe
                    </button>
                    <button
                      onClick={() => handleRSVP('not_going')}
                      disabled={registering}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      Can't Go
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block w-full py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-center font-medium"
                  onClick={() => {
                    sessionStorage.setItem('redirectUrl', `/community/${communityId}/events?event=${eventId}`);
                  }}
                >
                  Sign in to RSVP
                </Link>
              </div>
            )}
          </div>
          
          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-neutral-500 mb-3">TAGS</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag: string, index: number) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Share event */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-500 mb-3">SHARE EVENT</h3>
            <div className="flex">
              <input
                type="text"
                value={`${window.location.origin}/event/${event.id}`}
                readOnly
                className="flex-grow px-3 py-2 border border-neutral-300 rounded-l-lg text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/event/${event.id}`);
                  // Could add a toast notification here
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-r-lg hover:bg-primary-600"
              >
                Copy
              </button>
            </div>
          </div>
          
          {/* Admin actions */}
          {onEdit && onDelete && (
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => onEdit(event.id)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
              >
                Edit Event
              </button>
              <button
                onClick={onDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete Event
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;