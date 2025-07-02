import React from 'react';
import { Zap, Brain, Sparkles, Check } from 'lucide-react';

interface AIModelComparisonProps {
  onSelectModel: (model: 'xai' | 'gemini' | 'groq') => void;
}

const AIModelComparison: React.FC<AIModelComparisonProps> = ({ onSelectModel }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-neutral-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Choose Your AI Model</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* XAI (Grok) */}
        <div className="border border-neutral-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
             onClick={() => onSelectModel('xai')}>
          <div className="flex items-center mb-3">
            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold">Grok</h4>
              <p className="text-xs text-neutral-500">by xAI</p>
            </div>
          </div>
          
          <p className="text-sm text-neutral-600 mb-4">
            Excels at conversational responses and creative content. Great for general questions and roleplay scenarios.
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Witty, personality-rich responses</span>
            </div>
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Excellent for creative scenarios</span>
            </div>
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Up-to-date knowledge</span>
            </div>
          </div>
        </div>
        
        {/* Gemini */}
        <div className="border border-neutral-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
             onClick={() => onSelectModel('gemini')}>
          <div className="flex items-center mb-3">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold">Gemini</h4>
              <p className="text-xs text-neutral-500">by Google</p>
            </div>
          </div>
          
          <p className="text-sm text-neutral-600 mb-4">
            Multimodal capabilities for analyzing images and long-form content. Ideal for detailed explanations.
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Image understanding & analysis</span>
            </div>
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Handles long, complex content</span>
            </div>
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Detailed, nuanced responses</span>
            </div>
          </div>
        </div>
        
        {/* Groq (Mistral) */}
        <div className="border border-neutral-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
             onClick={() => onSelectModel('groq')}>
          <div className="flex items-center mb-3">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold">Mistral</h4>
              <p className="text-xs text-neutral-500">via Groq</p>
            </div>
          </div>
          
          <p className="text-sm text-neutral-600 mb-4">
            Ultra-fast responses with excellent code generation. Perfect for technical questions and quick answers.
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Lightning-fast responses</span>
            </div>
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Superior code generation</span>
            </div>
            <div className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>Precise, concise answers</span>
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-neutral-500 text-center mt-4">
        The AI will automatically select the best model for your query, but you can set a preference.
      </p>
    </div>
  );
};

export default AIModelComparison;