import React, { useState, useRef, useEffect } from 'react';
import { Zap, MessageSquare, Sparkles, ChevronRight, ChevronLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface AIRecommendationCarouselProps {
  communityId: string;
  recentMessages: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  onSuggestionSelect: (suggestion: string) => void;
}

const AIRecommendationCarousel: React.FC<AIRecommendationCarouselProps> = ({ 
  communityId, 
  recentMessages = [],
  onSuggestionSelect 
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Array<{
    text: string;
    category: string;
    id: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});
  const carouselRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);

  // Generate suggestions based on context
  const generateSuggestions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // In a real implementation, this would call the AI API
      // For now, we'll use a mix of pre-generated suggestions and context-aware ones
      
      // Base suggestions
      const baseSuggestions = [
        "How's everyone's workout going today?",
        "What's your favorite post-workout meal for energy?",
        "Any tips for fitting in exercise with a busy schedule?",
        "I just completed a 30-minute workout! Feeling great!",
        "Looking for recommendations for beginner-friendly yoga routines",
        "What's your go-to exercise when you only have 15 minutes?",
        "How do you stay motivated on days when you don't feel like working out?",
        "Anyone have experience with postpartum fitness routines?",
        "What's been your biggest fitness achievement this month?",
        "Favorite workout playlist recommendations?",
        "How do you balance strength training and cardio?",
        "Any meal prep tips for busy moms?",
        "What time of day do you prefer to exercise?",
        "Looking for accountability partners for daily workouts!",
        "What's your favorite way to recover after an intense workout?"
      ];
      
      // Context-aware suggestions based on recent messages
      const contextSuggestions: string[] = [];
      
      if (recentMessages && recentMessages.length > 0) {
        // Get the latest message
        const latestMessage = recentMessages[recentMessages.length - 1];
        
        // Simple keyword-based suggestion generation
        const lowerCaseContent = latestMessage.content.toLowerCase();
        
        if (lowerCaseContent.includes('yoga')) {
          contextSuggestions.push(
            "What's your favorite yoga pose?",
            "How often do you practice yoga?",
            "Have you tried any online yoga classes?"
          );
        } else if (lowerCaseContent.includes('run') || lowerCaseContent.includes('running')) {
          contextSuggestions.push(
            "What's your favorite running route?",
            "Do you use any apps to track your runs?",
            "What running shoes do you recommend?"
          );
        } else if (lowerCaseContent.includes('food') || lowerCaseContent.includes('nutrition') || lowerCaseContent.includes('diet')) {
          contextSuggestions.push(
            "What's your go-to healthy snack?",
            "How do you meal prep for the week?",
            "Any favorite protein-rich recipes to share?"
          );
        } else if (lowerCaseContent.includes('workout') || lowerCaseContent.includes('exercise')) {
          contextSuggestions.push(
            "What's your current workout routine?",
            "How many days a week do you exercise?",
            "What's your favorite muscle group to train?"
          );
        }
      }
      
      // Combine base and context suggestions
      const allSuggestions = [...contextSuggestions, ...baseSuggestions];
      
      // Shuffle and select a subset of suggestions
      const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
      const selectedSuggestions = shuffled.slice(0, 8).map(text => ({
        text,
        category: getCategoryForSuggestion(text),
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      setSuggestions(selectedSuggestions);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine category based on suggestion content
  const getCategoryForSuggestion = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('?')) {
      return 'question';
    } else if (lowerText.includes('recommend') || lowerText.includes('suggestion') || lowerText.includes('advice')) {
      return 'advice';
    } else if (lowerText.includes('looking for') || lowerText.includes('need')) {
      return 'request';
    } else if (lowerText.includes('completed') || lowerText.includes('did') || lowerText.includes('finished')) {
      return 'achievement';
    } else {
      return 'general';
    }
  };

  // Get icon based on category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'question':
        return <MessageSquare className="h-4 w-4" />;
      case 'advice':
        return <Sparkles className="h-4 w-4" />;
      case 'request':
        return <MessageSquare className="h-4 w-4" />;
      case 'achievement':
        return <Zap className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
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
            query: 'suggestion_click',
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

  // Navigate carousel
  const navigateCarousel = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, Math.ceil(suggestions.length / 3)));
    } else {
      setCurrentIndex(prev => (prev - 1 + Math.ceil(suggestions.length / 3)) % Math.max(1, Math.ceil(suggestions.length / 3)));
    }
  };

  // Function to update suggestions based on new messages with debounce
  const updateSuggestionsWithDebounce = () => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer for 5 seconds
    debounceTimerRef.current = setTimeout(() => {
      // Check if there are new messages to analyze
      if (recentMessages && recentMessages.length > 0) {
        const latestMessageTimestamp = recentMessages[recentMessages.length - 1]?.created_at;
        
        // Only update if we have a new message
        if (latestMessageTimestamp !== lastMessageTimestampRef.current) {
          lastMessageTimestampRef.current = latestMessageTimestamp;
          
          // Generate new suggestions
          generateSuggestions();
        }
      }
    }, 5000); // 5-second debounce
  };

  // Initial load
  useEffect(() => {
    generateSuggestions();
    
    // Set up WebSocket subscription for real-time updates
    const subscription = supabase
      .channel(`community_${communityId}_messages`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'community_posts',
          filter: `community_id=eq.${communityId}`
        }, 
        () => {
          // When a new message is received, update suggestions with debounce
          updateSuggestionsWithDebounce();
        }
      )
      .subscribe();
    
    // Clean up on unmount
    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [communityId, user]);

  // Update suggestions when recentMessages changes
  useEffect(() => {
    if (recentMessages && recentMessages.length > 0) {
      updateSuggestionsWithDebounce();
    }
  }, [recentMessages]);

  // Calculate visible suggestions
  const visibleSuggestions = suggestions.slice(currentIndex * 3, (currentIndex * 3) + 3);
  const totalPages = Math.max(1, Math.ceil(suggestions.length / 3));

  return (
    <div className="p-3 border-t border-neutral-200 bg-gradient-to-r from-amber-50 to-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Sparkles className="h-4 w-4 text-amber-500 mr-2" />
          <p className="text-xs font-medium text-neutral-700">Message suggestions</p>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigateCarousel('prev')}
              className="p-1 rounded-full bg-white text-amber-600 hover:bg-amber-100 border border-amber-200"
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-xs text-neutral-500">
              {currentIndex + 1}/{totalPages}
            </span>
            <button 
              onClick={() => navigateCarousel('next')}
              className="p-1 rounded-full bg-white text-amber-600 hover:bg-amber-100 border border-amber-200"
              disabled={currentIndex === totalPages - 1}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      
      <div className="relative" ref={carouselRef}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
              // Loading state with skeleton cards
              Array(3).fill(0).map((_, index) => (
                <div 
                  key={`skeleton-${index}`}
                  className="h-[80px] bg-white rounded-xl border border-amber-100 animate-pulse"
                />
              ))
            ) : (
              visibleSuggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  className="relative group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex flex-col p-3 bg-white hover:bg-amber-50 rounded-xl text-sm transition-colors border border-amber-100 shadow-sm hover:shadow-md text-left h-full"
                  >
                    <div className="flex items-center mb-1">
                      <div className="text-amber-500 mr-2 flex-shrink-0">
                        {getCategoryIcon(suggestion.category)}
                      </div>
                      <span className="text-xs text-amber-700 capitalize">
                        {suggestion.category}
                      </span>
                    </div>
                    <p className="text-neutral-700 line-clamp-2">
                      {suggestion.text}
                    </p>
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
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIRecommendationCarousel;