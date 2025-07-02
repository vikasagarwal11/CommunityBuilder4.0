import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Target, Users, Calendar, MessageSquare, RefreshCw, Tag, X, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { googleAI, type CommunityProfile } from '../../lib/ai/googleAI';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

interface CommunityAIProfileProps {
  communityId: string;
  isAdmin: boolean;
  onClose: () => void;
}

const CommunityAIProfile: React.FC<CommunityAIProfileProps> = ({ 
  communityId, 
  isAdmin, 
  onClose 
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [communityData, setCommunityData] = useState<any>(null);

  useEffect(() => {
    fetchCommunityProfile();
    fetchCommunityData();
  }, [communityId]);

  const fetchCommunityData = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('name, description, tags')
        .eq('id', communityId)
        .single();
        
      if (error) throw error;
      setCommunityData(data);
    } catch (error) {
      console.error('Error fetching community data:', error);
    }
  };

  const fetchCommunityProfile = async () => {
    try {
      setLoading(true);
      setError('');
      
      const communityProfile = await googleAI.getCommunityProfile(communityId);
      setProfile(communityProfile);
    } catch (error) {
      console.error('Error fetching community profile:', error);
      setError('Failed to load AI profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isAdmin) return;
    
    try {
      setRefreshing(true);
      setError('');
      
      if (!communityData) {
        throw new Error('Community data not found');
      }
      
      // Add fallback values for empty fields
      const enhancedCommunity = {
        name: communityData.name,
        description: communityData.description || 'A community for sharing and connecting',
        tags: communityData.tags?.length > 0 ? communityData.tags : ['community', 'sharing', 'connecting']
      };
      
      // Try to generate profile with enhanced data
      const newProfile = await googleAI.generateCommunityProfile(
        communityId,
        enhancedCommunity.name,
        enhancedCommunity.description,
        enhancedCommunity.tags
      );
      
      setProfile(newProfile);
    } catch (error) {
      console.error('Error refreshing community profile:', error);
      
      // Create a default profile if generation fails
      try {
        if (communityData) {
          const defaultProfile = await createDefaultProfile();
          setProfile(defaultProfile);
          setError('AI profile generation failed. Using default profile instead.');
        } else {
          setError('Failed to refresh AI profile. Community data not available.');
        }
      } catch (fallbackError) {
        setError('Failed to refresh AI profile. Please try again later.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const createDefaultProfile = async (): Promise<CommunityProfile> => {
    // Create a basic profile based on community data
    const defaultProfile: CommunityProfile = {
      id: communityId,
      name: communityData.name,
      description: communityData.description,
      tags: communityData.tags || [],
      purpose: `A community for people interested in ${communityData.name.toLowerCase()}`,
      tone: 'supportive',
      targetAudience: ['Community members', 'Enthusiasts'],
      commonTopics: communityData.tags || ['General discussion'],
      eventTypes: ['Meetups', 'Discussions', 'Workshops'],
      createdAt: new Date().toISOString()
    };
    
    // Save the default profile
    await supabase.from('ai_community_profiles').insert({
      community_id: communityId,
      purpose: defaultProfile.purpose,
      tone: defaultProfile.tone,
      target_audience: defaultProfile.targetAudience,
      common_topics: defaultProfile.commonTopics,
      event_types: defaultProfile.eventTypes,
      created_at: defaultProfile.createdAt
    });
    
    return defaultProfile;
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'casual':
        return 'bg-green-100 text-green-700';
      case 'supportive':
        return 'bg-blue-100 text-blue-700';
      case 'professional':
        return 'bg-purple-100 text-purple-700';
      case 'motivational':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">AI Community Profile</h2>
                <p className="text-sm text-neutral-500">
                  AI-generated insights about this community
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isAdmin && (
                <button
                  onClick={handleRefresh}
                  className="p-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                  disabled={refreshing}
                  title="Refresh AI profile"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{error}</p>
                  <p className="mt-1 text-sm">
                    This could be due to API limitations or connectivity issues. 
                    You can try again later or use the default profile.
                  </p>
                  {isAdmin && !profile && (
                    <button
                      onClick={async () => {
                        try {
                          const defaultProfile = await createDefaultProfile();
                          setProfile(defaultProfile);
                          setError('');
                        } catch (err) {
                          setError('Failed to create default profile. Please try again later.');
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                    >
                      Use Default Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-8 flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-neutral-600">Generating AI profile...</p>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Community Purpose */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-500" />
                  Community Purpose
                </h3>
                <p className="text-neutral-700">{profile.purpose}</p>
              </div>

              {/* Community Tone */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                  Communication Tone
                </h3>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${getToneColor(profile.tone)}`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {profile.tone.charAt(0).toUpperCase() + profile.tone.slice(1)}
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {profile.tone === 'casual' && 'Friendly and relaxed communication style'}
                  {profile.tone === 'supportive' && 'Encouraging and helpful communication style'}
                  {profile.tone === 'professional' && 'Formal and informative communication style'}
                  {profile.tone === 'motivational' && 'Energetic and inspiring communication style'}
                </p>
              </div>

              {/* Target Audience */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-500" />
                  Target Audience
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.targetAudience ?? []).map((audience, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
                      {audience}
                    </span>
                  ))}
                </div>
              </div>

              {/* Common Topics */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-blue-500" />
                  Common Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.commonTopics ?? []).map((topic, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Event Types */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                  Recommended Event Types
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.eventTypes ?? []).map((eventType, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                      {eventType}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI-powered recommendations */}
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                    AI Recommendations
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Based on community profile analysis
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Content Suggestions</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Share success stories related to {(profile.commonTopics ?? [])[0] || 'community topics'} to inspire members
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Create weekly discussion threads about {(profile.commonTopics ?? [])[1] || 'popular topics'} challenges
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Post tips and resources specifically for {(profile.targetAudience ?? [])[0] || 'community members'}
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Engagement Ideas</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Host a "{(profile.eventTypes ?? [])[0] || 'community event'}\" event to bring members together
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Create a monthly challenge related to {(profile.commonTopics ?? [])[0] || 'community interests'}
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Encourage members to share their progress with weekly check-ins
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-500 text-center mt-4">
                <p>This AI-generated profile is based on community data and will improve over time.</p>
                <p>Last updated: {new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-600">No AI profile available. Please try refreshing.</p>
              {isAdmin && (
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  disabled={refreshing}
                >
                  {refreshing ? 'Generating...' : 'Generate AI Profile'}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommunityAIProfile;