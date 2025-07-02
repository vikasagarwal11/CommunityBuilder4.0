import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { learningSystem } from '../../lib/ai/learningSystem';
import { Brain, RefreshCw, Users, Target, Zap, BarChart2, Calendar, Filter, Search, X, Download, ArrowRight } from 'lucide-react';

const AILearningDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedCommunity, timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch communities
      const { data: communitiesData } = await supabase
        .from('communities')
        .select('id, name')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true });
        
      setCommunities(communitiesData || []);
      
      // Fetch AI generation stats
      await fetchAIStats();
      
      // Fetch cross-community insights
      const crossCommunityInsights = await learningSystem.getCrossCommunityInsights();
      setInsights(crossCommunityInsights);
    } catch (error) {
      console.error('Error fetching AI learning data:', error);
      setError('Failed to load AI learning data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStats = async () => {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setDate(startDate.getDate() - 90);
      }
      
      // Build query
      let query = supabase
        .from('ai_generation_logs')
        .select('operation_type, status, created_at', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      // Filter by community if selected
      if (selectedCommunity) {
        query = query.eq('community_id', selectedCommunity);
      }
      
      const { count } = await query;
      
      // Get success rate
      let successQuery = supabase
        .from('ai_generation_logs')
        .select('id', { count: 'exact' })
        .eq('status', 'success')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (selectedCommunity) {
        successQuery = successQuery.eq('community_id', selectedCommunity);
      }
      
      const { count: successCount } = await successQuery;
      
      // Get operation type breakdown
      let operationQuery = supabase
        .from('ai_generation_logs')
        .select('operation_type, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
        
      if (selectedCommunity) {
        operationQuery = operationQuery.eq('community_id', selectedCommunity);
      }
      
      const { data: operationData } = await operationQuery;
      
      // Process operation data
      const operationCounts: Record<string, { total: number, success: number }> = {};
      
      operationData?.forEach(log => {
        if (!operationCounts[log.operation_type]) {
          operationCounts[log.operation_type] = { total: 0, success: 0 };
        }
        
        operationCounts[log.operation_type].total++;
        
        if (log.status === 'success') {
          operationCounts[log.operation_type].success++;
        }
      });
      
      // Calculate success rate
      const successRate = count ? (successCount || 0) / count * 100 : 0;
      
      // Get user insights count
      const { count: userInsightsCount } = await supabase
        .from('user_ai_insights')
        .select('id', { count: 'exact' });
        
      // Get recommendations count
      const { count: recommendationsCount } = await supabase
        .from('user_recommendations')
        .select('id', { count: 'exact' });
      
      setStats({
        totalOperations: count || 0,
        successRate,
        operationBreakdown: operationCounts,
        userInsightsCount: userInsightsCount || 0,
        recommendationsCount: recommendationsCount || 0
      });
    } catch (error) {
      console.error('Error fetching AI stats:', error);
      setError('Failed to load AI statistics');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError('');
      
      // Trigger cross-community learning
      await learningSystem.processCrossCommunityLearning();
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error refreshing AI learning data:', error);
      setError('Failed to refresh AI learning data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCommunity(e.target.value || null);
  };

  const handleTimeRangeChange = (range: '7d' | '30d' | '90d') => {
    setTimeRange(range);
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
        <h2 className="text-xl font-semibold flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary-500" />
          AI Learning System Dashboard
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="p-2 bg-neutral-100 rounded-lg text-neutral-600 hover:bg-neutral-200"
            disabled={refreshing}
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search AI operations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
            <Search className="absolute left-3 top-3.5 text-neutral-400" size={18} />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Community
              </label>
              <select
                value={selectedCommunity || ''}
                onChange={handleCommunityChange}
                className="input"
              >
                <option value="">All Communities</option>
                {communities.map(community => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Time Range
              </label>
              <div className="flex bg-neutral-100 rounded-lg p-1">
                <button
                  onClick={() => handleTimeRangeChange('7d')}
                  className={`px-3 py-1 text-xs rounded ${
                    timeRange === '7d' ? 'bg-white shadow-sm' : 'text-neutral-600'
                  }`}
                >
                  7d
                </button>
                <button
                  onClick={() => handleTimeRangeChange('30d')}
                  className={`px-3 py-1 text-xs rounded ${
                    timeRange === '30d' ? 'bg-white shadow-sm' : 'text-neutral-600'
                  }`}
                >
                  30d
                </button>
                <button
                  onClick={() => handleTimeRangeChange('90d')}
                  className={`px-3 py-1 text-xs rounded ${
                    timeRange === '90d' ? 'bg-white shadow-sm' : 'text-neutral-600'
                  }`}
                >
                  90d
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">Total AI Operations</p>
                <p className="text-3xl font-semibold mt-1">{stats.totalOperations}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Brain className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-neutral-500">Last {timeRange}</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">Success Rate</p>
                <p className="text-3xl font-semibold mt-1">{stats.successRate.toFixed(1)}%</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={stats.successRate > 90 ? 'text-green-500' : stats.successRate > 70 ? 'text-yellow-500' : 'text-red-500'}>
                {stats.successRate > 90 ? 'Excellent' : stats.successRate > 70 ? 'Good' : 'Needs improvement'}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">User Insights</p>
                <p className="text-3xl font-semibold mt-1">{stats.userInsightsCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-neutral-500">Individual user models</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">Recommendations</p>
                <p className="text-3xl font-semibold mt-1">{stats.recommendationsCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-100">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-neutral-500">Personalized suggestions</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Operation Breakdown */}
      {stats && Object.keys(stats.operationBreakdown).length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
            AI Operation Breakdown
          </h3>
          
          <div className="space-y-4">
            {Object.entries(stats.operationBreakdown)
              .sort(([, a]: [string, any], [, b]: [string, any]) => b.total - a.total)
              .map(([operation, data]: [string, any]) => (
                <div key={operation} className="flex items-center justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{operation.replace(/_/g, ' ')}</span>
                      <span className="text-sm text-neutral-500">
                        {data.success} / {data.total} ({((data.success / data.total) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full" 
                        style={{ width: `${(data.success / data.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Cross-Community Insights */}
      {insights && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-500" />
              Cross-Community Insights
            </h3>
            <button
              onClick={() => {/* Download insights */}}
              className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
          
          {/* Patterns */}
          {insights.patterns && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Common Patterns</h4>
              <div className="space-y-3">
                {insights.patterns.map((pattern: any, index: number) => (
                  <div key={index} className="p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{pattern.name}</p>
                        <p className="text-xs text-neutral-600">{pattern.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        pattern.prevalence === 'high' 
                          ? 'bg-green-100 text-green-700' 
                          : pattern.prevalence === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {pattern.prevalence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Success Factors */}
          {insights.successFactors && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Success Factors</h4>
              <div className="space-y-3">
                {insights.successFactors.map((factor: any, index: number) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-sm">{factor.factor}</p>
                    <p className="text-xs text-green-700">{factor.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Content Recommendations */}
          {insights.contentRecommendations && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Content Recommendations</h4>
              <div className="space-y-3">
                {insights.contentRecommendations.map((rec: any, index: number) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-sm">{rec.type}</p>
                    <p className="text-xs text-blue-700">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-center">
            <button
              onClick={() => {/* View detailed insights */}}
              className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center mx-auto"
            >
              View Full Insights <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}
      
      {/* Recent AI Operations */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="font-semibold">Recent AI Operations</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 text-left text-sm text-neutral-500">
                <th className="px-6 py-3 font-medium">Operation</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Community</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {/* This would be populated with real data */}
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="px-6 py-4">
                    <span className="capitalize">generate_profile</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      i % 3 === 0 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {i % 3 === 0 ? 'error' : 'success'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span>Community {i}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span>User {i}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-neutral-500 text-sm">
                      {new Date().toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AILearningDashboard;