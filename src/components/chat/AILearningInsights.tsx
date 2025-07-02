import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { learningSystem } from '../../lib/ai/learningSystem';
import { Brain, Sparkles, Target, Users, ThumbsUp, ThumbsDown, RefreshCw, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AILearningInsightsProps {
  userId: string;
  communityId: string;
}

const AILearningInsights: React.FC<AILearningInsightsProps> = ({ userId, communityId }) => {
  const { user } = useAuth();
  const [userInsights, setUserInsights] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchInsights();
  }, [userId, communityId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch user insights
      const { data: insightsData } = await supabase
        .from('user_ai_insights')
        .select('insights')
        .eq('user_id', userId)
        .maybeSingle();
        
      setUserInsights(insightsData?.insights || null);
      
      // Fetch personalized recommendations
      const recommendations = await learningSystem.getPersonalizedRecommendations(
        userId,
        communityId
      );
      
      setRecommendations(recommendations);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setError('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError('');
      
      // Trigger user learning processing
      await learningSystem.processUserLearning(userId, communityId);
      
      // Fetch updated insights
      await fetchInsights();
    } catch (error) {
      console.error('Error refreshing insights:', error);
      setError('Failed to refresh insights');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFeedback = async (itemId: string, isPositive: boolean) => {
    try {
      // Record feedback
      await learningSystem.recordFeedback(
        userId,
        'recommendation',
        itemId,
        isPositive
      );
      
      // Update local state
      setFeedbackGiven({
        ...feedbackGiven,
        [itemId]: isPositive
      });
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-neutral-200 rounded"></div>
          <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (!userInsights && !recommendations) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 text-center">
        <Brain className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
        <p className="text-neutral-600">No AI insights available yet</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-primary-500 hover:text-primary-600 text-sm font-medium"
          disabled={refreshing}
        >
          {refreshing ? 'Generating insights...' : 'Generate Insights'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2 text-primary-500" />
            AI Learning Insights
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full"
              disabled={refreshing}
              title="Refresh insights"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full"
              title={expanded ? "Show less" : "Show more"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Content Recommendations */}
        {recommendations?.contentRecommendations && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
              <Sparkles className="h-4 w-4 mr-1 text-blue-500" />
              Content You Might Like
            </h4>
            <div className="space-y-2">
              {recommendations.contentRecommendations.slice(0, expanded ? undefined : 2).map((rec: any, index: number) => {
                const itemId = `content-${index}`;
                return (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-blue-700">{rec.description}</p>
                      </div>
                      {feedbackGiven[itemId] !== undefined ? (
                        <span className="text-xs text-blue-600">
                          Thanks for your feedback!
                        </span>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleFeedback(itemId, true)}
                            className="p-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                            title="This is helpful"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(itemId, false)}
                            className="p-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                            title="This isn't helpful"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Event Recommendations */}
        {recommendations?.eventRecommendations && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
              <Target className="h-4 w-4 mr-1 text-green-500" />
              Events You Might Enjoy
            </h4>
            <div className="space-y-2">
              {recommendations.eventRecommendations.slice(0, expanded ? undefined : 2).map((rec: any, index: number) => {
                const itemId = `event-${index}`;
                return (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-green-700">{rec.description}</p>
                      </div>
                      {feedbackGiven[itemId] !== undefined ? (
                        <span className="text-xs text-green-600">
                          Thanks for your feedback!
                        </span>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleFeedback(itemId, true)}
                            className="p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                            title="This is helpful"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(itemId, false)}
                            className="p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                            title="This isn't helpful"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Connection Recommendations */}
        {expanded && recommendations?.connectionRecommendations && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
              <Users className="h-4 w-4 mr-1 text-purple-500" />
              People You Might Connect With
            </h4>
            <div className="space-y-2">
              {recommendations.connectionRecommendations.map((rec: any, index: number) => {
                const itemId = `connection-${index}`;
                return (
                  <div key={index} className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{rec.type}</p>
                        <p className="text-xs text-purple-700">{rec.description}</p>
                      </div>
                      {feedbackGiven[itemId] !== undefined ? (
                        <span className="text-xs text-purple-600">
                          Thanks for your feedback!
                        </span>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleFeedback(itemId, true)}
                            className="p-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
                            title="This is helpful"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(itemId, false)}
                            className="p-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
                            title="This isn't helpful"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* User Insights */}
        <AnimatePresence>
          {expanded && userInsights && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 pt-4 border-t border-neutral-200"
            >
              <h4 className="text-sm font-medium text-neutral-700 mb-2">Your Communication Style</h4>
              {userInsights.communicationStyle && (
                <div className="p-3 bg-neutral-50 rounded-lg mb-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">Tone</p>
                      <p className="font-medium text-sm capitalize">{userInsights.communicationStyle.tone}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">Formality</p>
                      <p className="font-medium text-sm capitalize">{userInsights.communicationStyle.formality}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">Verbosity</p>
                      <p className="font-medium text-sm capitalize">{userInsights.communicationStyle.verbosity}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {userInsights.engagementPatterns && (
                <>
                  <h4 className="text-sm font-medium text-neutral-700 mb-2">Engagement Patterns</h4>
                  <div className="p-3 bg-neutral-50 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-neutral-500">Active Time</p>
                        <p className="font-medium text-sm capitalize">{userInsights.engagementPatterns.activeTimeOfDay}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Response Rate</p>
                        <p className="font-medium text-sm capitalize">{userInsights.engagementPatterns.responseRate}</p>
                      </div>
                    </div>
                    {userInsights.engagementPatterns.preferredContentTypes && (
                      <div className="mt-2">
                        <p className="text-xs text-neutral-500">Preferred Content</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {userInsights.engagementPatterns.preferredContentTypes.map((type: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full text-xs">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!expanded && (recommendations?.contentRecommendations?.length > 2 || recommendations?.eventRecommendations?.length > 2) && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-center text-primary-500 hover:text-primary-600 text-sm font-medium mt-2"
          >
            Show more insights
            <ChevronDown className="h-4 w-4 inline ml-1" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AILearningInsights;