import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart2, MessageSquare, Heart, Smile, Frown, Meh, Calendar, Clock, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { googleAI } from '../../lib/ai/googleAI';
import { motion } from 'framer-motion';

interface GoogleAIChatAnalyticsProps {
  communityId: string;
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
  }>;
}

const GoogleAIChatAnalytics: React.FC<GoogleAIChatAnalyticsProps> = ({ communityId, messages }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [analytics, setAnalytics] = useState<any | null>(null);

  useEffect(() => {
    // For demo purposes, we'll assume the user is an admin
    setIsAdmin(true);
    
    if (messages.length > 0) {
      generateAnalytics();
    }
  }, [communityId, messages.length]);

  const generateAnalytics = async () => {
    try {
      setLoading(true);
      
      // Filter messages based on time range
      const now = new Date();
      const filteredMessages = messages.filter(message => {
        const messageDate = new Date(message.created_at);
        const diffTime = now.getTime() - messageDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (timeRange === 'day') return diffDays <= 1;
        if (timeRange === 'week') return diffDays <= 7;
        return diffDays <= 30; // month
      });
      
      // Use Google AI to analyze chat trends
      const analysisResult = await googleAI.analyzeChatTrends(filteredMessages, timeRange);
      setAnalytics(analysisResult);
    } catch (error) {
      console.error('Error generating analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await generateAnalytics();
    setRefreshing(false);
  };

  const handleTimeRangeChange = (range: 'day' | 'week' | 'month') => {
    setTimeRange(range);
    generateAnalytics();
  };

  if (!isAdmin || !analytics) return null;

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-sm p-4 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
          AI Chat Analytics
        </h3>
        
        <div className="flex items-center space-x-2">
          <div className="flex bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => handleTimeRangeChange('day')}
              className={`px-2 py-1 text-xs rounded ${
                timeRange === 'day' ? 'bg-white shadow-sm' : 'text-neutral-600'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => handleTimeRangeChange('week')}
              className={`px-2 py-1 text-xs rounded ${
                timeRange === 'week' ? 'bg-white shadow-sm' : 'text-neutral-600'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => handleTimeRangeChange('month')}
              className={`px-2 py-1 text-xs rounded ${
                timeRange === 'month' ? 'bg-white shadow-sm' : 'text-neutral-600'
              }`}
            >
              30d
            </button>
          </div>
          
          <button
            onClick={handleRefresh}
            className="p-1 bg-neutral-100 rounded-lg text-neutral-600 hover:bg-neutral-200"
            disabled={refreshing}
            title="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
          <div className="h-32 bg-neutral-200 rounded"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <MessageSquare className="h-6 w-6 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-600">{messages.length}</p>
              <p className="text-xs text-blue-600">Messages</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">
                {analytics.engagementMetrics?.averageMessagesPerUser || 0}
              </p>
              <p className="text-xs text-green-600">Avg. per User</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <Heart className="h-6 w-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-600">{analytics.sentimentAnalysis?.positive || 0}%</p>
              <p className="text-xs text-purple-600">Positive Sentiment</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-yellow-600">{analytics.engagementMetrics?.peakActivityTime || 'N/A'}</p>
              <p className="text-xs text-yellow-600">Peak Activity</p>
            </div>
          </div>
          
          {/* Top Topics */}
          {analytics.topTopics && analytics.topTopics.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Top Discussion Topics</h4>
              <div className="space-y-2">
                {analytics.topTopics.map((topic: any) => (
                  <div key={topic.topic} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm capitalize">{topic.topic}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                        topic.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                        topic.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {topic.sentiment}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-32 bg-neutral-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ 
                            width: `${(topic.count / analytics.topTopics[0].count) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-neutral-500">{topic.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Sentiment Analysis */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Sentiment Analysis</h4>
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex-grow h-4 bg-neutral-200 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 h-full"
                  style={{ width: `${analytics.sentimentAnalysis?.positive || 0}%` }}
                  title={`Positive: ${analytics.sentimentAnalysis?.positive || 0}%`}
                ></div>
                <div 
                  className="bg-yellow-500 h-full"
                  style={{ width: `${analytics.sentimentAnalysis?.neutral || 0}%` }}
                  title={`Neutral: ${analytics.sentimentAnalysis?.neutral || 0}%`}
                ></div>
                <div 
                  className="bg-red-500 h-full"
                  style={{ width: `${analytics.sentimentAnalysis?.negative || 0}%` }}
                  title={`Negative: ${analytics.sentimentAnalysis?.negative || 0}%`}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <div className="flex items-center">
                <Smile className="h-3 w-3 text-green-500 mr-1" />
                <span>{analytics.sentimentAnalysis?.positive || 0}%</span>
              </div>
              <div className="flex items-center">
                <Meh className="h-3 w-3 text-yellow-500 mr-1" />
                <span>{analytics.sentimentAnalysis?.neutral || 0}%</span>
              </div>
              <div className="flex items-center">
                <Frown className="h-3 w-3 text-red-500 mr-1" />
                <span>{analytics.sentimentAnalysis?.negative || 0}%</span>
              </div>
            </div>
          </div>
          
          {/* Common Questions & Actionable Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Common Questions */}
            {analytics.commonQuestions && analytics.commonQuestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Common Questions</h4>
                <ul className="space-y-2 bg-neutral-50 p-3 rounded-lg">
                  {analytics.commonQuestions.map((question: string, index: number) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-primary-500 mr-2">•</span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Actionable Insights */}
            {analytics.actionableInsights && analytics.actionableInsights.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Actionable Insights</h4>
                <ul className="space-y-2 bg-blue-50 p-3 rounded-lg">
                  {analytics.actionableInsights.map((insight: string, index: number) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default GoogleAIChatAnalytics;