import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, MessageCircle, Heart, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MessageAnalyticsProps {
  communityId: string;
  isAdmin: boolean;
}

interface AnalyticsData {
  totalMessages: number;
  activeUsers: number;
  engagementRate: number;
  topTopics: Array<{
    topic: string;
    count: number;
  }>;
  messagesByHour: Array<{
    hour: number;
    count: number;
  }>;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

const MessageAnalytics: React.FC<MessageAnalyticsProps> = ({ 
  communityId, 
  isAdmin 
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [communityId, timeRange, isAdmin]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      // Fetch messages in time range
      const { data: messages, error } = await supabase
        .from('community_posts')
        .select('id, content, created_at, user_id')
        .eq('community_id', communityId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Fetch reactions
      const messageIds = messages?.map(m => m.id) || [];
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('message_id, emoji')
        .in('message_id', messageIds);

      // Calculate analytics
      const totalMessages = messages?.length || 0;
      const activeUsers = new Set(messages?.map(m => m.user_id)).size;
      const totalReactions = reactions?.length || 0;
      const engagementRate = totalMessages > 0 ? (totalReactions / totalMessages) * 100 : 0;

      // Analyze topics (simple keyword extraction)
      const topTopics = analyzeTopics(messages || []);
      
      // Messages by hour
      const messagesByHour = analyzeMessagesByHour(messages || []);
      
      // Simple sentiment analysis
      const sentimentAnalysis = analyzeSentiment(messages || []);

      setAnalytics({
        totalMessages,
        activeUsers,
        engagementRate,
        topTopics,
        messagesByHour,
        sentimentAnalysis
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTopics = (messages: any[]) => {
    const keywords = ['workout', 'exercise', 'nutrition', 'motivation', 'postpartum', 'baby', 'time', 'energy'];
    const topicCounts: { [key: string]: number } = {};

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
        }
      });
    });

    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const analyzeMessagesByHour = (messages: any[]) => {
    const hourCounts = Array(24).fill(0);
    
    messages.forEach(message => {
      const hour = new Date(message.created_at).getHours();
      hourCounts[hour]++;
    });

    return hourCounts.map((count, hour) => ({ hour, count }));
  };

  const analyzeSentiment = (messages: any[]) => {
    const positiveWords = ['great', 'amazing', 'love', 'excited', 'happy', 'awesome'];
    const negativeWords = ['tired', 'frustrated', 'difficult', 'hard', 'struggle'];
    
    let positive = 0, negative = 0, neutral = 0;

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      const hasPositive = positiveWords.some(word => content.includes(word));
      const hasNegative = negativeWords.some(word => content.includes(word));
      
      if (hasPositive && !hasNegative) positive++;
      else if (hasNegative && !hasPositive) negative++;
      else neutral++;
    });

    const total = messages.length || 1;
    return {
      positive: (positive / total) * 100,
      neutral: (neutral / total) * 100,
      negative: (negative / total) * 100
    };
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-neutral-200 rounded"></div>
            <div className="h-3 bg-neutral-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-primary-500" />
          Community Analytics
        </h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="text-sm border border-neutral-300 rounded-md px-2 py-1"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <MessageCircle className="h-6 w-6 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-600">{analytics.totalMessages}</p>
          <p className="text-xs text-blue-600">Messages</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <Users className="h-6 w-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{analytics.activeUsers}</p>
          <p className="text-xs text-green-600">Active Users</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <Heart className="h-6 w-6 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-600">{analytics.engagementRate.toFixed(1)}%</p>
          <p className="text-xs text-purple-600">Engagement</p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <TrendingUp className="h-6 w-6 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-orange-600">
            {analytics.sentimentAnalysis.positive.toFixed(0)}%
          </p>
          <p className="text-xs text-orange-600">Positive</p>
        </div>
      </div>

      {/* Top Topics */}
      {analytics.topTopics.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3">Top Discussion Topics</h4>
          <div className="space-y-2">
            {analytics.topTopics.map((topic, index) => (
              <div key={topic.topic} className="flex items-center justify-between">
                <span className="text-sm capitalize">{topic.topic}</span>
                <div className="flex items-center">
                  <div className="w-20 bg-neutral-200 rounded-full h-2 mr-2">
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

      {/* Activity by Hour */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Activity by Hour</h4>
        <div className="flex items-end space-x-1 h-20">
          {analytics.messagesByHour.map((data, index) => {
            const maxCount = Math.max(...analytics.messagesByHour.map(d => d.count));
            const height = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
            
            return (
              <div
                key={index}
                className="flex-1 bg-primary-200 rounded-t"
                style={{ height: `${height}%` }}
                title={`${data.hour}:00 - ${data.count} messages`}
              ></div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
      </div>
    </div>
  );
};

export default MessageAnalytics;