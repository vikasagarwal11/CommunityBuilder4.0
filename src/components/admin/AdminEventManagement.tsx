import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash, 
  ChevronDown, 
  Eye, 
  MessageSquare, 
  Users,
  Clock,
  MapPin,
  Tag,
  Check,
  X,
  Wand2,
  CalendarDays,
  CalendarClock,
  Repeat,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import AdminEventScheduler from './AdminEventScheduler';
import AdminEventNotifications from './AdminEventNotifications';

const AdminEventManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'past' | 'recurring'>('upcoming');
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Record<string, any[]>>({});

  // Fetch admin's communities
  useEffect(() => {
    const fetchCommunities = async () => {
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
              image_url
            )
          `)
          .eq('user_id', user.id)
          .in('role', ['admin', 'co-admin']);
          
        if (error) throw error;
        
        const formattedCommunities = data.map(item => ({
          id: item.communities.id,
          name: item.communities.name,
          image_url: item.communities.image_url,
          role: item.role
        }));
        
        setCommunities(formattedCommunities);
        
        // Set first community as selected by default
        if (formattedCommunities.length > 0 && !selectedCommunity) {
          setSelectedCommunity(formattedCommunities[0].id);
        }
      } catch (err) {
        console.error('Error fetching communities:', err);
        setError('Failed to load communities');
      }
    };
    
    fetchCommunities();
  }, [user]);

  // Fetch events for selected community
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedCommunity) return;
      
      try {
        setLoading(true);
        
        // Fetch events
        const { data, error } = await supabase
          .from('community_events')
          .select(`
            *,
            creator:users!created_by(
              profiles!id(
                full_name,
                avatar_url
              )
            )
          `)
          .eq('community_id', selectedCommunity)
          .order('start_time', { ascending: true });
          
        if (error) throw error;
        
        // Get RSVP counts for each event
        const eventsWithRsvpCounts = await Promise.all(
          data.map(async (event) => {
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
        
        setEvents(eventsWithRsvpCounts);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [selectedCommunity]);

  // Fetch attendees for an event
  const fetchAttendees = async (eventId: string) => {
    if (attendees[eventId]) return; // Already fetched
    
    try {
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
      const transformedAttendees = data.map(rsvp => ({
        ...rsvp,
        user_profile: rsvp.profiles
      }));
      
      setAttendees({
        ...attendees,
        [eventId]: transformedAttendees
      });
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      setDeleting(true);
      
      // Delete event
      const { error } = await supabase
        .from('community_events')
        .delete()
        .eq('id', eventId);
        
      if (error) throw error;
      
      // Update local state
      setEvents(events.filter(event => event.id !== eventId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  // Handle event creation from scheduler
  const handleEventCreated = (eventId: string) => {
    setShowScheduler(false);
    
    // Refresh events
    if (selectedCommunity) {
      fetchEvents();
    }
  };

  // Filter events based on search and filter
  const getFilteredEvents = () => {
    const now = new Date();
    
    return events.filter(event => {
      // Apply search filter
      const matchesSearch = 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Apply status filter
      const eventDate = new Date(event.start_time);
      const isPast = eventDate < now;
      const isRecurring = event.is_recurring;
      
      if (selectedFilter === 'upcoming' && isPast) return false;
      if (selectedFilter === 'past' && !isPast) return false;
      if (selectedFilter === 'recurring' && !isRecurring) return false;
      
      return matchesSearch;
    });
  };

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

  // Get status color
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

  // Get recurring icon based on recurrence rule
  const getRecurringIcon = (recurrenceRule: string) => {
    if (!recurrenceRule) return null;
    
    if (recurrenceRule.includes('DAILY')) {
      return <CalendarDays className="h-4 w-4 text-primary-500" title="Daily" />;
    } else if (recurrenceRule.includes('WEEKLY')) {
      return <CalendarClock className="h-4 w-4 text-primary-500" title="Weekly" />;
    } else if (recurrenceRule.includes('MONTHLY')) {
      return <Calendar className="h-4 w-4 text-primary-500" title="Monthly" />;
    }
    
    return <Repeat className="h-4 w-4 text-primary-500" title="Recurring" />;
  };

  const filteredEvents = getFilteredEvents();

  // Fetch events function
  const fetchEvents = async () => {
    if (!selectedCommunity) return;
    
    try {
      setLoading(true);
      
      // Fetch events
      const { data, error } = await supabase
        .from('community_events')
        .select(`
          *,
          creator:users!created_by(
            profiles!id(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('community_id', selectedCommunity)
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      
      // Get RSVP counts for each event
      const eventsWithRsvpCounts = await Promise.all(
        data.map(async (event) => {
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
      
      setEvents(eventsWithRsvpCounts);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Event Management</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowScheduler(true)}
            className="btn-primary flex items-center"
          >
            <Wand2 className="h-5 w-5 mr-2" />
            Quick Create
          </button>
          <button
            onClick={() => navigate(`/community/${selectedCommunity}/events/create`)}
            className="btn-outline flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Event
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Community selector */}
      {communities.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Select Community
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {communities.map(community => (
              <div
                key={community.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center ${
                  selectedCommunity === community.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-primary-300'
                }`}
                onClick={() => setSelectedCommunity(community.id)}
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 mr-3">
                  {community.image_url ? (
                    <img 
                      src={community.image_url} 
                      alt={community.name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-neutral-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{community.name}</p>
                  <p className="text-xs text-neutral-500 capitalize">{community.role}</p>
                </div>
                {selectedCommunity === community.id && (
                  <Check className="h-5 w-5 text-primary-500 ml-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
            <Search className="absolute left-3 top-3.5 text-neutral-400" size={18} />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Events' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'recurring', label: 'Recurring' },
              { key: 'past', label: 'Past Events' }
            ].map(({ key, label }) => (
              <button 
                key={key}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === key
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setSelectedFilter(key as any)}
              >
                {label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <CalendarDays size={18} />
            </button>
            <button 
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <CalendarClock size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Event Notifications */}
      {selectedCommunity && (
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <AdminEventNotifications 
            communityId={selectedCommunity}
            onEventCreated={handleEventCreated}
          />
        </div>
      )}
      
      {/* Events Display */}
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
              : selectedFilter === 'upcoming'
                ? "You don't have any upcoming events."
                : selectedFilter === 'past'
                  ? "You don't have any past events."
                  : selectedFilter === 'recurring'
                    ? "You don't have any recurring events."
                    : "You haven't created any events yet."}
          </p>
          <button 
            onClick={() => setShowScheduler(true)}
            className="btn-primary"
          >
            <Wand2 className="h-5 w-5 mr-2 inline-block" />
            Create Your First Event
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 text-left text-sm text-neutral-500">
                <th className="px-6 py-3 font-medium">Event</th>
                <th className="px-6 py-3 font-medium">Date & Time</th>
                <th className="px-6 py-3 font-medium">Attendees</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  <tr 
                    className={`border-t border-neutral-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
                    } ${expandedEvent === event.id ? 'border-b-0' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="mr-3 flex-shrink-0">
                          {event.is_recurring && getRecurringIcon(event.recurrence_rule)}
                        </div>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-neutral-500 line-clamp-1">{event.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                        <div>
                          <p className="text-sm">{formatDate(event.start_time)}</p>
                          <p className="text-xs text-neutral-500">{formatTime(event.start_time)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-neutral-400" />
                        <span>{event.rsvp_count}</span>
                        {event.capacity && (
                          <span className="text-neutral-500 text-sm ml-1">/{event.capacity}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setExpandedEvent(expandedEvent === event.id ? null : event.id);
                            if (expandedEvent !== event.id) {
                              fetchAttendees(event.id);
                            }
                          }}
                          className="p-1 text-neutral-500 hover:text-primary-500"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/community/${event.community_id}/events?event=${event.id}`)}
                          className="p-1 text-neutral-500 hover:text-primary-500"
                          title="View event page"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/events/edit/${event.id}`)}
                          className="p-1 text-neutral-500 hover:text-primary-500"
                          title="Edit event"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(event.id)}
                          className="p-1 text-neutral-500 hover:text-red-500"
                          title="Delete event"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded details row */}
                  {expandedEvent === event.id && (
                    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                      <td colSpan={5} className="px-6 py-4 border-t border-dashed border-neutral-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-3">Event Details</h4>
                            <div className="space-y-2">
                              {event.location && (
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-2 text-neutral-400 mt-0.5" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.is_online && event.meeting_url && (
                                <div className="flex items-start">
                                  <ExternalLink className="h-4 w-4 mr-2 text-neutral-400 mt-0.5" />
                                  <a 
                                    href={event.meeting_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary-500 hover:text-primary-600"
                                  >
                                    {event.meeting_url}
                                  </a>
                                </div>
                              )}
                              {event.is_recurring && (
                                <div className="flex items-start">
                                  <Repeat className="h-4 w-4 mr-2 text-neutral-400 mt-0.5" />
                                  <span>
                                    {event.recurrence_rule?.includes('DAILY') ? 'Daily' : 
                                     event.recurrence_rule?.includes('WEEKLY') ? 'Weekly' : 
                                     event.recurrence_rule?.includes('MONTHLY') ? 'Monthly' : 'Recurring'}
                                    {event.recurrence_rule?.includes('INTERVAL=') && 
                                      ` (every ${event.recurrence_rule.match(/INTERVAL=(\d+)/)?.[1] || ''} ${
                                        event.recurrence_rule?.includes('DAILY') ? 'days' : 
                                        event.recurrence_rule?.includes('WEEKLY') ? 'weeks' : 'months'
                                      })`
                                    }
                                  </span>
                                </div>
                              )}
                              {event.tags && event.tags.length > 0 && (
                                <div className="flex items-start flex-wrap gap-1 mt-2">
                                  {event.tags.map((tag: string, i: number) => (
                                    <span 
                                      key={i}
                                      className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-3">Attendees</h4>
                            {attendees[event.id] ? (
                              attendees[event.id].length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {attendees[event.id].map(attendee => (
                                    <div 
                                      key={attendee.id}
                                      className={`p-2 rounded-lg ${
                                        attendee.status === 'going' 
                                          ? 'bg-green-50' 
                                          : attendee.status === 'maybe'
                                            ? 'bg-yellow-50'
                                            : 'bg-red-50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <div className="h-8 w-8 rounded-full bg-neutral-200 overflow-hidden mr-3">
                                            {attendee.user_profile.avatar_url ? (
                                              <img 
                                                src={attendee.user_profile.avatar_url} 
                                                alt={attendee.user_profile.full_name} 
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                                {attendee.user_profile.full_name.charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <p className="font-medium text-sm">{attendee.user_profile.full_name}</p>
                                            <p className="text-xs text-neutral-500">{attendee.user_profile.email}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                            attendee.status === 'going' 
                                              ? 'bg-green-100 text-green-700' 
                                              : attendee.status === 'maybe'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-red-100 text-red-700'
                                          }`}>
                                            {attendee.status === 'going' 
                                              ? 'Going' 
                                              : attendee.status === 'maybe'
                                                ? 'Maybe'
                                                : 'Not Going'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-neutral-500 text-sm">No attendees yet</p>
                              )
                            ) : (
                              <div className="animate-pulse space-y-2">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="h-10 bg-neutral-100 rounded"></div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div 
              key={event.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4 border-b border-neutral-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 line-clamp-2 mb-3">{event.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-neutral-600">
                    <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                    <span>{formatDate(event.start_time)}</span>
                  </div>
                  <div className="flex items-center text-sm text-neutral-600">
                    <Clock className="h-4 w-4 mr-2 text-neutral-400" />
                    <span>{formatTime(event.start_time)}</span>
                    {event.end_time && <span> - {formatTime(event.end_time)}</span>}
                  </div>
                  {event.location && (
                    <div className="flex items-center text-sm text-neutral-600">
                      <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-neutral-600">
                    <Users className="h-4 w-4 mr-2 text-neutral-400" />
                    <span>{event.rsvp_count} attendees</span>
                    {event.capacity && <span className="text-neutral-500"> / {event.capacity}</span>}
                  </div>
                </div>
                
                {event.is_recurring && (
                  <div className="flex items-center text-sm text-primary-600 mb-4">
                    <Repeat className="h-4 w-4 mr-2" />
                    <span>
                      {event.recurrence_rule?.includes('DAILY') ? 'Daily' : 
                       event.recurrence_rule?.includes('WEEKLY') ? 'Weekly' : 
                       event.recurrence_rule?.includes('MONTHLY') ? 'Monthly' : 'Recurring'}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      setExpandedEvent(expandedEvent === event.id ? null : event.id);
                      if (expandedEvent !== event.id) {
                        fetchAttendees(event.id);
                      }
                    }}
                    className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 text-sm"
                  >
                    View Details
                  </button>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => navigate(`/admin/events/edit/${event.id}`)}
                      className="p-2 text-neutral-500 hover:text-primary-500 rounded-lg hover:bg-neutral-100"
                      title="Edit event"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(event.id)}
                      className="p-2 text-neutral-500 hover:text-red-500 rounded-lg hover:bg-neutral-100"
                      title="Delete event"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Expanded details */}
              {expandedEvent === event.id && (
                <div className="p-4 bg-neutral-50 border-t border-neutral-200">
                  <h4 className="font-medium mb-3">Attendees</h4>
                  {attendees[event.id] ? (
                    attendees[event.id].length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {attendees[event.id].map(attendee => (
                          <div 
                            key={attendee.id}
                            className={`p-2 rounded-lg ${
                              attendee.status === 'going' 
                                ? 'bg-green-50' 
                                : attendee.status === 'maybe'
                                  ? 'bg-yellow-50'
                                  : 'bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-neutral-200 overflow-hidden mr-3">
                                  {attendee.user_profile.avatar_url ? (
                                    <img 
                                      src={attendee.user_profile.avatar_url} 
                                      alt={attendee.user_profile.full_name} 
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-neutral-500">
                                      {attendee.user_profile.full_name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{attendee.user_profile.full_name}</p>
                                  <p className="text-xs text-neutral-500">{attendee.user_profile.email}</p>
                                </div>
                              </div>
                              <div>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  attendee.status === 'going' 
                                    ? 'bg-green-100 text-green-700' 
                                    : attendee.status === 'maybe'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                }`}>
                                  {attendee.status === 'going' 
                                    ? 'Going' 
                                    : attendee.status === 'maybe'
                                      ? 'Maybe'
                                      : 'Not Going'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-sm">No attendees yet</p>
                    )
                  ) : (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-10 bg-neutral-100 rounded"></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Event
            </h3>
            <p className="text-neutral-700 mb-4">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={() => showDeleteConfirm && handleDeleteEvent(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Event Scheduler */}
      {showScheduler && selectedCommunity && (
        <AdminEventScheduler
          communityId={selectedCommunity}
          onClose={() => setShowScheduler(false)}
          onEventCreated={handleEventCreated}
        />
      )}
    </div>
  );
};

export default AdminEventManagement;