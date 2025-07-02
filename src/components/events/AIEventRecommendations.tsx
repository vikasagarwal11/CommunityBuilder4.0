import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Clock, Users, Tag, Target, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { googleAI } from '../../lib/ai/googleAI';
import { motion } from 'framer-motion';

interface AIEventRecommendationsProps {
  communityId: string;
  onCreateEvent?: (eventData: any) => void;
}

const AIEventRecommendations: React.FC<AIEventRecommendationsProps> = ({ 
  communityId,
  onCreateEvent
}) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [communityId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const eventRecommendations = await googleAI.generateEventRecommendations(communityId);
      setRecommendations(eventRecommendations);
    } catch (error) {
      console.error('Error fetching event recommendations:', error);
      setError('Failed to load event recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError('');
      
      const eventRecommendations = await googleAI.generateEventRecommendations(communityId);
      setRecommendations(eventRecommendations);
    } catch (error) {
      console.error('Error refreshing event recommendations:', error);
      setError('Failed to refresh recommendations. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUseRecommendation = (recommendation: any) => {
    if (onCreateEvent) {
      onCreateEvent(recommendation);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            AI Event Recommendations
          </h3>
        </div>
        
        <div className="py-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-neutral-600">Generating event recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
          AI Event Recommendations
        </h3>
        
        <button
          onClick={handleRefresh}
          className="p-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
          disabled={refreshing}
          title="Refresh recommendations"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      <p className="text-neutral-600 mb-6">
        These event ideas are generated based on your community's profile and interests.
      </p>
      
      <div className="space-y-6">
        {recommendations.map((recommendation, index) => (
          <motion.div 
            key={index}
            className="border border-neutral-200 rounded-lg overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4">
              <h4 className="font-semibold text-lg">{recommendation.title}</h4>
            </div>
            
            <div className="p-4">
              <p className="text-neutral-700 mb-4">{recommendation.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center text-sm text-neutral-600">
                  <Clock className="h-4 w-4 mr-2 text-neutral-400" />
                  <span>{recommendation.duration} minutes</span>
                </div>
                
                <div className="flex items-center text-sm text-neutral-600">
                  <Users className="h-4 w-4 mr-2 text-neutral-400" />
                  <span>Limit: {recommendation.participantLimit} participants</span>
                </div>
                
                <div className="flex items-center text-sm text-neutral-600">
                  <Target className="h-4 w-4 mr-2 text-neutral-400" />
                  <span className="capitalize">{recommendation.difficulty} level</span>
                </div>
              </div>
              
              {recommendation.tags && recommendation.tags.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-neutral-700 mb-2">Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.tags.map((tag: string, tagIndex: number) => (
                      <span key={tagIndex} className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {recommendation.equipment && recommendation.equipment.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-neutral-700 mb-2">Equipment needed:</p>
                  <ul className="list-disc list-inside text-sm text-neutral-600 pl-2">
                    {recommendation.equipment.map((item: string, itemIndex: number) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {onCreateEvent && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleUseRecommendation(recommendation)}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use This Idea
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="text-xs text-neutral-500 text-center mt-6">
        <p>These recommendations are AI-generated based on your community profile.</p>
        <p>You can customize any event details when creating the actual event.</p>
      </div>
    </div>
  );
};

export default AIEventRecommendations;