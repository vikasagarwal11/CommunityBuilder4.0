import React, { useState, useEffect } from 'react';
import { Brain, Lightbulb, MessageSquare, Sparkles, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { chatAssistant } from '../../lib/ai/chatAssistant';
import { motion } from 'framer-motion';

interface AIMessageAnalyzerProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
  };
  communityId: string;
  onInsightUsed?: (insight: string) => void;
}

const AIMessageAnalyzer: React.FC<AIMessageAnalyzerProps> = ({ 
  message, 
  communityId,
  onInsightUsed
}) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  useEffect(() => {
    analyzeMessage();
  }, [message.id]);

  const analyzeMessage = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Analyze message content
      const sentimentAnalysis = await chatAssistant.analyzeSentiment(message.content);
      const toneAnalysis = await chatAssistant.analyzeMessageTone(message.content);
      
      // Get topics from message
      const topics = await extractTopics(message.content);
      
      // Combine analyses
      const combinedAnalysis = {
        sentiment: sentimentAnalysis.sentiment,
        sentimentScore: sentimentAnalysis.score,
        emotions: sentimentAnalysis.emotions || [],
        tone: toneAnalysis.tone,
        toneIntensity: toneAnalysis.intensity,
        topics,
        actionItems: extractActionItems(message.content),
        questions: extractQuestions(message.content)
      };
      
      setAnalysis(combinedAnalysis);
      
      // Log the analysis
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: user.id,
          interaction_type: 'analysis',
          content: message.content,
          result: combinedAnalysis,
          created_at: new Date().toISOString()
        });
        
      // Increment engagement level for messages with high analysis value
      if (
        combinedAnalysis.actionItems.length > 0 || 
        combinedAnalysis.questions.length > 0 || 
        combinedAnalysis.sentiment === 'positive'
      ) {
        // Increment engagement level by 1 for valuable content
        await supabase.rpc('increment_engagement', { 
          message_id: message.id,
          increment_by: 1
        });
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
      setError('Failed to analyze message');
    } finally {
      setLoading(false);
    }
  };

  const extractTopics = async (content: string): Promise<string[]> => {
    // Simple keyword extraction
    const keywords = [
      'workout', 'exercise', 'fitness', 'nutrition', 'diet', 'health',
      'yoga', 'running', 'strength', 'cardio', 'meditation', 'mindfulness',
      'recovery', 'sleep', 'stress', 'motivation', 'goals', 'progress'
    ];
    
    const foundTopics: string[] = [];
    const lowerContent = content.toLowerCase();
    
    keywords.forEach(keyword => {
      if (lowerContent.includes(keyword) && !foundTopics.includes(keyword)) {
        foundTopics.push(keyword);
      }
    });
    
    return foundTopics;
  };

  const extractActionItems = (content: string): string[] => {
    const actionItems: string[] = [];
    
    // Look for action item patterns
    const actionPatterns = [
      /need to (.*?)(?:\.|\?|!|$)/i,
      /should (.*?)(?:\.|\?|!|$)/i,
      /have to (.*?)(?:\.|\?|!|$)/i,
      /going to (.*?)(?:\.|\?|!|$)/i,
      /plan to (.*?)(?:\.|\?|!|$)/i
    ];
    
    actionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches && matches[1]) {
        actionItems.push(matches[1].trim());
      }
    });
    
    return actionItems;
  };

  const extractQuestions = (content: string): string[] => {
    const questions: string[] = [];
    
    // Split by sentence endings and filter for questions
    const sentences = content.split(/(?<=[.!?])\s+/);
    sentences.forEach(sentence => {
      if (sentence.trim().endsWith('?')) {
        questions.push(sentence.trim());
      }
    });
    
    return questions;
  };

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (!user || !analysis) return;
    
    setFeedbackGiven(type);
    
    // Log feedback
    try {
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: user.id,
          interaction_type: 'feedback',
          content: message.content,
          result: analysis,
          feedback: type,
          created_at: new Date().toISOString()
        });
        
      // Increment engagement for positive feedback
      if (type === 'positive') {
        await supabase.rpc('increment_engagement', { 
          message_id: message.id,
          increment_by: 1
        });
      }
    } catch (error) {
      console.error('Error logging feedback:', error);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-neutral-500" />;
    }
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'enthusiastic':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'questioning':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'concerned':
        return <Lightbulb className="h-4 w-4 text-orange-500" />;
      default:
        return <Brain className="h-4 w-4 text-neutral-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-3 bg-neutral-50 rounded-lg animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-neutral-200 rounded w-full mb-1"></div>
        <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !analysis) {
    return null;
  }

  return (
    <motion.div 
      className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Brain className="h-4 w-4 text-blue-500 mr-2" />
          <h3 className="text-sm font-medium text-blue-700">Message Analysis</h3>
        </div>
        
        {/* Feedback buttons */}
        {!feedbackGiven && (
          <div className="flex space-x-1">
            <button
              onClick={() => handleFeedback('positive')}
              className="p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              title="This analysis is helpful"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              className="p-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
              title="This analysis is not helpful"
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
      
      <div className="space-y-2 text-sm">
        {/* Sentiment and Tone */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center bg-white px-2 py-1 rounded-full text-xs">
            {getSentimentIcon(analysis.sentiment)}
            <span className="ml-1 capitalize">{analysis.sentiment} sentiment</span>
          </div>
          
          <div className="flex items-center bg-white px-2 py-1 rounded-full text-xs">
            {getToneIcon(analysis.tone)}
            <span className="ml-1 capitalize">{analysis.tone} tone</span>
          </div>
          
          {analysis.emotions && analysis.emotions.length > 0 && (
            <div className="flex items-center bg-white px-2 py-1 rounded-full text-xs">
              <Sparkles className="h-3 w-3 mr-1 text-purple-500" />
              <span className="capitalize">{analysis.emotions[0]}</span>
            </div>
          )}
        </div>
        
        {/* Topics */}
        {analysis.topics && analysis.topics.length > 0 && (
          <div>
            <p className="text-xs text-blue-700 mb-1">Topics:</p>
            <div className="flex flex-wrap gap-1">
              {analysis.topics.map((topic: string, index: number) => (
                <span key={index} className="bg-white px-2 py-1 rounded-full text-xs text-neutral-700">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Questions */}
        {analysis.questions && analysis.questions.length > 0 && (
          <div>
            <p className="text-xs text-blue-700 mb-1">Questions:</p>
            <ul className="space-y-1">
              {analysis.questions.map((question: string, index: number) => (
                <li key={index} className="text-xs text-neutral-700 flex items-start">
                  <MessageSquare className="h-3 w-3 mr-1 mt-0.5 text-blue-500" />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Action Items */}
        {analysis.actionItems && analysis.actionItems.length > 0 && (
          <div>
            <p className="text-xs text-blue-700 mb-1">Action Items:</p>
            <ul className="space-y-1">
              {analysis.actionItems.map((item: string, index: number) => (
                <li key={index} className="text-xs text-neutral-700 flex items-start">
                  <Zap className="h-3 w-3 mr-1 mt-0.5 text-yellow-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AIMessageAnalyzer;