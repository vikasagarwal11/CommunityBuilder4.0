import { useState } from 'react';
import { Settings, Bot, Sparkles } from 'lucide-react';
import CommunitySettings from './CommunitySettings';
import CommunityAIProfile from './CommunityAIProfile';

interface CommunitySettingsButtonProps {
  communityId: string;
  communityName: string;
  isAdmin: boolean;
}

const CommunitySettingsButton = ({ communityId, communityName, isAdmin }: CommunitySettingsButtonProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAIProfile, setShowAIProfile] = useState(false);

  if (!isAdmin) return null;

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setShowAIProfile(true)}
        className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
        title="AI Community Profile"
      >
        <Bot className="h-5 w-5 mr-2" />
        <Sparkles className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => setShowSettings(true)}
        className="px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg flex items-center"
        title="Community Settings"
      >
        <Settings className="h-5 w-5 mr-2" />
        Settings
      </button>

      {showSettings && (
        <CommunitySettings
          communityId={communityId}
          communityName={communityName}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      {showAIProfile && (
        <CommunityAIProfile
          communityId={communityId}
          isAdmin={isAdmin}
          onClose={() => setShowAIProfile(false)}
        />
      )}
    </div>
  );
};

export default CommunitySettingsButton;