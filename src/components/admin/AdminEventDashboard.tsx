import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, TrendingUp, BarChart2, ArrowRight, Wand2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import AdminEventScheduler from './AdminEventScheduler';

interface AdminEventDashboardProps {
  communityId?: string; // Optional - if provided, only shows events for this community
}

const AdminEventDashboard: React.FC<AdminEventDashboardProps> = ({ communityId }) => {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [eventStats, setEventStats] = useState({
    total: 0,
    upcoming: 0,
    past: 0,
    attendees: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(communityId || null);

  // Fetch admin's communities if no communityId is provided
  useEffect(() => {
    if (communityId) {
      setSelectedCommunity(communityId);
      return;
    }
    
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
  }, [user, communityId]);

  // Fetch events and stats
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedCommunity) return;
      
      try {
        setLoading(true);
        
        const now = new Date().toISOString();
        
        // Fetch upcoming events
        const { data: upcomingData, error: upcomingError } = await supabase
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
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(5);
          
        if (upcomingError) throw upcomingError;
        
        // Get RSVP counts for upcoming events
        const upcomingWithRsvpCounts = await Promise.all(
          upcomingData.map(async (event) => {
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
        
        setUpcomingEvents(upcomingWithRsvpCounts);
        
        // Get event stats
        const { count: totalCount } = await supabase
          .from('community_events')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', selectedCommunity);
          
        const { count: upcomingCount } = await supabase
          .from('community_events')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', selectedCommunity)
          .gte('start_time', now);
          
        const { count: pastCount } = await supabase
          .from('community_events')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', selectedCommunity)
          .lt('start_time', now);
          
        // Get total attendees across all events
        const { data: eventIds } = await supabase
          .from('community_events')
          .select('id')
          .eq('community_id', selectedCommunity);
          
        let totalAttendees = 0;
        if (eventIds && eventIds.length > 0) {
          const ids = eventIds.map(e => e.id);
          const { count: attendeeCount } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .in('event_id', ids)
            .eq('status', 'going');
            
          totalAttendees = attendeeCount || 0;
        }
        
        setEventStats({
          total: totalCount || 0,
          upcoming: upcomingCount || 0,
          past: pastCount || 0,
          attendees: totalAttendees
        });
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [selectedCommunity]);

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

  // Handle event creation from scheduler
  const handleEventCreated = (eventId: string) => {
    setShowScheduler(false);
    
    // Refresh events
    fetchEvents();
  };

  // Fetch events function
  const fetchEvents = async () => {
    if (!selectedCommunity) return;
    
    try {
      setLoading(true);
      
      const now = new Date().toISOString();
      
      // Fetch upcoming events
      const { data: upcomingData, error: upcomingError } = await supabase
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
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(5);
        
      if (upcomingError) throw upcomingError;
      
      // Get RSVP counts for upcoming events
      const upcomingWithRsvpCounts = await Promise.all(
        upcomingData.map(async (event) => {
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
      
      setUpcomingEvents(upcomingWithRsvpCounts);
      
      // Get event stats
      const { count: totalCount } = await supabase
        .from('community_events')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', selectedCommunity);
        
      const { count: upcomingCount } = await supabase
        .from('community_events')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', selectedCommunity)
        .gte('start_time', now);
        
      const { count: pastCount } = await supabase
        .from('community_events')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', selectedCommunity)
        .lt('start_time', now);
        
      // Get total attendees across all events
      const { data: eventIds } = await supabase
        .from('community_events')
        .select('id')
        .eq('community_id', selectedCommunity);
        
      let totalAttendees = 0;
      if (eventIds && eventIds.length > 0) {
        const ids = eventIds.map(e => e.id);
        const { count: attendeeCount } = await supabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .in('event_id', ids)
          .eq('status', 'going');
          
        totalAttendees = attendeeCount || 0;
      }
      
      setEventStats({
        total: totalCount || 0,
        upcoming: upcomingCount || 0,
        past: pastCount || 0,
        attendees: totalAttendees
      });
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
        <h2 className="text-xl font-semibold">Event Dashboard</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowScheduler(true)}
            className="btn-primary flex items-center"
          >
            <Wand2 className="h-5 w-5 mr-2" />
            Quick Create
          </button>
          <Link to="/admin/events" className="btn-outline flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            All Events
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Community selector (if no communityId was provided) */}
      {!communityId && communities.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Select Community
          </label>
          <select
            value={selectedCommunity || ''}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="input w-full max-w-md"
          >
            <option value="" disabled>Select a community</option>
            {communities.map(community => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-neutral-500 text-sm">Total Events</p>
              <p className="text-3xl font-semibold mt-1">{eventStats.total}</p>
            </div>
            <div className="p-2 rounded-lg bg-primary-100">
              <Calendar className="h-5 w-5 text-primary-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-neutral-500 text-sm">Upcoming Events</p>
              <p className="text-3xl font-semibold mt-1">{eventStats.upcoming}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-100">
              <Clock className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-neutral-500 text-sm">Past Events</p>
              <p className="text-3xl font-semibold mt-1">{eventStats.past}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-100">
              <BarChart2 className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-neutral-500 text-sm">Total Attendees</p>
              <p className="text-3xl font-semibold mt-1">{eventStats.attendees}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-100">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Upcoming Events */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Upcoming Events</h3>
          <Link to="/admin/events" className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-neutral-100 rounded"></div>
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="space-y-4">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    <Calendar className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">{event.title}</h4>
                    <div className="flex items-center text-sm text-neutral-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(event.start_time)} at {formatTime(event.start_time)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center mr-4">
                    <Users className="h-4 w-4 mr-1 text-neutral-400" />
                    <span className="text-sm">{event.rsvp_count}</span>
                    {event.capacity && <span className="text-sm text-neutral-500">/{event.capacity}</span>}
                  </div>
                  <Link
                    to={`/community/${event.community_id}/events?event=${event.id}`}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 mb-4">No upcoming events</p>
            <button
              onClick={() => setShowScheduler(true)}
              className="btn-primary flex items-center mx-auto"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Create Event
            </button>
          </div>
        )}
      </div>
      
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

export default AdminEventDashboard;