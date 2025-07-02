import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Volume1, Sliders } from 'lucide-react';

interface AIVoiceControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  voice: 'feminine' | 'masculine' | 'neutral';
  onVoiceChange: (voice: 'feminine' | 'masculine' | 'neutral') => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  emotionIntensity: number;
  onEmotionIntensityChange: (intensity: number) => void;
}

const AIVoiceControls: React.FC<AIVoiceControlsProps> = ({
  isPlaying,
  onTogglePlay,
  voice,
  onVoiceChange,
  speed,
  onSpeedChange,
  emotionIntensity,
  onEmotionIntensityChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [volume, setVolume] = useState(1.0);

  // In a real implementation, this would control the actual audio volume
  useEffect(() => {
    // Set audio element volume
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = volume;
    });
  }, [volume]);

  return (
    <div className="bg-neutral-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {isPlaying ? (
            <Volume2 className="h-5 w-5 text-primary-500 mr-2" />
          ) : (
            <VolumeX className="h-5 w-5 text-neutral-500 mr-2" />
          )}
          <span className="text-sm font-medium">Voice Output</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onTogglePlay}
            className={`p-2 rounded-full ${
              isPlaying ? 'bg-primary-100 text-primary-700' : 'bg-neutral-200 text-neutral-600'
            }`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 rounded-full bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
            title="Advanced settings"
          >
            <Sliders className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Volume control */}
      <div className="flex items-center mb-2">
        <Volume1 className="h-4 w-4 text-neutral-500 mr-2" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Advanced controls */}
      {showAdvanced && (
        <div className="space-y-3 mt-3 pt-3 border-t border-neutral-200">
          {/* Voice selection */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Voice Type</label>
            <select
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value as any)}
              className="w-full px-2 py-1 text-sm border border-neutral-300 rounded"
            >
              <option value="feminine">Feminine</option>
              <option value="masculine">Masculine</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          
          {/* Speed control */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Speed: {speed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          {/* Emotion intensity */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Emotion Intensity: {(emotionIntensity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={emotionIntensity}
              onChange={(e) => onEmotionIntensityChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVoiceControls;