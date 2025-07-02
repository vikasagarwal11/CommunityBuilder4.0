import React, { useState, useEffect } from 'react';
import { Bot, Lightbulb, X, MessageSquare, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { googleAI } from '../../lib/ai/googleAI';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface GoogleAIMessageInsightsProps {
  message: {
    id: string;
    content: string;
    user_id: string;
  };
  communityId: string;
  onClose: () => void;
}

const GoogleAIMessageInsights: React.FC<GoogleAIMessageInsightsProps> = ({ 
  message, 
  communityId, 
  onClose 
}) => {
  const { user } = useAuth();
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
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
    
    const generateInsight = async () => {
      try {
        setLoading(true);
        
        // Get message analysis
        const messageAnalysis = await googleAI.analyzeMessage(message.content);
        setAnalysis(messageAnalysis);
        
        // Get personalized insight
        const personalizedInsight = await googleAI.getMessageInsights(
          message.content, 
          userProfile
        );
        
        setInsight(personalizedInsight);
      } catch (error) {
        console.error('Error generating insight:', error);
        setInsight("I'm here to help with insights about this conversation!");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
    generateInsight();
  }, [message, user]);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (!user) return;
    
    setFeedbackGiven(type);
    
    // Save feedback
    await googleAI.saveInteraction(
      user.id,
      'insight',
      message.content,
      { insight, analysis },
      type
    );
  };

  return (
    <motion.div 
      className="fixed bottom-20 right-4 max-w-sm bg-white rounded-xl shadow-lg border border-neutral-200 z-50"
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
              <p className="font-medium text-sm">AI Assistant</p>
              <p className="text-xs text-neutral-500">Message Insights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* AI Response */}
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
              <p className="text-sm text-neutral-800">{insight}</p>
              
              {analysis && (
                <div className="mt-3 pt-3 border-t border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Message Analysis:</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.topics.slice(0, 3).map((topic: string, index: number) => (
                      <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {topic}
                      </span>
                    ))}
                    {analysis.sentiment && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        analysis.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                        analysis.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {analysis.sentiment}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <Sparkles className="h-3 w-3 text-blue-500 mr-1" />
                  <span className="text-xs text-blue-600">
                    Powered by Google AI
                  </span>
                </div>
                
                {/* Feedback buttons */}
                {!feedbackGiven && (
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
                {feedbackGiven && (
                  <div className="text-xs text-neutral-500">
                    Thanks for your feedback!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-neutral-500 flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="h-3 w-3 mr-1" />
            <span>Based on message content analysis</span>
          </div>
          <button 
            className="text-primary-500 hover:text-primary-600"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GoogleAIMessageInsights;