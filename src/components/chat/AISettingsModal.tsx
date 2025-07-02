import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Brain, Heart, Volume2, Shield, Settings, X, Zap, Sparkles } from 'lucide-react';

interface AISettingsModalProps {
  chatOptions: {
    preferredModel: 'xai' | 'gemini' | 'groq';
    moodSync: {
      enabled: boolean;
      adaptToSentiment: boolean;
      personalityType: 'empathetic' | 'motivational' | 'analytical' | 'supportive';
    };
    memoryEcho: {
      enabled: boolean;
      depth: number;
      includeUserProfile: boolean;
    };
    holoVoice: {
      enabled: boolean;
      voice: 'feminine' | 'masculine' | 'neutral';
      emotionIntensity: number;
      speed: number;
    };
    moderationEnabled: boolean;
    temperature: number;
  };
  onClose: () => void;
  onModelChange: (model: 'xai' | 'gemini' | 'groq') => void;
  onMoodSyncToggle: () => void;
  onMemoryEchoToggle: () => void;
  onHoloVoiceToggle: () => void;
  onPersonalityChange: (personality: 'empathetic' | 'motivational' | 'analytical' | 'supportive') => void;
  onVoiceChange: (voice: 'feminine' | 'masculine' | 'neutral') => void;
  onTemperatureChange: (value: number) => void;
  onMemoryDepthChange: (value: number) => void;
  onModerationToggle: () => void;
}

const AISettingsModal: React.FC<AISettingsModalProps> = ({
  chatOptions,
  onClose,
  onModelChange,
  onMoodSyncToggle,
  onMemoryEchoToggle,
  onHoloVoiceToggle,
  onPersonalityChange,
  onVoiceChange,
  onTemperatureChange,
  onMemoryDepthChange,
  onModerationToggle,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div 
        className="bg-white rounded-xl max-w-md w-full p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">AI Assistant Settings</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-6 max-h-[70vh] overflow-y-auto"> {/* Added max-height and scrollbar */}
          {/* Model Selection */}
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              Preferred AI Model
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onModelChange('xai')}
                className={`p-3 rounded-lg flex flex-col items-center ${
                  chatOptions.preferredModel === 'xai'
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <Zap className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Grok</span>
                <span className="text-xs">Conversation</span>
              </button>
              <button
                onClick={() => onModelChange('gemini')}
                className={`p-3 rounded-lg flex flex-col items-center ${
                  chatOptions.preferredModel === 'gemini'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <Brain className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Gemini</span>
                <span className="text-xs">Multimodal</span>
              </button>
              <button
                onClick={() => onModelChange('groq')}
                className={`p-3 rounded-lg flex flex-col items-center ${
                  chatOptions.preferredModel === 'groq'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <Sparkles className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">Mistral</span>
                <span className="text-xs">Fast & Precise</span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              The AI will automatically select the best model for your query, but you can set a preference.
            </p>
          </div>
          
          {/* Feature Toggles */}
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Features
            </h4>
            
            <div className="space-y-3">
              {/* MoodSync */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 text-red-500 mr-2" />
                    <span className="font-medium">MoodSync</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Adapts responses based on your detected mood
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatOptions.moodSync.enabled}
                    onChange={onMoodSyncToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>
              
              {/* Memory Echo */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <div className="flex items-center">
                    <Brain className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="font-medium">Memory Echo</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Remembers conversation context across sessions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatOptions.memoryEcho.enabled}
                    onChange={onMemoryEchoToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>
              
              {/* HoloVoice */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <div className="flex items-center">
                    <Volume2 className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="font-medium">HoloVoice</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Enables voice responses with tone modulation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatOptions.holoVoice.enabled}
                    onChange={onHoloVoiceToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>
              
              {/* Content Moderation */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div>
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 text-green-500 mr-2" />
                    <span className="font-medium">Content Moderation</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Ensures all content follows community guidelines
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatOptions.moderationEnabled}
                    onChange={onModerationToggle}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>
            </div>
          </div>
          
          {/* Advanced Settings */}
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Settings
            </h4>
            
            <div className="space-y-3">
              {/* Personality Type */}
              <div>
                <label className="block text-sm mb-1">Personality Type</label>
                <select
                  value={chatOptions.moodSync.personalityType}
                  onChange={(e) => onPersonalityChange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                  disabled={!chatOptions.moodSync.enabled}
                >
                  <option value="supportive">Supportive</option>
                  <option value="empathetic">Empathetic</option>
                  <option value="motivational">Motivational</option>
                  <option value="analytical">Analytical</option>
                </select>
              </div>
              
              {/* Voice Type */}
              <div>
                <label className="block text-sm mb-1">Voice Type</label>
                <select
                  value={chatOptions.holoVoice.voice}
                  onChange={(e) => onVoiceChange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                  disabled={!chatOptions.holoVoice.enabled}
                >
                  <option value="feminine">Feminine</option>
                  <option value="masculine">Masculine</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              
              {/* Creativity (Temperature) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Creativity: {chatOptions.temperature.toFixed(1)}</label>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={chatOptions.temperature}
                  onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
              
              {/* Memory Depth */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Memory Depth: {chatOptions.memoryEcho.depth}</label>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={chatOptions.memoryEcho.depth}
                  onChange={(e) => onMemoryDepthChange(parseInt(e.target.value))}
                  className="w-full"
                  disabled={!chatOptions.memoryEcho.enabled}
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Short-term</span>
                  <span>Long-term</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Save Settings
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AISettingsModal;