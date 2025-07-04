import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, testSupabaseConnection } from '../lib/supabase';
import { Users, Plus, ArrowRight, Search, Tag, Star, TrendingUp, Heart, Clock, MapPin, Lock, Crown, Shield, X, AlertTriangle, RefreshCw, MessageSquare, Calendar, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CommunityCard from '../components/community/CommunityCard';
import { learningSystem } from '../lib/ai/learningSystem';

interface Community {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  tags?: string[];
  activity_score?: number;
  recent_activity?: string;
  creator_profile?: {
    full_name: string;
    avatar_url?: string;
    role?: string;
  };
  match_score?: number;
  is_active?: boolean;
  deleted_at?: string | null;
  loading?: boolean;
}

interface UserProfile {
  interests?: string[];
  custom_interests?: string[];
  location?: string;
}

const COMMUNITIES_PER_PAGE = 12;

const CommunityListPage = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState<Community | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'featured' | 'all' | 'joined' | 'recommended' | 'trending'>(
    () => {
      if (!user) return 'all';
      return 'all';
    }
  );
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCommunities, setTotalCommunities] = useState(0);
  const [hasPostsTable, setHasPostsTable] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'member_count'>('created_at');

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setConnectionError(false); if (retryCount > 0) retryConnection(); };
    const handleOffline = () => { setIsOnline(false); setConnectionError(true); setError('Offline. Check your connection.'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [retryCount]);

  const retryConnection = async () => { 
    setLoading(true); 
    setError(''); 
    setConnectionError(false); 
    const isConnected = await testSupabaseConnection(); 
    if (isConnected) { 
      await fetchUserProfile(); 
      await fetchCommunities(1); 
    } else { 
      setConnectionError(true);
      setError('Still unable to connect to the server. Please try again.');
      setLoading(false); 
    } 
  };

  const checkPostsTable = async () => {
    try {
      await supabase.from('posts').select('id').limit(1);
      setHasPostsTable(true);
    } catch (err) {
      setHasPostsTable(false);
    }
  };

  const fetchUserProfile = async () => { 
    if (!user) return; 
    try { 
      const isConnected = await testSupabaseConnection(); 
      if (!isConnected) { 
        setConnectionError(true);
        setError('Connection failed. Check internet.');
        return; 
      } 
      const { data, error } = await supabase.from('profiles').select('interests, custom_interests, location').eq('id', user.id).maybeSingle(); 
      if (error) throw error; 
      setUserProfile(data); 
      const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role_id, roles(name)').eq('user_id', user.id); 
      setIsAdmin(!!roleData?.some(role => role.roles?.name === 'Platform Owner' || role.roles?.name === 'Platform Admin')); 
    } catch (err) { 
      console.error('Profile fetch error:', err); 
      setError('Failed to load profile.'); 
    } 
  };
  
  const fetchCommunities = async (page = 1) => { 
    try { 
      setLoading(true); 
      setError(''); 
      if (!isOnline) { 
        setConnectionError(true); 
        setError('Offline. Check connection.'); 
        return; 
      } 
      const isConnected = await testSupabaseConnection(); 
      if (!isConnected) { 
        setConnectionError(true); 
        setError('Server connection failed.'); 
        return; 
      } 

      if (hasPostsTable === null) await checkPostsTable();

      let countQuery = supabase.from('communities').select('*', { count: 'exact', head: true });
      if (!isAdmin) countQuery = countQuery.eq('is_active', true).is('deleted_at', null);
      const { count } = await countQuery;
      setTotalCommunities(count || 0);

      const from = (page - 1) * COMMUNITIES_PER_PAGE;
      const to = from + COMMUNITIES_PER_PAGE - 1;
      
      let query = supabase
        .from('communities')
        .select('id, name, description, image_url, created_at, created_by, tags, is_active, deleted_at')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (!isAdmin) query = query.eq('is_active', true).is('deleted_at', null); 
      const { data: communitiesData, error } = await query; 
      if (error) throw error; 

      const communityIds = communitiesData.map(c => c.id);

      const { data: memberCounts, error: memberCountError } = await supabase
        .rpc('get_community_member_counts', { community_ids: communityIds });
      if (memberCountError) throw memberCountError;

      const { data: memberships } = user ? await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
        .in('community_id', communityIds) : { data: [] };
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', communitiesData.map(c => c.created_by).filter(Boolean));
      
      const communitiesWithCounts = await Promise.allSettled(communitiesData.map(async (community) => {
        const memberCount = memberCounts?.find(mc => mc.community_id === community.id)?.member_count || 0;
        const is_member = user && memberships?.some(m => m.community_id === community.id);
        const creator_profile = creators?.find(c => c.id === community.created_by) || null;
        let recentPosts = 0;
        if (hasPostsTable) {
          const { count } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', community.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
          recentPosts = count || 0;
        }
        const match_score = userProfile && userProfile.interests && community.tags 
          ? Math.min(Math.round((community.tags.filter(tag => userProfile.interests.some(interest => tag.toLowerCase().includes(interest.toLowerCase()))).length / community.tags.length) * 100), 100) 
          : 0;
        return { 
          ...community, 
          member_count: memberCount, 
          is_member, 
          activity_score: hasPostsTable ? recentPosts : memberCount || 0, 
          recent_activity: hasPostsTable ? `${recentPosts} new posts today` : `${memberCount || 0} members`, 
          creator_profile, 
          match_score 
        }; 
      })); 
      
      const newCommunities = communitiesWithCounts
        .map((result, index) => ({
          ...communitiesData[index],
          loading: result.status === 'pending',
          ...(result.status === 'fulfilled' ? result.value : {})
        }));
      
      if (page === 1) {
        setCommunities(newCommunities);
      } else {
        setCommunities(prev => [...prev, ...newCommunities]);
      }
      
      // Set default tab to 'joined' only if user is a member of at least one active, non-deleted community
      if (user && newCommunities.some(community => community.is_member && community.is_active && !community.deleted_at)) {
        setActiveTab('joined');
      }

      setRetryCount(0); 
    } catch (err) { 
      console.error('Communities fetch error:', err); 
      setError('Failed to load communities.'); 
      if (page === 1) setCommunities([]); 
    } finally { 
      setLoading(false); 
    } 
  };
  
  const getRecommendedCommunities = () => userProfile ? [...communities].sort((a, b) => (b.match_score || 0) - (a.match_score || 0)).filter(community => (community.match_score || 0) > 0).slice(0, 6) : communities.slice(0, 6);
  
  const handleJoinCommunity = async (communityId: string, e?: React.MouseEvent) => { 
    if (e) { 
      e.preventDefault(); 
      e.stopPropagation(); 
    } 
    if (!user) { 
      const community = communities.find(c => c.id === communityId); 
      if (community) setShowJoinModal(community); 
      return; 
    } 
    try { 
      setJoiningCommunity(communityId); 
      const { error } = await supabase.from('community_members').insert({ user_id: user.id, community_id: communityId, role: 'member', joined_at: new Date().toISOString() }); 
      if (error) throw error; 
      setCommunities(communities.map(community => community.id === communityId ? { ...community, is_member: true } : community)); 
      setActiveTab('joined');
      
      // Trigger AI learning system to generate user interest vector
      try {
        await learningSystem.onUserJoinsCommunity(user.id, communityId);
      } catch (aiError) {
        console.warn('Failed to generate user interest vector:', aiError);
        // Don't show error to user - this is not critical
      }
    } catch (err) { 
      setError('Failed to join community.'); 
    } finally { 
      setJoiningCommunity(null); 
    } 
  };
  
  const handleLeaveCommunity = async (communityId: string, e?: React.MouseEvent) => { 
    if (e) { 
      e.preventDefault(); 
      e.stopPropagation(); 
    } 
    if (!user) return; 
    try { 
      const { error } = await supabase.from('community_members').delete().eq('user_id', user.id).eq('community_id', communityId); 
      if (error) throw error; 
      setCommunities(communities.map(community => community.id === communityId ? { ...community, is_member: false } : community)); 
      // Switch to 'all' if no active, non-deleted communities are joined
      const joinedCommunities = communities.filter(c => c.is_member && c.id !== communityId && c.is_active && !c.deleted_at);
      if (joinedCommunities.length === 0) {
        setActiveTab('all');
      }
    } catch (err) { 
      setError('Failed to leave community.'); 
    } 
  };
  
  const handleCommunityClick = (community: Community) => { 
    if (!isAdmin && (community.deleted_at || !community.is_active)) {
      setError(`This community is ${community.deleted_at ? 'deleted' : 'deactivated'} and cannot be accessed.`);
      return;
    }
    if (user && community.is_member) window.location.href = `/community/${community.id}`; 
    else if (user && !community.is_member) handleJoinCommunity(community.id); 
    else setShowJoinModal(community); 
  };
  
  const loadMoreCommunities = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchCommunities(nextPage);
  };
  
  useEffect(() => { 
    const initializePage = async () => { 
      await fetchUserProfile(); 
      await fetchCommunities(1); 
    }; 
    initializePage(); 
  }, [user]);
  
  const getJoinedCommunities = () => communities.filter(community => community.is_member && (isAdmin || (community.is_active && !community.deleted_at)));
  
  const getFilteredCommunities = () => { 
    let filtered = communities; 
    if (searchTerm) filtered = filtered.filter(community => community.name.toLowerCase().includes(searchTerm.toLowerCase()) || community.description.toLowerCase().includes(searchTerm.toLowerCase()) || community.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))); 
    
    switch (activeTab) {
      case 'joined':
        return filtered.filter(community => community.is_member && (isAdmin || (community.is_active && !community.deleted_at)));
      case 'recommended':
        return getRecommendedCommunities();
      case 'trending':
        return filtered
          .filter(c => c.activity_score > 5 && !c.deleted_at && c.is_active !== false)
          .sort((a, b) => (b.activity_score || 0) - (a.activity_score || 0));
      case 'all':
        return isAdmin 
          ? filtered.filter(community => community.deleted_at === null && community.is_active !== false)
              .sort((a, b) => {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                if (sortBy === 'member_count') return (b.member_count || 0) - (a.member_count || 0);
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
          : filtered;
      case 'featured':
      default:
        return filtered.filter(c => c.member_count > 5 && !c.deleted_at && c.is_active !== false)
          .sort(() => 0.5 - Math.random())
          .slice(0, 5);
    }
  };
  
  const joinedCommunities = getJoinedCommunities();
  const filteredCommunities = getFilteredCommunities();
  const recommendedCommunities = getRecommendedCommunities();
  const featuredCommunities = communities
    .filter(c => c.member_count > 5 && !c.deleted_at && c.is_active !== false)
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  const totalPages = Math.ceil(totalCommunities / COMMUNITIES_PER_PAGE);
  const hasMoreCommunities = currentPage < totalPages;

  useEffect(() => {
    if (!isScrolling && featuredCommunities.length > 0) {
      const interval = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % featuredCommunities.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [featuredCommunities.length, isScrolling]);

  useEffect(() => {
    if (carouselRef.current && featuredCommunities.length > 0) {
      const scrollAmount = carouselRef.current.offsetWidth * carouselIndex;
      carouselRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [carouselIndex, featuredCommunities.length]);

  useEffect(() => {
    if (user && communities.some(c => c.is_member)) {
      setActiveTab('joined');
    }
  }, [user, communities]);

  const JoinModal = ({ community, onClose }: { community: Community; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div className="bg-white rounded-xl max-w-md w-full p-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="h-8 w-8 text-white" /></div>
          <h3 className="text-xl font-semibold mb-2">Join "{community.name}"</h3>
          {community.member_count && community.member_count >= 20 ? (
            <p className="text-neutral-600 mb-6">Connect with {community.member_count} people who share your passion.</p>
          ) : (
            <p className="text-neutral-600 mb-6">Be one of the first to join and help grow this community!</p>
          )}
          <div className="space-y-2 text-sm text-purple-600 mb-6">
            <div className="flex items-center"><MessageSquare className="h-4 w-4 mr-2" />Live chat</div>
            <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" />Events</div>
          </div>
          <div className="space-y-3">
            <Link to="/register" className="btn-primary w-full text-center block" onClick={() => { sessionStorage.setItem('redirectUrl', `/communities`); sessionStorage.setItem('joinCommunityId', community.id); }}>Create Free Account</Link>
            <Link to="/login" className="btn-outline w-full text-center block" onClick={() => { sessionStorage.setItem('redirectUrl', '/communities'); sessionStorage.setItem('joinCommunityId', community.id); }}>Sign In</Link>
            <button onClick={onClose} className="mt-4 text-neutral-500 hover:text-neutral-700 text-sm">Maybe later</button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  if (loading && currentPage === 1) return (
    <div className="min-h-screen bg-neutral-50 pt-12">
      <div className="container">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="h-48 bg-neutral-200"></div>
                <div className="p-6">
                  <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-full mb-2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 pt-12 pb-8">
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="container text-center text-white relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Discover Your Community
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/90 text-lg md:text-xl mb-8 max-w-2xl mx-auto"
          >
            Connect with like-minded people who share your passion
          </motion.p>
        </div>
      </div>

      {featuredCommunities.length > 0 && (
        <div className="py-12 bg-white">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">Featured Communities</h2>
            
            <div className="relative">
              <div 
                ref={carouselRef}
                className="flex overflow-x-hidden snap-x snap-mandatory"
                onMouseDown={() => setIsScrolling(true)}
                onMouseUp={() => setIsScrolling(false)}
                onMouseLeave={() => setIsScrolling(false)}
              >
                {featuredCommunities.map((community, index) => (
                  <div 
                    key={community.id} 
                    className="min-w-full snap-center px-4"
                  >
                    <motion.div 
                      className={`bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-500 ${carouselIndex === index ? 'scale-100' : 'scale-95 opacity-70'}`}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      style={{
                        perspective: '1000px',
                        transformStyle: 'preserve-3d',
                      }}
                      onClick={() => handleCommunityClick(community)}
                    >
                      <div className="relative h-48 sm:h-64 overflow-hidden">
                        <img 
                          src={community.image_url || 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'} 
                          alt={community.name} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                          <h3 className="text-2xl font-bold text-white mb-2">{community.name}</h3>
                          <p className="text-white/90 line-clamp-2">{community.description}</p>
                          <div className="flex items-center mt-4">
                            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm mr-3">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{community.member_count} members</span>
                            </div>
                            {community.tags && community.tags.length > 0 && (
                              <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
                                <Tag className="h-4 w-4 mr-1" />
                                <span>{community.tags[0]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="flex items-center text-sm text-neutral-500 mr-4">
                              <TrendingUp className="h-4 w-4 mr-1 text-primary-500" />
                              <span>Active now</span>
                            </div>
                            <div className="flex items-center text-sm text-neutral-500">
                              <MessageSquare className="h-4 w-4 mr-1 text-primary-500" />
                              <span>{community.recent_activity}</span>
                            </div>
                          </div>
                          {user ? (
                            community.is_member ? (
                              <Link 
                                to={`/community/${community.id}`}
                                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
                                aria-label={`Enter ${community.name} community`}
                              >
                                Enter
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Link>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinCommunity(community.id);
                                }}
                                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
                                disabled={joiningCommunity === community.id}
                                aria-label={`Join ${community.name} community`}
                              >
                                {joiningCommunity === community.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Joining...
                                  </>
                                ) : (
                                  'Join Now'
                                )}
                              </button>
                            )
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowJoinModal(community);
                              }}
                              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center"
                              aria-label={`Join ${community.name} community`}
                            >
                              Join Now
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-6">
                {featuredCommunities.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCarouselIndex(index)}
                    className={`h-3 w-3 mx-1 rounded-full transition-all ${
                      carouselIndex === index 
                        ? 'bg-primary-500 w-6' 
                        : 'bg-neutral-300 hover:bg-neutral-400'
                    }`}
                    aria-label={`Go to featured community ${index + 1}`}
                    aria-current={carouselIndex === index ? 'true' : 'false'}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container my-6">
        <div className="mb-6 border-b border-neutral-200 sticky top-0 bg-neutral-50 z-10">
          <div className="flex overflow-x-auto scrollbar-hide">
            {[
              { id: 'featured', label: 'Featured', icon: <Star className="h-4 w-4" /> },
              { id: 'trending', label: 'Trending', icon: <TrendingUp className="h-4 w-4" /> },
              { id: 'all', label: 'All Communities', icon: <Users className="h-4 w-4" /> },
              { id: 'joined', label: 'My Communities', icon: <Heart className="h-4 w-4" /> },
              { id: 'recommended', label: 'Recommended', icon: <Sparkles className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
                aria-label={`Show ${tab.label} communities`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
                {tab.id === 'joined' && joinedCommunities.length > 0 && (
                  <span className="ml-2 bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 text-xs">
                    {joinedCommunities.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="relative flex-grow max-w-md">
            <input 
              type="text" 
              placeholder="Search communities..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="input pl-10 w-full" 
              aria-label="Search communities"
            />
            <Search className="absolute left-3 top-3.5 text-neutral-400" size={18} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600" aria-label="Clear search"><X size={18} /></button>}
          </div>
          {user && <Link to="/communities/create" className="btn-primary flex items-center" aria-label="Create new community"><Plus className="h-5 w-5 mr-2" />Create</Link>}
          {activeTab === 'all' && (
            <div className="flex items-center">
              <span className="text-sm text-neutral-600 mr-2">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)} 
                className="border rounded-lg p-2 text-sm"
                aria-label="Sort communities"
              >
                <option value="created_at">Newest</option>
                <option value="name">Name</option>
                <option value="member_count">Most Members</option>
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
            {connectionError && (
              <button onClick={retryConnection} className="ml-4 btn-outline btn-sm text-red-600" aria-label="Retry connection">
                <RefreshCw className="h-4 w-4" />Retry
              </button>
            )}
          </div>
        )}

        <div className="mb-6">
          {totalCommunities > 0 && (
            <div className="mb-4 text-sm text-neutral-600">
              Showing {filteredCommunities.length} of {totalCommunities} communities (Page {currentPage} of {totalPages})
            </div>
          )}

          {activeTab === 'joined' && communities.some(c => c.is_member && (!c.is_active || c.deleted_at)) && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Some of your joined communities are deactivated or deleted and are not shown.</span>
            </div>
          )}

          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCommunities.map((community) => (
              <CommunityCard 
                key={community.id} 
                community={community} 
                onClick={() => handleCommunityClick(community)} 
                isRecommended={activeTab === 'recommended' || (community.match_score && community.match_score > 70)}
                isTrending={activeTab === 'trending' || (community.activity_score && community.activity_score > 5)}
                loading={community.loading}
              />
            ))}
          </motion.div>

          {activeTab === 'all' && hasMoreCommunities && !loading && (
            <div className="text-center mt-8">
              <button
                onClick={loadMoreCommunities}
                className="btn-outline px-8 py-3 text-lg"
                aria-label="Load more communities"
              >
                Load More Communities
              </button>
            </div>
          )}

          {loading && currentPage > 1 && (
            <div className="text-center mt-8">
              <div className="inline-flex items-center px-4 py-2 text-neutral-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
                Loading more communities...
              </div>
            </div>
          )}

          {filteredCommunities.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Communities Found</h3>
              <p className="text-neutral-600 mb-6">
                {searchTerm 
                  ? "No communities match your search. Try different keywords."
                  : activeTab === 'joined'
                    ? "You haven't joined any active communities yet. Explore 'All' or 'Recommended' tabs to find your community!"
                    : activeTab === 'recommended'
                      ? "We don't have any recommendations for you yet. Try joining some communities first!"
                      : activeTab === 'trending'
                        ? hasPostsTable === false
                          ? "Trending communities not available. Join or create communities to see trending activity!"
                          : "No trending communities at the moment. Check back later or create your own!"
                        : "No communities found with the current filters."}
              </p>
              <Link to="/communities/create" className="btn-primary" aria-label="Create new community">Create Community</Link>
            </div>
          )}
        </div>
      </div>

      {showJoinModal && <JoinModal community={showJoinModal} onClose={() => setShowJoinModal(null)} />}
    </div>
  );
};

export default CommunityListPage;