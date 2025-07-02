import React, { useState } from 'react';
import { Wand2, X } from 'lucide-react';
import AdminEventScheduler from '../admin/AdminEventScheduler';

interface CommunityAdminEventSchedulerProps {
  communityId: string;
  onEventCreated?: (eventId: string) => void;
}

const CommunityAdminEventScheduler: React.FC<CommunityAdminEventSchedulerProps> = ({
  communityId,
  onEventCreated
}) => {
  const [showScheduler, setShowScheduler] = useState(false);

  const handleEventCreated = (eventId: string) => {
    setShowScheduler(false);
    if (onEventCreated) {
      onEventCreated(eventId);
    }
  };

  return (
    <>
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mr-3">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI Event Scheduler</h2>
              <p className="text-sm text-neutral-500">
                Create events with natural language prompts
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowScheduler(false)}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        <AdminEventScheduler
          communityId={communityId}
          onClose={() => setShowScheduler(false)}
          onEventCreated={handleEventCreated}
        />
      </div>
    </>
  );
};

export default CommunityAdminEventScheduler;