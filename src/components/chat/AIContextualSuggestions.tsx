import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Zap, Brain, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface AIContextualSuggestionsProps {
  communityId: string;
  messageContent: string;
  onSuggestionSelect: (suggestion: string) => void;
}

const AIContextualSuggestions: React.FC<AIContextualSuggestionsProps> = ({
  communityId,
  messageContent,
  onSuggestionSelect
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Array<{
    text: string;
    confidence: number;
    id: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  // Generate contextual suggestions based on message content
  const generateSuggestions = async () => {
    // Skip if no content or content hasn't changed
    if (!messageContent || messageContent === lastContentRef.current) return;
    
    // Update last content
    lastContentRef.current = messageContent;
    
    try {
      setLoading(true);
      
      // In a real implementation, this would call the AI API
      // For now, we'll use a simple keyword-based approach
      
      const lowerContent = messageContent.toLowerCase();
      const contextualSuggestions: string[] = [];
      
      // Check for keywords and generate relevant suggestions
      if (lowerContent.includes('yoga')) {
        contextualSuggestions.push(
          "Have you tried any specific yoga styles?",
          "What benefits have you noticed from your yoga practice?",
          "Do you prefer morning or evening yoga sessions?"
        );
      } else if (lowerContent.includes('run') || lowerContent.includes('running')) {
        contextualSuggestions.push(
          "What's your typical running distance?",
          "Do you prefer trail running or road running?",
          "Have you participated in any races recently?"
        );
      } else if (lowerContent.includes('food') || lowerContent.includes('nutrition') || lowerContent.includes('diet')) {
        contextualSuggestions.push(
          "What's your approach to meal planning?",
          "Do you follow any specific dietary guidelines?",
          "What's your favorite healthy recipe?"
        );
      } else if (lowerContent.includes('workout') || lowerContent.includes('exercise')) {
        contextualSuggestions.push(
          "What's your favorite type of workout?",
          "How do you track your fitness progress?",
          "What's your fitness goal right now?"
        );
      } else if (lowerContent.includes('motivation') || lowerContent.includes('inspired')) {
        contextualSuggestions.push(
          "What keeps you motivated on tough days?",
          "Do you have any fitness role models?",
          "How do you celebrate your fitness achievements?"
        );
      } else if (lowerContent.includes('goal') || lowerContent.includes('target')) {
        contextualSuggestions.push(
          "How do you set your fitness goals?",
          "What's your current fitness goal?",
          "How do you track progress toward your goals?"
        );
      } else {
        // Generic suggestions if no specific keywords are found
        contextualSuggestions.push(
          "Could you share more about that?",
          "That's interesting! Have you always felt that way?",
          "How has that impacted your fitness journey?"
        );
      }
      
      // Format suggestions with IDs
      const formattedSuggestions = contextualSuggestions.map(text => ({
        text,
        confidence: 0.9,
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error generating contextual suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update suggestions with debounce
  const updateSuggestionsWithDebounce = () => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer for 1 second
    debounceTimerRef.current = setTimeout(() => {
      generateSuggestions();
    }, 1000); // 1-second debounce
  };

  // Handle suggestion selection
  const handleSuggestionClick = async (suggestion: any) => {
    try {
      // Log the suggestion usage
      if (user) {
        await supabase
          .from('ai_suggestion_history')
          .insert({
            user_id: user.id,
            community_id: communityId,
            query: 'contextual_suggestion',
            suggestion: suggestion.text,
            was_used: true
          });
      }
      
      // Call the parent callback
      onSuggestionSelect(suggestion.text);
    } catch (error) {
      console.error('Error logging suggestion usage:', error);
      // Still call the callback even if logging fails
      onSuggestionSelect(suggestion.text);
    }
  };

  // Handle feedback on suggestions
  const handleFeedback = async (suggestionId: string, isPositive: boolean) => {
    setFeedbackGiven({
      ...feedbackGiven,
      [suggestionId]: isPositive ? 'positive' : 'negative'
    });
    
    // Log feedback
    if (user) {
      try {
        await supabase
          .from('ai_interactions')
          .insert({
            user_id: user.id,
            interaction_type: 'feedback',
            content: suggestions.find(s => s.id === suggestionId)?.text || '',
            result: { suggestionId },
            feedback: isPositive ? 'positive' : 'negative',
            created_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error logging feedback:', error);
      }
    }
  };

  // Update suggestions when message content changes
  useEffect(() => {
    if (messageContent) {
      updateSuggestionsWithDebounce();
    }
    
    // Clean up on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [messageContent]);

  // Don't show if no content or suggestions
  if (!messageContent || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <AnimatePresence>
        {loading ? (
          <motion.div 
            className="flex items-center space-x-2 text-xs text-neutral-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Brain className="h-3 w-3 animate-pulse" />
            <span>Thinking of suggestions...</span>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center mb-1">
              <Sparkles className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">Suggested replies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="relative group">
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm transition-colors"
                  >
                    {suggestion.text}
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
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIContextualSuggestions;