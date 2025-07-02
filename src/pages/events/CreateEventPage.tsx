import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import EventForm from '../../components/events/EventForm';
import AIEventRecommendations from '../../components/events/AIEventRecommendations';

const CreateEventPage = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any | null>(null);

  useEffect(() => {
    const fetchCommunityAndRole = async () => {
      if (!communityId || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch community details
        const { data: communityData, error: communityError } = await supabase
          .from('communities')
          .select('*')
          .eq('id', communityId)
          .single();
          
        if (communityError) throw communityError;
        setCommunity(communityData);
        
        // Check if user is admin
        const { data: memberData, error: memberError } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', user.id)
          .single();
          
        if (memberError) throw memberError;
        setIsAdmin(memberData.role === 'admin' || memberData.role === 'co-admin');
      } catch (error) {
        console.error('Error fetching community:', error);
        setError('Failed to load community information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommunityAndRole();
  }, [communityId, user]);

  const handleEventCreated = (eventId: string) => {
    navigate(`/community/${communityId}/events?event=${eventId}`);
  };

  const handleUseRecommendation = (recommendation: any) => {
    setSelectedRecommendation(recommendation);
    setShowAIRecommendations(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="container max-w-4xl">
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
        <div className="container max-w-4xl">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error || 'Community not found'}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Calendar className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-4">Admin Access Required</h1>
            <p className="text-neutral-600 mb-6">
              You need to be a community admin or co-admin to create events.
            </p>
            <button
              onClick={() => navigate(`/community/${communityId}`)}
              className="btn-primary"
            >
              Back to Community
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/community/${communityId}`)}
            className="flex items-center text-primary-500 hover:text-primary-600"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to {community.name}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Create New Event</h1>
          <button
            onClick={() => setShowAIRecommendations(!showAIRecommendations)}
            className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {showAIRecommendations ? 'Hide AI Recommendations' : 'Show AI Recommendations'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className={`${showAIRecommendations ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <EventForm
                communityId={communityId}
                onSuccess={handleEventCreated}
                onCancel={() => navigate(`/community/${communityId}`)}
                existingEvent={selectedRecommendation ? {
                  title: selectedRecommendation.title,
                  description: selectedRecommendation.description,
                  capacity: selectedRecommendation.participantLimit,
                  tags: selectedRecommendation.tags,
                } : undefined}
              />
            </div>
          </div>

          {showAIRecommendations && (
            <div className="lg:col-span-2">
              <AIEventRecommendations
                communityId={communityId}
                onCreateEvent={handleUseRecommendation}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;