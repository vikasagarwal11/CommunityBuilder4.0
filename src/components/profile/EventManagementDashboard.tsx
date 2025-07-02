import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Users, Clock, MapPin, ArrowRight, Filter, Search, X, Wand2, AlertTriangle, Crown, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import EventForm from '../events/EventForm';
import AdminEventScheduler from '../admin/AdminEventScheduler';

interface EventManagementDashboardProps {
  userId: string;
}

const EventManagementDashboard = ({ userId }: EventManagementDashboardProps) => {
  const { user } = useAuth();
  const [ownedEvents, setOwnedEvents] = useState<any[]>([]);
  const [participatingEvents, setParticipatingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'past' | 'deleted'>('upcoming');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userCommunities, setUserCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [showEventScheduler, setShowEventScheduler] = useState(false);
  const [activeTab, setActiveTab] = useState<'owned' | 'participating' | 'past' | 'deleted'>('owned');

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
            is_active,
            deleted_at
          )
        `)
        .eq('user_id', user.id)
        .in('role', ['admin', 'co-admin']);
        
      if (error) throw error;
      
      // Filter out inactive or deleted communities
      const activeCommunities = data
        .filter(item => item.communities.is_active !== false && !item.communities.deleted_at)
        .map(item => ({
          id: item.communities.id,
          name: item.communities.name,
          role: item.role
        }));
      
      setUserCommunities(activeCommunities);
      
      // Set the first community as selected by default if available
      if (activeCommunities.length > 0 && !selectedCommunity) {
        setSelectedCommunity(activeCommunities[0].id);
      }
    } catch (error) {
      console.error('Error fetching user communities:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');

      const now = new Date().toISOString();

      // Fetch events created by this user
      const { data: ownedEventsData, error: ownedEventsError } = await supabase
        .from('community_events')
        .select(`
          id,
          title,
          description,
          location,
          start_time,
          end_time,
          image_url,
          capacity,
          is_online,
          status,
          community_id,
          created_by,
          deleted_at,
          communities (
            name
          ),
          creator:users!created_by(
            profiles!id(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('created_by', userId)
        .is('deleted_at', null)
        .gte('start_time', now)
        .order('start_time', { ascending: false });

      if (ownedEventsError) throw ownedEventsError;
      
      // Fetch deleted events created by this user
      const { data: deletedEventsData, error: deletedEventsError } = await supabase
        .from('community_events')
        .select(`
          id,
          title,
          description,
          location,
          start_time,
          end_time,
          image_url,
          capacity,
          is_online,
          status,
          community_id,
          created_by,
          deleted_at,
          communities (
            name
          ),
          creator:users!created_by(
            profiles!id(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('created_by', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (deletedEventsError) throw deletedEventsError;
      
      // Fetch past events created by this user
      const { data: pastEventsData, error: pastEventsError } = await supabase
        .from('community_events')
        .select(`
          id,
          title,
          description,
          location,
          start_time,
          end_time,
          image_url,
          capacity,
          is_online,
          status,
          community_id,
          created_by,
          deleted_at,
          communities (
            name
          ),
          creator:users!created_by(
            profiles!id(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('created_by', userId)
        .is('deleted_at', null)
        .lt('start_time', now)
        .order('start_time', { ascending: false });

      if (pastEventsError) throw pastEventsError;
      
      // Get RSVP counts for each event
      const ownedEventsWithCounts = await Promise.all(
        ownedEventsData.map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'going');
            
          return {
            ...event,
            rsvp_count: count || 0
          };
        })
      );

      const deletedEventsWithCounts = await Promise.all(
        deletedEventsData.map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'going');
            
          return {
            ...event,
            rsvp_count: count || 0
          };
        })
      );

      const pastEventsWithCounts = await Promise.all(
        pastEventsData.map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'going');
            
          return {
            ...event,
            rsvp_count: count || 0
          };
        })
      );

      setOwnedEvents(ownedEventsWithCounts);
      setDeletedEvents(deletedEventsWithCounts);
      setPastEvents(pastEventsWithCounts);

      // Fetch events the user is participating in but didn't create
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('event_rsvps')
        .select(`
          event_id,
          status,
          community_events!inner(
            id,
            title,
            description,
            location,
            start_time,
            end_time,
            image_url,
            capacity,
            is_online,
            status,
            community_id,
            created_by,
            communities(
              name
            ),
            creator:users!created_by(
              profiles!id(
                full_name,
                avatar_url
              )
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'going')
        .neq('community_events.created_by', userId)
        .gte('community_events.start_time', now);

      if (rsvpError) throw rsvpError;

      // Transform the data to match the format of ownedEvents
      const participatingEventsData = rsvpData.map(rsvp => ({
        ...rsvp.community_events,
        rsvp_status: rsvp.status
      }));

      // Get RSVP counts for each event
      const participatingEventsWithCounts = await Promise.all(
        participatingEventsData.map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'going');
            
          return {
            ...event,
            rsvp_count: count || 0
          };
        })
      );

      setParticipatingEvents(participatingEventsWithCounts);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchRSVPs = async (eventId: string) => {
    try {
      setLoadingRsvps(true);
      
      const { data, error } = await supabase
        .from('event_rsvps')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles!inner(
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to include profile information
      const transformedRsvps = data.map(rsvp => ({
        ...rsvp,
        user_profile: rsvp.profiles
      }));
      
      setRsvps(transformedRsvps);
    } catch (err) {
      console.error('Error fetching RSVPs:', err);
      setError('Error fetching RSVPs: ' + (err as Error).message);
    } finally {
      setLoadingRsvps(false);
    }
  };

  const handleEventCreated = (eventId: string) => {
    setShowCreateForm(false);
    setShowEventScheduler(false);
    fetchEvents();
  };

  useEffect(() => {
    fetchEvents();
    fetchUserCommunities();
  }, [userId]);

  useEffect(() => {
    if (selectedEvent) {
      fetchRSVPs(selectedEvent);
    } else {
      setRsvps([]);
    }
  }, [selectedEvent]);

  const getEventsForTab = () => {
    switch (activeTab) {
      case 'owned':
        return ownedEvents;
      case 'participating':
        return participatingEvents;
      case 'past':
        return pastEvents;
      case 'deleted':
        return deletedEvents;
      default:
        return ownedEvents;
    }
  };

  const getFilteredEvents = () => {
    // Get events based on active tab
    const eventsToFilter = getEventsForTab();
    
    let filtered = eventsToFilter;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-700';
      case 'ongoing':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-neutral-100 text-neutral-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const filteredEvents = getFilteredEvents();

  if (showCreateForm) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create New Event</h2>
          <button
            onClick={() => setShowCreateForm(false)}
            className="text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>
        
        {userCommunities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">You need admin access to create events</h3>
            <p className="text-neutral-600 mb-6">
              You must be an admin or co-admin of a community to create events.
            </p>
            <Link to="/communities" className="btn-primary">
              Explore Communities
            </Link>
          </div>
        ) : (
          <>
            {userCommunities.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select Community
                </label>
                <select
                  value={selectedCommunity || ''}
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  className="input w-full"
                >
                  <option value="" disabled>Select a community</option>
                  {userCommunities.map(community => (
                    <option key={community.id} value={community.id}>
                      {community.name} ({community.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {selectedCommunity && (
              <EventForm
                communityId={selectedCommunity}
                onSuccess={handleEventCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            )}
          </>
        )}
      </div>
    );
  }

  if (showEventScheduler) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Quick Create Event</h2>
          <button
            onClick={() => setShowEventScheduler(false)}
            className="text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>
        
        {userCommunities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">You need admin access to create events</h3>
            <p className="text-neutral-600 mb-6">
              You must be an admin or co-admin of a community to create events.
            </p>
            <Link to="/communities" className="btn-primary">
              Explore Communities
            </Link>
          </div>
        ) : (
          <>
            {userCommunities.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select Community
                </label>
                <select
                  value={selectedCommunity || ''}
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  className="input w-full"
                >
                  <option value="" disabled>Select a community</option>
                  {userCommunities.map(community => (
                    <option key={community.id} value={community.id}>
                      {community.name} ({community.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {selectedCommunity && (
              <AdminEventScheduler
                communityId={selectedCommunity}
                onClose={() => setShowEventScheduler(false)}
                onEventCreated={handleEventCreated}
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary-500" />
          Event Management
        </h2>
        <div className="flex space-x-3">
          {userCommunities.length > 0 && (
            <button
              onClick={() => setShowEventScheduler(true)}
              className="btn-primary flex items-center"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Quick Create
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-outline flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'owned'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('owned')}
        >
          My Created Events
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'participating'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('participating')}
        >
          Events I'm Attending
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'past'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('past')}
        >
          Past Events
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'deleted'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('deleted')}
        >
          Deleted Events
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="relative flex-grow max-w-md">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
          <Search className="absolute left-3 top-3.5 text-neutral-400" size={18} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="animate-pulse space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4">
              <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No events found</h3>
          <p className="text-neutral-600 mb-6">
            {searchTerm 
              ? "No events match your search. Try different keywords."
              : activeTab === 'owned' 
                ? "You haven't created any events yet."
                : activeTab === 'participating'
                  ? "You're not attending any events yet."
                  : activeTab === 'past'
                     ? "You don't have any past events."
                     : "You don't have any deleted events."}
          </p>
          {userCommunities.length > 0 ? (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => setShowEventScheduler(true)}
                className="btn-primary flex items-center justify-center"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Quick Create Event
              </button>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="btn-outline flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event Manually
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-700 font-medium">Admin Access Required</p>
                  <p className="text-sm text-yellow-600 mt-1">
                    You need to be a community admin or co-admin to create events.
                  </p>
                  <Link to="/communities" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                    Explore Communities
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div 
              key={event.id} 
              className={`bg-white rounded-lg shadow-sm p-4 ${
                selectedEvent === event.id ? 'ring-2 ring-primary-500' : ''
              } ${activeTab === 'deleted' ? 'border-l-4 border-red-500' : ''}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-500">
                          {event.communities?.name}
                        </span>
                        {event.creator?.profiles && (
                          <p className="text-xs text-neutral-500 flex items-center">
                            <span className="mx-1">•</span>
                            {event.creator.profiles.role === 'admin' ? (
                              <Crown className="h-3 w-3 inline mr-1 text-yellow-500" />
                            ) : event.creator.profiles.role === 'co-admin' ? (
                              <Shield className="h-3 w-3 inline mr-1 text-blue-500" />
                            ) : null}
                            Created by {event.creator.profiles.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-neutral-600">
                      <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                      <span>{formatDate(event.start_time)}</span>
                    </div>
                    <div className="flex items-center text-sm text-neutral-600">
                      <Clock className="h-4 w-4 mr-2 text-neutral-400" />
                      <span>{formatTime(event.start_time)}</span>
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-neutral-600">
                        <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-neutral-600">
                      <Users className="h-4 w-4 mr-2 text-neutral-400" />
                      <span>{event.rsvp_count} {event.rsvp_count === 1 ? 'attendee' : 'attendees'}</span>
                      {event.capacity && ` / ${event.capacity} capacity`}
                    </div>
                    {activeTab === 'deleted' && event.deleted_at && (
                      <div className="flex items-center text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span>Deleted on {new Date(event.deleted_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                    className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 text-sm"
                  >
                    {selectedEvent === event.id ? 'Hide RSVPs' : 'View RSVPs'}
                  </button>
                  <Link
                    to={`/community/${event.community_id}/events?event=${event.id}`}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm flex items-center justify-center"
                  >
                    View Details <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
              
              {/* RSVPs Section */}
              {selectedEvent === event.id && (
                <div className="mt-6 pt-4 border-t border-neutral-200">
                  <h4 className="font-medium mb-4">Attendees ({rsvps.filter(r => r.status === 'going').length})</h4>
                  
                  {loadingRsvps ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-10 bg-neutral-100 rounded"></div>
                      ))}
                    </div>
                  ) : rsvps.length === 0 ? (
                    <p className="text-neutral-500 text-center py-4">No RSVPs yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {rsvps.map(rsvp => (
                        <div 
                          key={rsvp.id}
                          className={`p-3 rounded-lg ${
                            rsvp.status === 'going' 
                              ? 'bg-green-50' 
                              : rsvp.status === 'maybe'
                                ? 'bg-yellow-50'
                                : 'bg-red-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-neutral-200 overflow-hidden mr-3">
                                {rsvp.user_profile.avatar_url ? (
                                  <img 
                                    src={rsvp.user_profile.avatar_url} 
                                    alt={rsvp.user_profile.full_name} 
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                    {rsvp.user_profile.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{rsvp.user_profile.full_name}</p>
                                <p className="text-xs text-neutral-500">{rsvp.user_profile.email}</p>
                              </div>
                            </div>
                            <div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                rsvp.status === 'going' 
                                  ? 'bg-green-100 text-green-700' 
                                  : rsvp.status === 'maybe'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                {rsvp.status === 'going' 
                                  ? 'Going' 
                                  : rsvp.status === 'maybe'
                                    ? 'Maybe'
                                    : 'Not Going'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventManagementDashboard;