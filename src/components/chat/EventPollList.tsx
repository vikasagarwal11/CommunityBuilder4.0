import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AvailabilityPollCard from './AvailabilityPollCard';

interface EventPollListProps {
  communityId: string;
  limit?: number;
  onCreateEvent?: (pollId: string, selectedSlot: any) => void;
}

const EventPollList: React.FC<EventPollListProps> = ({
  communityId,
  limit = 3,
  onCreateEvent
}) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        setLoading(true);
        
        // Fetch active polls for this community
        const { data, error } = await supabase
          .from('event_polls')
          .select(`
            id,
            title,
            description,
            options,
            created_by,
            expires_at,
            created_at,
            creator:profiles!created_by(
              full_name,
              avatar_url
            )
          `)
          .eq('community_id', communityId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (error) throw error;
        setPolls(data || []);
      } catch (err) {
        console.error('Error fetching polls:', err);
        setError('Failed to load polls');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPolls();
  }, [communityId, limit]);

  const handleCreateEventFromPoll = (selectedSlot: any) => {
    // Implementation would depend on how you want to create events from polls
    console.log('Create event from poll with slot:', selectedSlot);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <div className="h-6 bg-neutral-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded"></div>
              <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
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

  if (polls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 text-center">
        <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-600">No active polls at the moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map(poll => (
        <AvailabilityPollCard
          key={poll.id}
          pollId={poll.id}
          communityId={communityId}
          onCreateEvent={onCreateEvent ? handleCreateEventFromPoll : undefined}
        />
      ))}
    </div>
  );
};

export default EventPollList;