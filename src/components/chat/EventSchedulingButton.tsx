import React, { useState } from 'react';
import { Calendar, Plus, Wand2 } from 'lucide-react';
import EventPlanningAssistant from './EventPlanningAssistant';
import AdminEventScheduler from '../admin/AdminEventScheduler';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface EventSchedulingButtonProps {
  communityId: string;
  onEventCreated?: (eventId: string) => void;
}

const EventSchedulingButton: React.FC<EventSchedulingButtonProps> = ({
  communityId,
  onEventCreated
}) => {
  const { user } = useAuth();
  const [showPlanner, setShowPlanner] = useState(false);
  const [showAdminScheduler, setShowAdminScheduler] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(data?.role === 'admin' || data?.role === 'co-admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [communityId, user]);

  const handleEventCreated = (eventId: string) => {
    setShowPlanner(false);
    setShowAdminScheduler(false);
    if (onEventCreated) {
      onEventCreated(eventId);
    }
  };

  if (loading) {
    return (
      <button
        className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-500 rounded-lg opacity-75"
        disabled
      >
        <Calendar className="h-5 w-5" />
        <span className="font-medium">Plan Event</span>
      </button>
    );
  }

  return (
    <>
      {isAdmin ? (
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAdminScheduler(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all"
            title="Quick create event"
          >
            <Wand2 className="h-5 w-5" />
            <span className="font-medium">Quick Create</span>
          </button>
          <button
            onClick={() => setShowPlanner(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-all"
            title="Plan an event"
          >
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Plan Event</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPlanner(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all"
          title="Plan an event"
        >
          <Calendar className="h-5 w-5" />
          <span className="font-medium">Plan Event</span>
        </button>
      )}

      {showPlanner && (
        <EventPlanningAssistant
          communityId={communityId}
          onClose={() => setShowPlanner(false)}
          onEventCreated={handleEventCreated}
        />
      )}

      {showAdminScheduler && (
        <AdminEventScheduler
          communityId={communityId}
          onClose={() => setShowAdminScheduler(false)}
          onEventCreated={handleEventCreated}
        />
      )}
    </>
  );
};

export default EventSchedulingButton;