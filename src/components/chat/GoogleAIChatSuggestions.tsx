import React, { useState, useEffect } from 'react';
import { Zap, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, Target, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { googleAI } from '../../lib/ai/googleAI';
import { motion } from 'framer-motion';

interface GoogleAIChatSuggestionsProps {
  communityId: string;
  recentMessages: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  onSuggestionSelect: (suggestion: string) => void;
}

const GoogleAIChatSuggestions: React.FC<GoogleAIChatSuggestionsProps> = ({ 
  communityId, 
  recentMessages, 
  onSuggestionSelect 
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Array<{
    text: string;
    confidence: number;
    category: string;
    id: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});
  const [communityInfo, setCommunityInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchCommunityInfo();
  }, [user, communityId]);

  useEffect(() => {
    if (userProfile && communityInfo) {
      generateSuggestions();
    }
  }, [userProfile, communityInfo, recentMessages]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('interests, custom_interests, experience_level, fitness_goals')
        .eq('id', user.id)
        .single();

      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchCommunityInfo = async () => {
    try {
      const { data } = await supabase
        .from('communities')
        .select('name, description, tags')
        .eq('id', communityId)
        .single();
        
      setCommunityInfo(data);
    } catch (error) {
      console.error('Error fetching community info:', error);
    }
  };

  const generateSuggestions = async () => {
    try {
      setLoading(true);
      
      // Create community context string
      const communityContext = communityInfo ? 
        `Community: ${communityInfo.name}. Focus: ${communityInfo.tags?.join(', ') || 'fitness'}. Description: ${communityInfo.description}` : 
        undefined;
      
      // Get AI-generated suggestions
      const aiSuggestions = await googleAI.generateSuggestions(
        userProfile,
        recentMessages.slice(-5).map(m => m.content),
        communityContext
      );
      
      // Transform to our format with IDs
      const formattedSuggestions = aiSuggestions.map(suggestion => ({
        ...suggestion,
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback suggestions
      setSuggestions([
        {
          text: "How's everyone's workout going today?",
          confidence: 0.8,
          category: "question",
          id: `fallback-1-${Date.now()}`
        },
        {
          text: "I just completed a 30-minute HIIT session. Anyone else working out today?",
          confidence: 0.7,
          category: "sharing",
          id: `fallback-2-${Date.now()}`
        },
        {
          text: "What's your favorite post-workout meal for energy recovery?",
          confidence: 0.7,
          category: "question",
          id: `fallback-3-${Date.now()}`
        },
        {
          text: "Looking for recommendations for a good beginner-friendly yoga routine!",
          confidence: 0.6,
          category: "advice",
          id: `fallback-4-${Date.now()}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: any) => {
    onSuggestionSelect(suggestion.text);
    
    // Save suggestion usage
    if (user) {
      await googleAI.saveInteraction(
        user.id,
        'suggestion',
        suggestion.text,
        suggestion,
        'positive'
      );
    }
  };

  const handleFeedback = async (suggestionId: string, isPositive: boolean) => {
    setFeedbackGiven({
      ...feedbackGiven,
      [suggestionId]: isPositive ? 'positive' : 'negative'
    });
    
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion || !user) return;
    
    // Save feedback
    await googleAI.saveInteraction(
      user.id,
      'suggestion',
      suggestion.text,
      suggestion,
      isPositive ? 'positive' : 'negative'
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'question':
        return <MessageSquare className="h-4 w-4" />;
      case 'advice':
        return <Zap className="h-4 w-4" />;
      case 'encouragement':
        return <Heart className="h-4 w-4" />;
      case 'sharing':
        return <Target className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-3 border-t border-neutral-200 bg-neutral-50">
        <div className="flex items-center">
          <Sparkles className="h-4 w-4 text-blue-500 mr-2" />
          <p className="text-xs font-medium text-neutral-600">Generating suggestions...</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((_, index) => (
            <div key={index} className="h-10 bg-neutral-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="p-3 border-t border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Sparkles className="h-4 w-4 text-blue-500 mr-2" />
          <p className="text-xs font-medium text-neutral-600">AI-powered message ideas:</p>
        </div>
        <div className="text-xs text-neutral-400">
          Powered by Google AI
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <button
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full flex items-center p-2 bg-white hover:bg-neutral-100 rounded-lg text-sm transition-colors border border-neutral-200 text-left"
            >
              <div className="text-blue-500 mr-2 flex-shrink-0">
                {getCategoryIcon(suggestion.category)}
              </div>
              <span className="text-neutral-700 truncate">
                {suggestion.text}
              </span>
            </button>
            
            {/* Feedback buttons - appear on hover */}
            {!feedbackGiven[suggestion.id] && (
              <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeedback(suggestion.id, true);
                  }}
                  className="p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                  title="This suggestion is helpful"
                >
                  <ThumbsUp className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeedback(suggestion.id, false);
                  }}
                  className="p-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                  title="This suggestion is not helpful"
                >
                  <ThumbsDown className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {/* Feedback confirmation */}
            {feedbackGiven[suggestion.id] && (
              <div className="absolute -top-2 -right-2 bg-neutral-100 text-neutral-600 rounded-full p-1">
                {feedbackGiven[suggestion.id] === 'positive' ? (
                  <ThumbsUp className="h-3 w-3 text-green-600" />
                ) : (
                  <ThumbsDown className="h-3 w-3 text-red-600" />
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GoogleAIChatSuggestions;