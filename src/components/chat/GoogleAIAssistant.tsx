import React, { useState, useEffect } from 'react';
import { Bot, Lightbulb, BookOpen, Play, Sparkles, X } from 'lucide-react';
import { googleAI } from '../../lib/ai/googleAI';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface GoogleAIAssistantProps {
  communityId: string;
  recentMessages: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  onSuggestionClick: (suggestion: string) => void;
}

const GoogleAIAssistant: React.FC<GoogleAIAssistantProps> = ({ 
  communityId, 
  recentMessages, 
  onSuggestionClick 
}) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [aiResponse, setAiResponse] = useState<{
    message: string;
    suggestions?: string[];
    resources?: Array<{
      title: string;
      url: string;
      type: 'article' | 'video' | 'exercise';
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});

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
        .select('fitness_goals, interests, custom_interests, experience_level')
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
      
      // Analyze message content
      const analysis = await googleAI.analyzeMessage(message);
      
      // Only show AI assistant if message needs support or contains fitness keywords
      if (analysis.sentiment === 'negative' || analysis.keywords.length > 0 || analysis.actionItems.length > 0) {
        // Get community context
        const { data: communityData } = await supabase
          .from('communities')
          .select('name, description, tags')
          .eq('id', communityId)
          .single();
          
        const communityContext = communityData ? 
          `Community: ${communityData.name}. Focus: ${communityData.tags?.join(', ') || 'fitness'}` : 
          undefined;
        
        // Generate personalized suggestions
        const suggestions = await googleAI.generateSuggestions(
          userProfile,
          recentMessages.slice(-5).map(m => m.content),
          communityContext
        );
        
        // Get message insight
        const insight = await googleAI.getMessageInsights(message, {
          userProfile,
          communityContext
        });
        
        setAiResponse({
          message: insight,
          suggestions: suggestions.map(s => s.text),
          resources: getRelevantResources(analysis.topics)
        });
        
        setIsVisible(true);
        
        // Save this interaction for future improvement
        await googleAI.saveInteraction(
          user.id,
          'analysis',
          message,
          { analysis, insight, suggestions }
        );
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelevantResources = (topics: string[]) => {
    const resources: Array<{
      title: string;
      url: string;
      type: 'article' | 'video' | 'exercise';
    }> = [];
    
    // Map topics to relevant resources
    const resourceMap: Record<string, Array<{
      title: string;
      url: string;
      type: 'article' | 'video' | 'exercise';
    }>> = {
      'workout': [
        {
          title: 'Quick 20-Minute Home Workout for Busy Moms',
          url: '/blog/quick-home-workout',
          type: 'article'
        },
        {
          title: 'Full Body Workout for Beginners',
          url: 'https://www.youtube.com/watch?v=UoC_O3HzsH0',
          type: 'video'
        }
      ],
      'nutrition': [
        {
          title: 'Meal Prep Guide for Busy Moms',
          url: '/blog/meal-prep-guide',
          type: 'article'
        },
        {
          title: 'Healthy Snacks for Energy',
          url: '/blog/healthy-snacks',
          type: 'article'
        }
      ],
      'postpartum': [
        {
          title: 'Safe Postpartum Exercise Guidelines',
          url: '/blog/postpartum-exercise-guide',
          type: 'article'
        },
        {
          title: 'Diastasis Recti Recovery Exercises',
          url: '/exercises/diastasis-recti',
          type: 'exercise'
        }
      ],
      'motivation': [
        {
          title: 'Finding Motivation as a Busy Mom',
          url: '/blog/mom-motivation',
          type: 'article'
        },
        {
          title: 'Success Stories: Moms Who Made Time for Fitness',
          url: '/blog/success-stories',
          type: 'article'
        }
      ]
    };
    
    // Add up to 3 relevant resources
    topics.forEach(topic => {
      const lowerTopic = topic.toLowerCase();
      
      // Find matching resources
      for (const [key, value] of Object.entries(resourceMap)) {
        if (lowerTopic.includes(key) || key.includes(lowerTopic)) {
          // Add resources for this topic
          value.forEach(resource => {
            if (resources.length < 3 && !resources.some(r => r.title === resource.title)) {
              resources.push(resource);
            }
          });
        }
      }
    });
    
    return resources;
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setAiResponse(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionClick(suggestion);
    setIsVisible(false);
    
    // Save this interaction
    if (user) {
      googleAI.saveInteraction(
        user.id,
        'suggestion',
        suggestion,
        { used: true }
      );
    }
  };

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (!user || !aiResponse) return;
    
    setFeedbackGiven({ ...feedbackGiven, main: type });
    
    // Save feedback
    await googleAI.saveInteraction(
      user.id,
      'insight',
      aiResponse.message,
      aiResponse,
      type
    );
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
    <motion.div 
      className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-lg border border-neutral-200 z-50"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="ml-2">
              <p className="font-medium text-sm">MomFit AI Assistant</p>
              <p className="text-xs text-neutral-500">Powered by Google AI</p>
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
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
            <p className="text-sm text-neutral-800">{aiResponse.message}</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center">
                <Sparkles className="h-3 w-3 text-purple-500 mr-1" />
                <span className="text-xs text-purple-600">
                  AI-powered insight
                </span>
              </div>
              
              {/* Feedback buttons */}
              {!feedbackGiven.main && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleFeedback('positive')}
                    className="p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                    title="This was helpful"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleFeedback('negative')}
                    className="p-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                    title="This wasn't helpful"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {/* Feedback confirmation */}
              {feedbackGiven.main && (
                <div className="text-xs text-neutral-500">
                  Thanks for your feedback!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {aiResponse.suggestions && aiResponse.suggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-neutral-700 mb-2">Message Suggestions:</p>
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
                  target="_blank"
                  rel="noopener noreferrer"
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
    </motion.div>
  );
};

export default GoogleAIAssistant;