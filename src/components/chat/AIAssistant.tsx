import React, { useState, useEffect } from 'react';
import { Bot, Lightbulb, BookOpen, Play, Sparkles, X } from 'lucide-react';
import { chatAI, type AIResponse } from '../../lib/ai/chatAI';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AIAssistantProps {
  communityId: string;
  recentMessages: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  onSuggestionClick: (suggestion: string) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  communityId, 
  recentMessages, 
  onSuggestionClick 
}) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    // Show AI assistant when user seems to need help
    const lastMessage = recentMessages[recentMessages.length - 1];
    if (lastMessage && lastMessage.user_id === user?.id) {
      analyzeAndRespond(lastMessage.content);
    }
  }, [recentMessages]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('fitness_goals, children_info')
        .eq('id', user.id)
        .single();

      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const analyzeAndRespond = async (message: string) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Analyze sentiment first
      const sentiment = await chatAI.analyzeMessageSentiment(message);
      
      // Only show AI assistant if user needs support or asks fitness-related questions
      if (sentiment.needsSupport || sentiment.keywords.length > 0) {
        const context = {
          userId: user.id,
          communityId,
          recentMessages: recentMessages.slice(-5), // Last 5 messages for context
          userProfile
        };

        const response = await chatAI.generateResponse(message, context);
        setAiResponse(response);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setAiResponse(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionClick(suggestion);
    setIsVisible(false);
  };

  const getIconForResourceType = (type: string) => {
    switch (type) {
      case 'article':
        return <BookOpen className="h-4 w-4" />;
      case 'video':
        return <Play className="h-4 w-4" />;
      case 'exercise':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  if (!isVisible || !aiResponse) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-lg border border-neutral-200 z-50">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="ml-2">
              <p className="font-medium text-sm">AI Assistant</p>
              <p className="text-xs text-neutral-500">Here to help! 💜</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* AI Response */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
            <p className="text-sm text-neutral-800">{aiResponse.message}</p>
            {aiResponse.confidence && (
              <div className="mt-2 flex items-center">
                <Sparkles className="h-3 w-3 text-purple-500 mr-1" />
                <span className="text-xs text-purple-600">
                  {Math.round(aiResponse.confidence * 100)}% confident
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {aiResponse.suggestions && aiResponse.suggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-neutral-700 mb-2">Quick Actions:</p>
            <div className="space-y-1">
              {aiResponse.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {aiResponse.resources && aiResponse.resources.length > 0 && (
          <div>
            <p className="text-xs font-medium text-neutral-700 mb-2">Helpful Resources:</p>
            <div className="space-y-2">
              {aiResponse.resources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  className="flex items-center p-2 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-sm transition-colors"
                >
                  <div className="text-neutral-500 mr-2">
                    {getIconForResourceType(resource.type)}
                  </div>
                  <span className="text-neutral-800">{resource.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;