import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface EventCalendarProps {
  communityId: string;
  onEventSelect: (eventId: string) => void;
}

const EventCalendar = ({ communityId, onEventSelect }: EventCalendarProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');

      // Calculate start and end of month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Format dates for Supabase query
      const startDate = startOfMonth.toISOString();
      const endDate = endOfMonth.toISOString();

      // Fetch events for this community within the month
      const { data, error: eventsError } = await supabase
        .from('community_events')
        .select('*')
        .eq('community_id', communityId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });

      if (eventsError) throw eventsError;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [communityId, currentDate]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    // Create array of day numbers
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Add empty cells for days before the first day of month
    const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => null);
    
    // Combine empty cells and days
    const allCells = [...emptyCells, ...days];
    
    // Group into weeks (rows)
    const weeks = [];
    for (let i = 0; i < allCells.length; i += 7) {
      weeks.push(allCells.slice(i, i + 7));
    }

    // Get events for each day
    const eventsByDay: { [key: number]: any[] } = {};
    events.forEach(event => {
      const eventDate = new Date(event.start_time);
      if (eventDate.getMonth() === month && eventDate.getFullYear() === year) {
        const day = eventDate.getDate();
        if (!eventsByDay[day]) {
          eventsByDay[day] = [];
        }
        eventsByDay[day].push(event);
      }
    });

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-neutral-200">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-full hover:bg-neutral-100"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-600" />
          </button>
          
          <h3 className="font-medium">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-full hover:bg-neutral-100"
          >
            <ChevronRight className="h-5 w-5 text-neutral-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 text-center border-b border-neutral-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-sm font-medium text-neutral-500">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 text-center">
          {weeks.map((week, weekIndex) => (
            week.map((day, dayIndex) => {
              const isToday = day && 
                year === new Date().getFullYear() && 
                month === new Date().getMonth() && 
                day === new Date().getDate();
                
              const isSelected = day && 
                selectedDate && 
                year === selectedDate.getFullYear() && 
                month === selectedDate.getMonth() && 
                day === selectedDate.getDate();
                
              const hasEvents = day && eventsByDay[day] && eventsByDay[day].length > 0;
              
              return (
                <div 
                  key={`${weekIndex}-${dayIndex}`}
                  className={`p-1 h-24 border-b border-r border-neutral-200 ${
                    day ? 'cursor-pointer hover:bg-neutral-50' : 'bg-neutral-50'
                  } ${isSelected ? 'bg-primary-50' : ''}`}
                  onClick={() => {
                    if (day) {
                      const newDate = new Date(year, month, day);
                      setSelectedDate(isSelected ? null : newDate);
                    }
                  }}
                >
                  {day && (
                    <div className="h-full flex flex-col">
                      <div className={`text-right p-1 ${
                        isToday 
                          ? 'bg-primary-500 text-white rounded-full w-7 h-7 flex items-center justify-center ml-auto'
                          : ''
                      }`}>
                        {day}
                      </div>
                      
                      <div className="flex-grow overflow-y-auto text-left">
                        {hasEvents && (
                          <div className="mt-1">
                            {eventsByDay[day].slice(0, 2).map(event => (
                              <div 
                                key={event.id}
                                className="text-xs p-1 mb-1 truncate rounded bg-primary-100 text-primary-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventSelect(event.id);
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {eventsByDay[day].length > 2 && (
                              <div className="text-xs text-neutral-500 pl-1">
                                +{eventsByDay[day].length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    );
  };

  const renderSelectedDateEvents = () => {
    if (!selectedDate) return null;
    
    const selectedDateEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.getDate() === selectedDate.getDate() &&
             eventDate.getMonth() === selectedDate.getMonth() &&
             eventDate.getFullYear() === selectedDate.getFullYear();
    });
    
    if (selectedDateEvents.length === 0) {
      return (
        <div className="mt-4 p-4 bg-neutral-50 rounded-lg text-center">
          <p className="text-neutral-600">No events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      );
    }
    
    return (
      <div className="mt-4">
        <h3 className="font-medium mb-3">
          Events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        <div className="space-y-2">
          {selectedDateEvents.map(event => (
            <div 
              key={event.id}
              className="p-3 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
              onClick={() => onEventSelect(event.id)}
            >
              <div className="font-medium">{event.title}</div>
              <div className="text-sm text-neutral-500">
                {new Date(event.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
              </div>
              {event.location && (
                <div className="text-sm text-neutral-500 flex items-center mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {event.location}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-neutral-200 rounded"></div>
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-primary-500" />
          Event Calendar
        </h2>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-sm text-primary-500 hover:text-primary-600"
        >
          Today
        </button>
      </div>
      
      {renderCalendar()}
      {renderSelectedDateEvents()}
    </div>
  );
};

export default EventCalendar;