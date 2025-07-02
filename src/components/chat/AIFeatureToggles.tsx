import React from 'react';
import { Heart, Brain, Volume2 } from 'lucide-react';

interface AIFeatureTogglesProps {
  moodSyncEnabled: boolean;
  memoryEchoEnabled: boolean;
  holoVoiceEnabled: boolean;
  onMoodSyncToggle: () => void;
  onMemoryEchoToggle: () => void;
  onHoloVoiceToggle: () => void;
}

const AIFeatureToggles: React.FC<AIFeatureTogglesProps> = ({
  moodSyncEnabled,
  memoryEchoEnabled,
  holoVoiceEnabled,
  onMoodSyncToggle,
  onMemoryEchoToggle,
  onHoloVoiceToggle
}) => {
  return (
    <div className="flex items-center justify-center space-x-3">
      <button
        onClick={onMoodSyncToggle}
        className={`px-2 py-1 rounded-full text-xs flex items-center ${
          moodSyncEnabled
            ? 'bg-red-100 text-red-700'
            : 'bg-neutral-100 text-neutral-600'
        }`}
        title="Adapts responses based on your mood"
      >
        <Heart className="h-3 w-3 mr-1" />
        MoodSync
      </button>
      <button
        onClick={onMemoryEchoToggle}
        className={`px-2 py-1 rounded-full text-xs flex items-center ${
          memoryEchoEnabled
            ? 'bg-blue-100 text-blue-700'
            : 'bg-neutral-100 text-neutral-600'
        }`}
        title="Remembers conversation context"
      >
        <Brain className="h-3 w-3 mr-1" />
        Memory
      </button>
      <button
        onClick={onHoloVoiceToggle}
        className={`px-2 py-1 rounded-full text-xs flex items-center ${
          holoVoiceEnabled
            ? 'bg-purple-100 text-purple-700'
            : 'bg-neutral-100 text-neutral-600'
        }`}
        title="Enables voice responses"
      >
        <Volume2 className="h-3 w-3 mr-1" />
        Voice
      </button>
    </div>
  );
};

export default AIFeatureToggles;