import { useState, useEffect } from 'react';
import { Search, Calendar, X, Filter } from 'lucide-react';
import EventCard from './EventCard';
import { supabase } from '../../lib/supabase';

interface EventListProps {
  communityId: string;
  onEventSelect?: (eventId: string) => void;
  limit?: number;
  showFilters?: boolean;
}

const EventList = ({ communityId, onEventSelect, limit, showFilters = true }: EventListProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch events from the database
        const now = new Date().toISOString();
        
        let query = supabase
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
          .eq('community_id', communityId);
          
        // Apply filter based on selected filter
        if (selectedFilter === 'upcoming') {
          query = query.gte('start_time', now);
        } else if (selectedFilter === 'past') {
          query = query.lt('start_time', now);
        }
        
        // Apply limit if provided
        if (limit) {
          query = query.limit(limit);
        }
        
        // Order by start time
        query = query.order('start_time', { ascending: selectedFilter === 'upcoming' });
        
        const { data, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        
        // Get RSVP counts for each event
        const eventsWithRsvpCounts = await Promise.all(
          (data || []).map(async (event) => {
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
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [communityId, selectedFilter, limit]);

  const getFilteredEvents = () => {
    let filtered = events;

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

  const filteredEvents = getFilteredEvents();
  
  // Apply limit if provided
  const displayedEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-48 bg-neutral-200"></div>
            <div className="p-6 space-y-4">
              <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
              <div className="h-4 bg-neutral-200 rounded w-full"></div>
              <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
              <div className="h-10 bg-neutral-200 rounded"></div>
            </div>
          </div>
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

  return (
    <div>
      {showFilters && (
        <>
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
            
            <button 
              className="md:hidden flex items-center px-4 py-2 bg-neutral-100 rounded-lg text-neutral-700"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            <div className={`flex flex-wrap gap-2 ${showMobileFilters ? 'block' : 'hidden md:flex'}`}>
              {[
                { key: 'all', label: 'All Events' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'past', label: 'Past Events' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === key
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {displayedEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No events found</h3>
          <p className="text-neutral-600">
            {searchTerm 
              ? "No events match your search. Try different keywords."
              : selectedFilter === 'upcoming'
                ? "There are no upcoming events scheduled."
                : selectedFilter === 'past'
                  ? "There are no past events."
                  : "No events found."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedEvents.map((event) => (
            <div 
              key={event.id} 
              onClick={() => onEventSelect && onEventSelect(event.id)}
              className={onEventSelect ? 'cursor-pointer' : ''}
            >
              <EventCard 
                event={event} 
                onRSVPChange={() => {}}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventList;