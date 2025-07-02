import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Grid, List, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, communityService } from '../lib/supabase';
import EventList from '../components/events/EventList';
import EventDetail from '../components/events/EventDetail';
import EventForm from '../components/events/EventForm';
import EventCalendar from '../components/events/EventCalendar';
import EventGallery from '../components/events/EventGallery';
import EventMediaGallery from '../components/events/EventMediaGallery';

const CommunityEventsPage = () => {
  const { id: communityId, slug } = useParams<{ id?: string; slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'calendar' | 'gallery'>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(searchParams.get('event'));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  const fetchCommunityAndRole = async () => {
    try {
      setLoading(true);
      setError('');

      let communityData;
      
      // If we have a slug, fetch by slug
      if (slug) {
        communityData = await communityService.getCommunityBySlug(slug);
      } 
      // Otherwise, fetch by ID
      else if (communityId) {
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .eq('id', communityId)
          .single();

        if (error) throw error;
        communityData = data;
      } else {
        throw new Error('Community ID or slug is required');
      }
      
      setCommunity(communityData);

      // Check if user is admin
      if (user) {
        const { data: memberData, error: memberError } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityData.id)
          .eq('user_id', user.id);

        if (memberError) {
          console.error('Error checking admin status:', memberError);
          setIsAdmin(false);
        } else if (memberData.length > 0) {
          setIsAdmin(memberData[0].role === 'admin' || memberData[0].role === 'co-admin');
        } else {
          setIsAdmin(false); // No membership record
        }
      }
    } catch (err) {
      console.error('Error fetching community:', err);
      setError('Failed to load community information');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventForEditing = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEditingEvent(data);
    } catch (err) {
      console.error('Error fetching event for editing:', err);
      setError('Failed to load event for editing');
    }
  };

  useEffect(() => {
    fetchCommunityAndRole();
  }, [communityId, slug, user]);

  useEffect(() => {
    if (editingEventId) {
      fetchEventForEditing(editingEventId);
    } else {
      setEditingEvent(null);
    }
  }, [editingEventId]);

  useEffect(() => {
    // Update URL when selected event changes
    if (selectedEventId) {
      setSearchParams({ event: selectedEventId });
    } else {
      setSearchParams({});
    }
  }, [selectedEventId]);

  const handleEventCreated = (eventId: string) => {
    setShowCreateForm(false);
    setSelectedEventId(eventId);
  };

  const handleEventUpdated = (eventId: string) => {
    setEditingEventId(null);
    setSelectedEventId(eventId);
  };

  const handleEventDeleted = () => {
    setSelectedEventId(null);
  };

  const handleViewChange = (newView: 'list' | 'calendar' | 'gallery') => {
    setView(newView);
    // Clear selected event when switching to gallery view
    if (newView === 'gallery' && selectedEventId) {
      setSelectedEventId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="container max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-neutral-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="container max-w-6xl">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error || 'Community not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container max-w-6xl">
        <div className="mb-6">
          <Link 
            to={community.slug ? `/c/${community.slug}` : `/community/${community.id}`}
            className="flex items-center text-primary-500 hover:text-primary-600 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to {community.name}
          </Link>
        </div>

        {showCreateForm ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-semibold mb-6">Create New Event</h1>
            <EventForm 
              communityId={community.id}
              onSuccess={handleEventCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        ) : editingEventId && editingEvent ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-semibold mb-6">Edit Event</h1>
            <EventForm 
              communityId={community.id}
              onSuccess={handleEventUpdated}
              onCancel={() => setEditingEventId(null)}
              existingEvent={editingEvent}
            />
          </div>
        ) : selectedEventId ? (
          <div className="space-y-8">
            <EventDetail 
              eventId={selectedEventId}
              communityId={community.id}
              onBack={() => setSelectedEventId(null)}
              onEdit={isAdmin ? setEditingEventId : undefined}
              onDelete={isAdmin ? handleEventDeleted : undefined}
            />
            
            {/* Event Media Gallery */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <EventMediaGallery 
                eventId={selectedEventId}
                communityId={community.id}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-primary-500" />
                {community.name} Events
              </h1>
              
              <div className="flex items-center space-x-3">
                <div className="flex bg-white rounded-lg border border-neutral-200 p-1">
                  <button
                    onClick={() => handleViewChange('list')}
                    className={`p-2 rounded ${
                      view === 'list' 
                        ? 'bg-primary-500 text-white' 
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                    title="List view"
                  >
                    <List className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleViewChange('calendar')}
                    className={`p-2 rounded ${
                      view === 'calendar' 
                        ? 'bg-primary-500 text-white' 
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                    title="Calendar view"
                  >
                    <Calendar className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleViewChange('gallery')}
                    className={`p-2 rounded ${
                      view === 'gallery' 
                        ? 'bg-primary-500 text-white' 
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                    title="Media gallery"
                  >
                    <Image className="h-5 w-5" />
                  </button>
                </div>
                
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Event
                  </button>
                )}
              </div>
            </div>
            
            {view === 'list' && (
              <EventList 
                communityId={community.id}
                onEventSelect={setSelectedEventId}
              />
            )}
            
            {view === 'calendar' && (
              <EventCalendar 
                communityId={community.id}
                onEventSelect={setSelectedEventId}
              />
            )}
            
            {view === 'gallery' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <EventGallery 
                  communityId={community.id}
                  eventId="all" // Special value to show all event photos
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommunityEventsPage;