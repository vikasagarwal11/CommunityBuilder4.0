import React, { useState, useEffect, useRef } from 'react';
import { Zap, MessageSquare, Sparkles, ChevronRight, ChevronLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import AIContextualSuggestions from './AIContextualSuggestions';
import SimplifiedAIRecommendations from './SimplifiedAIRecommendations';

interface AIRealtimeRecommendationsProps {
  communityId: string;
  recentMessages: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    engagement_level?: number;
  }>;
  currentMessage: string;
  onSuggestionSelect: (suggestion: string) => void;
}

const AIRealtimeRecommendations: React.FC<AIRealtimeRecommendationsProps> = ({
  communityId,
  recentMessages = [],
  currentMessage,
  onSuggestionSelect
}) => {
  const { user } = useAuth();
  const [showContextual, setShowContextual] = useState(false);
  const [lastAnalyzedMessage, setLastAnalyzedMessage] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [communityTopics, setCommunityTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highEngagementMessages, setHighEngagementMessages] = useState<any[]>([]);

  // Fetch community topics from AI profile
  useEffect(() => {
    const fetchCommunityTopics = async () => {
      if (!communityId) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('ai_community_profiles')
          .select('common_topics')
          .eq('community_id', communityId)
          .limit(1)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching community AI profile:', error);
          return;
        }
        
        if (data && data.common_topics) {
          setCommunityTopics(data.common_topics);
          console.log('Community topics loaded:', data.common_topics);
        }
      } catch (error) {
        console.error('Error fetching community topics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCommunityTopics();
  }, [communityId]);

  // Fetch high engagement messages
  useEffect(() => {
    const fetchHighEngagementMessages = async () => {
      if (!communityId) return;
      
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('id, content, engagement_level, created_at')
          .eq('community_id', communityId)
          .gt('engagement_level', 2) // Only get messages with significant engagement
          .order('engagement_level', { ascending: false })
          .limit(5);
          
        if (error) {
          console.error('Error fetching high engagement messages:', error);
          return;
        }
        
        setHighEngagementMessages(data || []);
      } catch (error) {
        console.error('Error fetching high engagement messages:', error);
      }
    };
    
    fetchHighEngagementMessages();
    
    // Set up subscription to listen for engagement level changes
    const subscription = supabase
      .channel(`community_posts_${communityId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'community_posts',
          filter: `community_id=eq.${communityId}`
        }, 
        (payload) => {
          // If engagement level changed significantly, refresh high engagement messages
          if (payload.new.engagement_level > 2 && 
              (!payload.old.engagement_level || 
               payload.new.engagement_level > payload.old.engagement_level)) {
            fetchHighEngagementMessages();
          }
        }
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [communityId]);

  // Check if we should show contextual suggestions
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only analyze if the message has changed and is not empty
    if (currentMessage && currentMessage !== lastAnalyzedMessage) {
      // Set a new timer for 1 second
      debounceTimerRef.current = setTimeout(() => {
        // Simple heuristic: show contextual suggestions if the message is at least 10 characters
        // and contains a keyword that might benefit from suggestions
        const shouldShowContextual = currentMessage.length >= 10 && 
          (currentMessage.includes('?') || 
           containsKeyword(currentMessage, communityTopics));
        
        setShowContextual(shouldShowContextual);
        setLastAnalyzedMessage(currentMessage);
      }, 1000); // 1-second debounce
    } else if (!currentMessage) {
      setShowContextual(false);
    }
    
    // Clean up on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentMessage, communityTopics]);

  // Check if message contains keywords that might benefit from suggestions
  const containsKeyword = (message: string, topics: string[]): boolean => {
    // Default keywords for any community
    const defaultKeywords = [
      'advice', 'recommend', 'suggestion', 'help', 'need',
      'question', 'how', 'what', 'when', 'where', 'why'
    ];
    
    // Add community-specific topics to keywords
    const allKeywords = [...defaultKeywords, ...topics.map(t => t.toLowerCase())];
    
    const lowerMessage = message.toLowerCase();
    return allKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Set up WebSocket subscription for real-time updates
  useEffect(() => {
    if (!communityId) return;
    
    console.log(`Setting up WebSocket subscription for community: ${communityId}`);
    
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
          console.log('New message received via WebSocket:', payload);
          console.log('Community ID:', communityId);
        }
      )
      .subscribe();
    
    // Clean up on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [communityId]);

  return (
    <div>
      {/* Contextual suggestions based on current message input */}
      <AnimatePresence>
        {showContextual && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <AIContextualSuggestions
              communityId={communityId}
              messageContent={currentMessage}
              onSuggestionSelect={onSuggestionSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* High engagement message suggestions */}
      {highEngagementMessages.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center mb-1">
            <Zap className="h-3 w-3 text-amber-500 mr-1" />
            <span className="text-xs text-amber-600">Popular topics in this community</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {highEngagementMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => onSuggestionSelect(`I'd like to discuss: "${message.content.substring(0, 50)}..."`)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm transition-colors"
              >
                {message.content.length > 50 
                  ? `${message.content.substring(0, 50)}...` 
                  : message.content}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* General recommendations based on recent messages */}
      <SimplifiedAIRecommendations
        communityId={communityId}
        recentMessages={recentMessages}
        onSuggestionSelect={onSuggestionSelect}
      />
    </div>
  );
};

export default AIRealtimeRecommendations;