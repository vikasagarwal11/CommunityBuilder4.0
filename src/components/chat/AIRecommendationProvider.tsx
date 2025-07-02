import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AIRecommendationContextType {
  suggestions: Array<{
    text: string;
    confidence: number;
    category: string;
    id: string;
  }>;
  loading: boolean;
  refreshSuggestions: () => Promise<void>;
  handleSuggestionUsed: (suggestionId: string, text: string) => Promise<void>;
  handleFeedback: (suggestionId: string, isPositive: boolean) => Promise<void>;
}

const AIRecommendationContext = createContext<AIRecommendationContextType | undefined>(undefined);

export const useAIRecommendations = () => {
  const context = useContext(AIRecommendationContext);
  if (!context) {
    throw new Error('useAIRecommendations must be used within an AIRecommendationProvider');
  }
  return context;
};

interface AIRecommendationProviderProps {
  children: ReactNode;
  communityId: string;
  recentMessages?: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
}

export const AIRecommendationProvider: React.FC<AIRecommendationProviderProps> = ({
  children,
  communityId,
  recentMessages = []
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Array<{
    text: string;
    confidence: number;
    category: string;
    id: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string | null>(null);

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
        confidence: 0.8 + Math.random() * 0.2, // Random confidence between 0.8 and 1.0
        category: getCategoryForSuggestion(text),
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      setSuggestions(selectedSuggestions);
      
      // Update last message timestamp
      if (recentMessages && recentMessages.length > 0) {
        setLastMessageTimestamp(recentMessages[recentMessages.length - 1].created_at);
      }
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

  // Handle suggestion usage
  const handleSuggestionUsed = async (suggestionId: string, text: string) => {
    if (!user) return;
    
    try {
      // Log the suggestion usage
      await supabase
        .from('ai_suggestion_history')
        .insert({
          user_id: user.id,
          community_id: communityId,
          query: 'suggestion_used',
          suggestion: text,
          was_used: true
        });
      
      // Remove the used suggestion from the list
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Error logging suggestion usage:', error);
    }
  };

  // Handle feedback on suggestions
  const handleFeedback = async (suggestionId: string, isPositive: boolean) => {
    if (!user) return;
    
    try {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;
      
      // Log feedback
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: user.id,
          interaction_type: 'feedback',
          content: suggestion.text,
          result: { suggestionId, category: suggestion.category },
          feedback: isPositive ? 'positive' : 'negative',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging feedback:', error);
    }
  };

  // Refresh suggestions
  const refreshSuggestions = async () => {
    await generateSuggestions();
  };

  // Initial load and WebSocket subscription
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
        (payload) => {
          // Check if this is a new message
          const newMessageTimestamp = payload.new.created_at;
          if (newMessageTimestamp !== lastMessageTimestamp) {
            // Wait 5 seconds before refreshing suggestions
            setTimeout(() => {
              generateSuggestions();
            }, 5000);
          }
        }
      )
      .subscribe();
    
    // Clean up on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [communityId, user]);

  // Update suggestions when recentMessages changes significantly
  useEffect(() => {
    if (recentMessages && recentMessages.length > 0) {
      const latestMessageTimestamp = recentMessages[recentMessages.length - 1].created_at;
      if (latestMessageTimestamp !== lastMessageTimestamp) {
        generateSuggestions();
      }
    }
  }, [recentMessages]);

  const value = {
    suggestions,
    loading,
    refreshSuggestions,
    handleSuggestionUsed,
    handleFeedback
  };

  return (
    <AIRecommendationContext.Provider value={value}>
      {children}
    </AIRecommendationContext.Provider>
  );
};

export default AIRecommendationProvider;