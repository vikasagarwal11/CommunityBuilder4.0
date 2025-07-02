import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventService, supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin, Users, ArrowLeft, Heart, MessageSquare, Tag, User, Crown, Shield } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const EventDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [communityInfo, setCommunityInfo] = useState<{name: string, slug?: string, adminName?: string, adminRole?: string} | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const eventData = await eventService.getEventBySlug(slug);
        
        // Format the event data
        const formattedEvent = {
          ...eventData,
          creator_profile: eventData.creator_profile?.profiles || { full_name: 'Unknown User' },
          rsvp_count: eventData.rsvp_count?.[0]?.count || 0
        };
        
        setEvent(formattedEvent);
        
        // Fetch community info
        if (eventData.community_id) {
          const { data: communityData } = await supabase
            .from('communities')
            .select('name, slug, created_by')
            .eq('id', eventData.community_id)
            .single();
            
          if (communityData) {
            // Get admin profile
            const { data: adminData } = await supabase
              .from('community_members')
              .select(`
                user_id,
                role,
                profiles!inner(
                  full_name,
                  username,
                  avatar_url
                )
              `)
              .eq('community_id', eventData.community_id)
              .eq('role', 'admin')
              .maybeSingle();
              
            setCommunityInfo({
              name: communityData.name,
              slug: communityData.slug,
              adminName: adminData?.profiles?.full_name,
              adminRole: adminData?.role
            });
          }
        }
        
        // Check if user has RSVP'd
        if (user) {
          const { data: rsvpData } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', eventData.id)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (rsvpData) {
            setRsvpStatus(rsvpData.status);
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Event not found or an error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [slug, user]);

  // Check if event is in the past
  const isEventPast = () => {
    if (!event) return false;
    const eventDate = new Date(event.start_time);
    return eventDate < new Date();
  };

  const handleRSVP = async (status = 'going') => {
    if (!user || !event) {
      // Store the event slug in session storage for redirect after login
      sessionStorage.setItem('redirectUrl', `/event/${slug}`);
      window.location.href = '/login';
      return;
    }

    // Don't allow RSVPs for past events
    if (isEventPast()) {
      setError('This event has already passed');
      return;
    }

    try {
      setRegistering(true);
      setError('');

      // Check if already registered - use maybeSingle() instead of single()
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
      const { data: updatedEvent } = await supabase
        .from('community_events')
        .select(`
          *,
          creator_profile:users!created_by(
            profiles(
              full_name,
              avatar_url,
              username
            )
          ),
          rsvp_count:event_rsvps(count)
        `)
        .eq('id', event.id)
        .single();
        
      if (updatedEvent) {
        setEvent({
          ...updatedEvent,
          creator_profile: updatedEvent.creator_profile?.profiles || { full_name: 'Unknown User' },
          rsvp_count: updatedEvent.rsvp_count?.[0]?.count || 0
        });
      }
    } catch (err) {
      console.error('Error updating RSVP:', err);
      setError('Failed to update RSVP. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-4">Event Not Found</h1>
            <p className="text-neutral-600 mb-6">
              {error || "The event you're looking for doesn't exist or has been removed."}
            </p>
            <Link to="/events" className="btn-primary">
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container max-w-4xl">
        <div className="mb-6">
          <Link to="/events" className="flex items-center text-primary-500 hover:text-primary-600">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Events
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {event.image_url && (
            <div className="h-64 overflow-hidden">
              <img 
                src={event.image_url} 
                alt={event.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{event.title}</h1>
                
                {/* Community and Admin Info - Prominent display */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {communityInfo && (
                    <Link 
                      to={communityInfo.slug ? `/c/${communityInfo.slug}` : `/community/${event.community_id}`}
                      className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm hover:bg-primary-200"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {communityInfo.name}
                    </Link>
                  )}
                  
                  {event.creator_profile && (
                    <div className="inline-flex items-center px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm">
                      <div className="h-4 w-4 rounded-full overflow-hidden bg-neutral-200 mr-1">
                        {event.creator_profile.avatar_url ? (
                          <img 
                            src={event.creator_profile.avatar_url} 
                            alt={event.creator_profile.full_name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-2 w-2 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <Link 
                        to={event.creator_profile.username ? `/user/${event.creator_profile.username}` : '#'}
                        className="hover:text-primary-600"
                      >
                        {communityInfo?.adminRole === 'admin' ? (
                          <Crown className="h-3 w-3 inline mr-1 text-yellow-500" />
                        ) : communityInfo?.adminRole === 'co-admin' ? (
                          <Shield className="h-3 w-3 inline mr-1 text-blue-500" />
                        ) : null}
                        {event.creator_profile.full_name}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Share URL */}
              <div className="flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    value={window.location.href}
                    readOnly
                    className="pr-20 py-2 pl-3 border border-neutral-300 rounded-lg text-sm w-full sm:w-auto"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      // Could add a toast notification here
                    }}
                    className="absolute right-1 top-1 px-3 py-1 bg-primary-500 text-white text-xs rounded hover:bg-primary-600"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            {event.description && (
              <p className="text-neutral-700 mb-8">{event.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
                    <span>{event.location}</span>
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
              
              <div className="bg-neutral-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">RSVP to this Event</h3>
                
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
                        sessionStorage.setItem('redirectUrl', `/event/${slug}`);
                      }}
                    >
                      Sign in to RSVP
                    </Link>
                    
                    <Link
                      to="/register"
                      className="block w-full py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-center"
                      onClick={() => {
                        sessionStorage.setItem('redirectUrl', `/event/${slug}`);
                      }}
                    >
                      Create Account
                    </Link>
                  </div>
                )}
                
                {/* Community link */}
                {communityInfo && (
                  <div className="mt-6 pt-4 border-t border-neutral-200">
                    <Link 
                      to={communityInfo.slug ? `/c/${communityInfo.slug}` : `/community/${event.community_id}`}
                      className="text-primary-500 hover:text-primary-600 font-medium flex items-center"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View {communityInfo.name} Community
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Event engagement stats */}
            <div className="flex items-center justify-center space-x-8 py-6 border-t border-b border-neutral-200 mb-8">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-neutral-500" />
                <span className="text-lg font-medium">{event.rsvp_count}</span>
                <span className="text-neutral-500 ml-1">Attending</span>
              </div>
              <div className="flex items-center">
                <Heart className="h-5 w-5 mr-2 text-neutral-500" />
                <span className="text-lg font-medium">0</span>
                <span className="text-neutral-500 ml-1">Likes</span>
              </div>
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-neutral-500" />
                <span className="text-lg font-medium">0</span>
                <span className="text-neutral-500 ml-1">Comments</span>
              </div>
            </div>
            
            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string, index: number) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Comments section placeholder */}
            <div className="bg-neutral-50 rounded-lg p-6 text-center">
              <MessageSquare className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Event Discussion</h3>
              <p className="text-neutral-600 mb-4">
                Join the conversation about this event.
              </p>
              {user ? (
                <button className="btn-primary">
                  Start Discussion
                </button>
              ) : (
                <Link 
                  to="/login"
                  className="btn-primary"
                  onClick={() => {
                    sessionStorage.setItem('redirectUrl', `/event/${slug}`);
                  }}
                >
                  Sign in to Comment
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;