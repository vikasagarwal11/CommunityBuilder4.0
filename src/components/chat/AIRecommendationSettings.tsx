import React, { useState } from 'react';
import { Settings, Sparkles, Brain, Zap, X, Check, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIRecommendationSettingsProps {
  settings: {
    enabled: boolean;
    displayMode: 'simple' | 'carousel';
    updateFrequency: 'realtime' | 'manual';
    showContextual: boolean;
    showFeedback: boolean;
    maxSuggestions: number;
  };
  onSettingsChange: (newSettings: any) => void;
  onClose: () => void;
}

const AIRecommendationSettings: React.FC<AIRecommendationSettingsProps> = ({
  settings,
  onSettingsChange,
  onClose
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl max-w-md w-full p-6"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary-500" />
            AI Recommendation Settings
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Enable Recommendations</h4>
              <p className="text-sm text-neutral-500">Show AI-powered message suggestions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
          
          {/* Display Mode */}
          <div>
            <h4 className="font-medium mb-3">Display Mode</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleChange('displayMode', 'simple')}
                className={`p-3 rounded-lg border text-center ${
                  localSettings.displayMode === 'simple'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <Zap className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Simple List</p>
                <p className="text-xs text-neutral-500">Horizontal scrolling list</p>
              </button>
              
              <button
                onClick={() => handleChange('displayMode', 'carousel')}
                className={`p-3 rounded-lg border text-center ${
                  localSettings.displayMode === 'carousel'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <Brain className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Carousel</p>
                <p className="text-xs text-neutral-500">Card-based carousel</p>
              </button>
            </div>
          </div>
          
          {/* Update Frequency */}
          <div>
            <h4 className="font-medium mb-3">Update Frequency</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={localSettings.updateFrequency === 'realtime'}
                  onChange={() => handleChange('updateFrequency', 'realtime')}
                  className="h-4 w-4 text-primary-500 focus:ring-primary-500 mr-2"
                />
                <div>
                  <p className="text-sm font-medium">Real-time</p>
                  <p className="text-xs text-neutral-500">Update automatically as new messages arrive</p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={localSettings.updateFrequency === 'manual'}
                  onChange={() => handleChange('updateFrequency', 'manual')}
                  className="h-4 w-4 text-primary-500 focus:ring-primary-500 mr-2"
                />
                <div>
                  <p className="text-sm font-medium">Manual</p>
                  <p className="text-xs text-neutral-500">Only update when you request new suggestions</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Additional Options */}
          <div>
            <h4 className="font-medium mb-3">Additional Options</h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div className="text-sm">Show contextual suggestions</div>
                <input
                  type="checkbox"
                  checked={localSettings.showContextual}
                  onChange={(e) => handleChange('showContextual', e.target.checked)}
                  className="h-4 w-4 text-primary-500 focus:ring-primary-500 rounded"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <div className="text-sm">Show feedback buttons</div>
                <input
                  type="checkbox"
                  checked={localSettings.showFeedback}
                  onChange={(e) => handleChange('showFeedback', e.target.checked)}
                  className="h-4 w-4 text-primary-500 focus:ring-primary-500 rounded"
                />
              </label>
              
              <div>
                <label className="text-sm mb-1 block">Maximum suggestions</label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={localSettings.maxSuggestions}
                    onChange={(e) => handleChange('maxSuggestions', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="ml-2 text-sm">{localSettings.maxSuggestions}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
            >
              <Check className="h-4 w-4 mr-2" />
              Save Settings
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AIRecommendationSettings;