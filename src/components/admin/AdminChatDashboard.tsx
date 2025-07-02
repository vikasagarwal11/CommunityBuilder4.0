import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertTriangle, Flag, TrendingUp, BarChart2, Heart, Smile, Frown, Meh, Users, RefreshCw, Filter, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

interface AdminChatDashboardProps {
  communityId?: string; // Optional - if provided, only shows data for this community
}

const AdminChatDashboard: React.FC<AdminChatDashboardProps> = ({ communityId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(communityId || null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [moderationFlags, setModerationFlags] = useState<any[]>([]);

  // Fetch admin's communities if no communityId is provided
  useEffect(() => {
    if (communityId) {
      setSelectedCommunity(communityId);
      return;
    }
    
    const fetchCommunities = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('community_members')
          .select(`
            community_id,
            role,
            communities (
              id,
              name,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .in('role', ['admin', 'co-admin']);
          
        if (error) throw error;
        
        const formattedCommunities = data.map(item => ({
          id: item.communities.id,
          name: item.communities.name,
          image_url: item.communities.image_url,
          role: item.role
        }));
        
        setCommunities(formattedCommunities);
        
        // Set first community as selected by default
        if (formattedCommunities.length > 0 && !selectedCommunity) {
          setSelectedCommunity(formattedCommunities[0].id);
        }
      } catch (err) {
        console.error('Error fetching communities:', err);
        setError('Failed to load communities');
      }
    };
    
    fetchCommunities();
  }, [user, communityId]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedCommunity) return;
      
      try {
        setLoading(true);
        
        // In a real implementation, this would call the AI service to analyze chat data
        // For now, we'll simulate it with mock data
        
        // Fetch messages for the selected community and time range
        const startDate = new Date();
        if (timeRange === 'day') {
          startDate.setDate(startDate.getDate() - 1);
        } else if (timeRange === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else {
          startDate.setMonth(startDate.getMonth() - 1);
        }
        
        const { data: messages, error: messagesError } = await supabase
          .from('community_posts')
          .select('id, content, created_at, user_id')
          .eq('community_id', selectedCommunity)
          .gte('created_at', startDate.toISOString());
          
        if (messagesError) throw messagesError;
        
        // Get unique user IDs
        const userIds = [...new Set(messages?.map(m => m.user_id) || [])];
        
        // Generate mock analytics
        const mockAnalytics = {
          messageCount: messages?.length || 0,
          activeUsers: userIds.length,
          sentimentAnalysis: {
            positive: 60,
            neutral: 30,
            negative: 10
          },
          topTopics: [
            { topic: "workout", count: 15, sentiment: "positive" },
            { topic: "nutrition", count: 10, sentiment: "neutral" },
            { topic: "motivation", count: 8, sentiment: "positive" },
            { topic: "recovery", count: 6, sentiment: "neutral" },
            { topic: "goals", count: 5, sentiment: "positive" }
          ],
          engagementMetrics: {
            averageMessagesPerUser: userIds.length > 0 ? Math.round((messages?.length || 0) / userIds.length) : 0,
            peakActivityTime: "18:00-20:00"
          },
          commonQuestions: [
            "How to find time for workouts?",
            "What are good post-workout meals?",
            "How to stay motivated?",
            "Best exercises for postpartum recovery?"
          ],
          actionableInsights: [
            "Users are interested in time-efficient workouts",
            "Nutrition advice is frequently requested",
            "Consider organizing more group activities",
            "Provide more resources on postpartum fitness"
          ],
          activityByHour: Array(24).fill(0).map(() => Math.floor(Math.random() * 10))
        };
        
        setAnalytics(mockAnalytics);
        
        // Fetch moderation flags
        const { data: flags, error: flagsError } = await supabase
          .from('content_moderation_flags')
          .select(`
            id,
            content_type,
            content_id,
            reason,
            status,
            created_at,
            reporter:profiles!reporter_id(
              full_name,
              avatar_url
            )
          `)
          .eq('community_id', selectedCommunity)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (flagsError) throw flagsError;
        
        // If no real flags, use mock data
        if (!flags || flags.length === 0) {
          const mockFlags = [
            {
              id: '1',
              content_type: 'message',
              content_id: '123',
              reason: 'Inappropriate language',
              status: 'pending',
              created_at: new Date().toISOString(),
              reporter: {
                full_name: 'Jane Smith',
                avatar_url: null
              }
            },
            {
              id: '2',
              content_type: 'image',
              content_id: '456',
              reason: 'Potentially unsafe content',
              status: 'pending',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              reporter: {
                full_name: 'John Doe',
                avatar_url: null
              }
            }
          ];
          
          setModerationFlags(mockFlags);
        } else {
          setModerationFlags(flags);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [selectedCommunity, timeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-neutral-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-neutral-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Chat Analytics & Moderation</h2>
        <div className="flex items-center space-x-3">
          <div className="flex bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setTimeRange('day')}
              className={`px-3 py-1 text-xs rounded ${
                timeRange === 'day' ? 'bg-white shadow-sm' : 'text-neutral-600'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 text-xs rounded ${
                timeRange === 'week' ? 'bg-white shadow-sm' : 'text-neutral-600'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 text-xs rounded ${
                timeRange === 'month' ? 'bg-white shadow-sm' : 'text-neutral-600'
              }`}
            >
              30d
            </button>
          </div>
          
          <button
            onClick={handleRefresh}
            className="p-2 bg-neutral-100 rounded-lg text-neutral-600 hover:bg-neutral-200"
            disabled={refreshing}
            title="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Community selector (if no communityId was provided) */}
      {!communityId && communities.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Select Community
          </label>
          <select
            value={selectedCommunity || ''}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            className="input w-full max-w-md"
          >
            <option value="" disabled>Select a community</option>
            {communities.map(community => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-neutral-500 text-sm">Messages</p>
                  <p className="text-3xl font-semibold mt-1">{analytics.messageCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-100">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-neutral-500 text-sm">Active Users</p>
                  <p className="text-3xl font-semibold mt-1">{analytics.activeUsers}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-100">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-neutral-500 text-sm">Positive Sentiment</p>
                  <p className="text-3xl font-semibold mt-1">{analytics.sentimentAnalysis.positive}%</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-100">
                  <Heart className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-neutral-500 text-sm">Peak Activity</p>
                  <p className="text-3xl font-semibold mt-1">{analytics.engagementMetrics.peakActivityTime}</p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Sentiment Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-purple-500" />
              Sentiment Analysis
            </h3>
            
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex-grow h-4 bg-neutral-200 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 h-full"
                  style={{ width: `${analytics.sentimentAnalysis.positive}%` }}
                  title={`Positive: ${analytics.sentimentAnalysis.positive}%`}
                ></div>
                <div 
                  className="bg-yellow-500 h-full"
                  style={{ width: `${analytics.sentimentAnalysis.neutral}%` }}
                  title={`Neutral: ${analytics.sentimentAnalysis.neutral}%`}
                ></div>
                <div 
                  className="bg-red-500 h-full"
                  style={{ width: `${analytics.sentimentAnalysis.negative}%` }}
                  title={`Negative: ${analytics.sentimentAnalysis.negative}%`}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <div className="flex items-center">
                <Smile className="h-3 w-3 text-green-500 mr-1" />
                <span>{analytics.sentimentAnalysis.positive}% Positive</span>
              </div>
              <div className="flex items-center">
                <Meh className="h-3 w-3 text-yellow-500 mr-1" />
                <span>{analytics.sentimentAnalysis.neutral}% Neutral</span>
              </div>
              <div className="flex items-center">
                <Frown className="h-3 w-3 text-red-500 mr-1" />
                <span>{analytics.sentimentAnalysis.negative}% Negative</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Topics */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Top Discussion Topics
              </h3>
              
              <div className="space-y-3">
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
            
            {/* Activity by Hour */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-green-500" />
                Activity by Hour
              </h3>
              
              <div className="flex items-end space-x-1 h-40">
                {analytics.activityByHour.map((count: number, hour: number) => {
                  const maxCount = Math.max(...analytics.activityByHour);
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div
                      key={hour}
                      className="flex-1 bg-primary-200 rounded-t relative group"
                      style={{ height: `${height}%` }}
                      title={`${hour}:00 - ${count} messages`}
                    >
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-neutral-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {hour}:00 - {count} messages
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-neutral-500 mt-2">
                <span>0</span>
                <span>6</span>
                <span>12</span>
                <span>18</span>
                <span>23</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Common Questions */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-orange-500" />
                Common Questions
              </h3>
              
              <ul className="space-y-2">
                {analytics.commonQuestions.map((question: string, index: number) => (
                  <li key={index} className="p-3 bg-neutral-50 rounded-lg text-sm">
                    {question}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Actionable Insights */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                AI-Generated Insights
              </h3>
              
              <ul className="space-y-2">
                {analytics.actionableInsights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start p-3 bg-blue-50 rounded-lg text-sm">
                    <div className="text-blue-500 mr-2">•</div>
                    <span className="text-blue-700">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
      
      {/* Moderation Flags */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Flag className="h-5 w-5 mr-2 text-red-500" />
          Content Moderation Flags
        </h3>
        
        {moderationFlags.length > 0 ? (
          <div className="space-y-4">
            {moderationFlags.map((flag) => (
              <motion.div
                key={flag.id}
                className="p-4 border border-neutral-200 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-red-100 mr-3">
                      {flag.content_type === 'message' ? (
                        <MessageSquare className="h-5 w-5 text-red-500" />
                      ) : (
                        <Image className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        Flagged {flag.content_type}
                      </h4>
                      <p className="text-sm text-neutral-500">
                        Reported {new Date(flag.created_at).toLocaleDateString()} by {flag.reporter.full_name}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                    {flag.status}
                  </span>
                </div>
                
                <div className="bg-neutral-50 p-3 rounded-lg mb-3">
                  <p className="text-sm font-medium text-neutral-700">Reason:</p>
                  <p className="text-sm text-neutral-600">{flag.reason}</p>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button className="px-3 py-1 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-sm">
                    Dismiss
                  </button>
                  <button className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                    Remove Content
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Flag className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600">No content has been flagged</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatDashboard;