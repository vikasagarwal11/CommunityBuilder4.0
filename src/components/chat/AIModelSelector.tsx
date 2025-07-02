import React from 'react';
import { Zap, Brain, Sparkles } from 'lucide-react';

interface AIModelSelectorProps {
  selectedModel: 'xai' | 'gemini' | 'groq';
  onModelChange: (model: 'xai' | 'gemini' | 'groq') => void;
}

const AIModelSelector: React.FC<AIModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange 
}) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <button
        onClick={() => onModelChange('xai')}
        className={`px-3 py-1 rounded-full text-xs flex items-center ${
          selectedModel === 'xai'
            ? 'bg-purple-100 text-purple-700 border border-purple-200'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        }`}
      >
        <Zap className="h-3 w-3 mr-1" />
        Grok
      </button>
      <button
        onClick={() => onModelChange('gemini')}
        className={`px-3 py-1 rounded-full text-xs flex items-center ${
          selectedModel === 'gemini'
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        }`}
      >
        <Brain className="h-3 w-3 mr-1" />
        Gemini
      </button>
      <button
        onClick={() => onModelChange('groq')}
        className={`px-3 py-1 rounded-full text-xs flex items-center ${
          selectedModel === 'groq'
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        }`}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Mistral
      </button>
    </div>
  );
};

export default AIModelSelector;