import React, { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIRecommendations } from './AIRecommendationProvider';
import AIRecommendationCarousel from './AIRecommendationCarousel';
import SimplifiedAIRecommendations from './SimplifiedAIRecommendations';

interface AIRecommendationSystemProps {
  communityId: string;
  recentMessages: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  onSuggestionSelect: (suggestion: string) => void;
}

const AIRecommendationSystem: React.FC<AIRecommendationSystemProps> = ({
  communityId,
  recentMessages,
  onSuggestionSelect
}) => {
  const [displayMode, setDisplayMode] = useState<'simple' | 'carousel'>('simple');
  const [showSettings, setShowSettings] = useState(false);

  const handleModeChange = (mode: 'simple' | 'carousel') => {
    setDisplayMode(mode);
    setShowSettings(false);
  };

  return (
    <div className="border-t border-neutral-200">
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-neutral-50 border-b border-neutral-200"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-primary-500" />
                  AI Recommendation Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Display Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleModeChange('simple')}
                      className={`p-3 rounded-lg border text-center ${
                        displayMode === 'simple'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">Simple List</p>
                      <p className="text-xs text-neutral-500">Horizontal scrolling list</p>
                    </button>
                    
                    <button
                      onClick={() => handleModeChange('carousel')}
                      className={`p-3 rounded-lg border text-center ${
                        displayMode === 'carousel'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-medium">Carousel</p>
                      <p className="text-xs text-neutral-500">Card-based carousel</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Recommendations Display */}
      <div className="relative">
        {displayMode === 'simple' ? (
          <SimplifiedAIRecommendations
            communityId={communityId}
            recentMessages={recentMessages}
            onSuggestionSelect={onSuggestionSelect}
          />
        ) : (
          <AIRecommendationCarousel
            communityId={communityId}
            recentMessages={recentMessages}
            onSuggestionSelect={onSuggestionSelect}
          />
        )}
        
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100"
          title="Recommendation settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AIRecommendationSystem;