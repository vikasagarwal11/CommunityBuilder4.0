import React, { useState, useEffect, useRef } from 'react';
import { Zap, MessageSquare, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface SimplifiedAIRecommendationsProps {
  communityId: string;
  recentMessages?: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  onSuggestionSelect: (suggestion: string) => void;
}

const SimplifiedAIRecommendations: React.FC<SimplifiedAIRecommendationsProps> = ({ 
  communityId,
  recentMessages = [],
  onSuggestionSelect 
}) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ bio: string } | null>(null);
  const [communityInfo, setCommunityInfo] = useState<any>(null);
  const [showMore, setShowMore] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('bio')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchCommunityInfo = async () => {
    if (!communityId) return;
    
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();
      
      if (error) {
        console.error('Error fetching community info:', error);
        return;
      }
      
      setCommunityInfo(data);
    } catch (error) {
      console.error('Error fetching community info:', error);
    }
  };

  // Mock AI API to generate suggestions based on bio
  const mockAIApi = (bio: string): string[] => {
    const suggestions: string[] = [];
    const lowerCaseBio = bio.toLowerCase();
    
    if (lowerCaseBio.includes('yoga')) {
      suggestions.push("What's your favorite yoga pose?", "Have you tried a yoga retreat?");
    }
    if (lowerCaseBio.includes('nutrition')) {
      suggestions.push("Share your favorite healthy recipe!", "Any nutrition tips for beginners?");
    }
    if (lowerCaseBio.includes('running')) {
      suggestions.push("What's your best running route?", "Do you join running groups?");
    }
    
    return suggestions.length > 0 ? suggestions : ["What are your fitness interests today?"];
  };

  const generateContextAwareSuggestions = (baseSuggestions: string[]) => {
    const shuffled = [...baseSuggestions].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 8));
  };

  const handleSuggestionClick = async (suggestion: string) => {
    try {
      if (user) {
        await supabase
          .from('ai_suggestion_history')
          .insert({
            user_id: user.id,
            community_id: communityId,
            query: 'suggestion_click',
            suggestion: suggestion,
            was_used: true
          });
      }
      
      onSuggestionSelect(suggestion);
    } catch (error) {
      console.error('Error logging suggestion usage:', error);
      onSuggestionSelect(suggestion);
    }
  };

  const updateSuggestionsWithDebounce = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (recentMessages && recentMessages.length > 0) {
        const latestMessageTimestamp = recentMessages[recentMessages.length - 1]?.created_at;
        if (latestMessageTimestamp !== lastMessageTimestampRef.current) {
          lastMessageTimestampRef.current = latestMessageTimestamp;
          generateNewSuggestions();
        }
      }
    }, 5000);
  };

  const generateNewSuggestions = async () => {
    setLoading(true);
    
    try {
      const contextSuggestions: string[] = [];
      if (recentMessages && recentMessages.length > 0) {
        const latestMessage = recentMessages[recentMessages.length - 1];
        const lowerCaseContent = latestMessage.content.toLowerCase();
        
        if (lowerCaseContent.includes('yoga')) {
          contextSuggestions.push("What's your favorite yoga pose?", "How often do you practice yoga?");
        } else if (lowerCaseContent.includes('run') || lowerCaseContent.includes('running')) {
          contextSuggestions.push("What's your favorite running route?", "Do you use any running apps?");
        } else if (lowerCaseContent.includes('food') || lowerCaseContent.includes('nutrition')) {
          contextSuggestions.push("What's your go-to healthy snack?", "How do you meal prep?");
        }
      }

      // Integrate bio into suggestions via mock AI
      const bioSuggestions = userProfile?.bio ? mockAIApi(userProfile.bio) : [];
      const allSuggestions = [...contextSuggestions, ...bioSuggestions];

      generateContextAwareSuggestions(allSuggestions.length > 0 ? allSuggestions : ["What are your interests today?"]);
    } catch (error) {
      console.error('Error generating new suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchCommunityInfo();
    }

    const subscription = supabase
      .channel(`community_${communityId}_messages`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'community_posts', filter: `community_id=eq.${communityId}` },
        () => updateSuggestionsWithDebounce()
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user, communityId]);

  useEffect(() => {
    if (recentMessages && recentMessages.length > 0) {
      updateSuggestionsWithDebounce();
    }
  }, [recentMessages]);

  return (
    <div className="p-3 border-t border-neutral-200 bg-gradient-to-r from-amber-50 to-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Sparkles className="h-4 w-4 text-amber-500 mr-2" />
          <p className="text-xs font-medium text-neutral-700">Message suggestions</p>
        </div>
        <button 
          onClick={() => setShowMore(!showMore)}
          className="text-xs text-amber-600 hover:text-amber-700 flex items-center"
        >
          {showMore ? 'Less' : 'More'} <ChevronRight className="h-3 w-3 ml-1" />
        </button>
      </div>
      
      <div className="relative">
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {loading ? (
            Array(3).fill(0).map((_, index) => (
              <div 
                key={`skeleton-${index}`}
                className="flex-shrink-0 w-[250px] h-[52px] bg-white rounded-xl border border-amber-100 animate-pulse"
              />
            ))
          ) : (
            suggestions.slice(0, showMore ? suggestions.length : 3).map((suggestion, index) => (
              <motion.button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="flex-shrink-0 max-w-[250px] flex items-center p-3 bg-white hover:bg-amber-50 rounded-xl text-sm transition-colors border border-amber-100 shadow-sm hover:shadow-md text-left"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <div className="text-amber-500 mr-2 flex-shrink-0">
                  {index % 2 === 0 ? 
                    <MessageSquare className="h-4 w-4" /> : 
                    <Zap className="h-4 w-4" />
                  }
                </div>
                <span className="text-neutral-700 truncate">
                  {suggestion}
                </span>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SimplifiedAIRecommendations;