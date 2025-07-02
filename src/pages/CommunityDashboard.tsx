import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { communityService } from '../lib/supabase';
import { Plus, Users, Settings, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CreateCommunityForm from '../components/community/CreateCommunityForm';
import type { Community } from '../lib/types/community';

const CommunityDashboard = () => {
  const { user } = useAuth();
  const [ownedCommunities, setOwnedCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user) return;

      const communities = await communityService.getUserCommunities(user.id);
      
      setOwnedCommunities(
        communities
          .filter(c => c.role === 'admin')
          .map(c => c.communities)
      );
      
      setJoinedCommunities(
        communities
          .filter(c => c.role !== 'admin')
          .map(c => c.communities)
      );
    } catch (err) {
      setError('Failed to load communities');
      console.error('Error loading communities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [user]);

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchCommunities();
  };

  const CommunityCard = ({ community, isOwned = false }) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="h-32 overflow-hidden">
        <img 
          src={community.image_url || 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg'} 
          alt={community.name} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-2">{community.name}</h3>
        <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
          {community.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-neutral-500">
            <Users className="h-4 w-4 mr-1" />
            <span>12 members</span>
          </div>
          {isOwned ? (
            <Link 
              to={`/communities/${community.id}/admin`}
              className="flex items-center text-primary-500 hover:text-primary-600"
            >
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Link>
          ) : (
            <Link 
              to={`/communities/${community.id}`}
              className="flex items-center text-primary-500 hover:text-primary-600"
            >
              View
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="container">
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="h-32 bg-neutral-200"></div>
                  <div className="p-4">
                    <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-neutral-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Your Communities</h1>
          <button 
            className="btn-primary flex items-center"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Community
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Create New Community</h2>
              <button 
                className="text-neutral-500 hover:text-neutral-700"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
            <CreateCommunityForm onSuccess={handleCreateSuccess} />
          </div>
        )}

        {ownedCommunities.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6">Communities You Manage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownedCommunities.map(community => (
                <CommunityCard 
                  key={community.id} 
                  community={community} 
                  isOwned={true}
                />
              ))}
            </div>
          </div>
        )}

        {joinedCommunities.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Communities You've Joined</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joinedCommunities.map(community => (
                <CommunityCard 
                  key={community.id} 
                  community={community}
                />
              ))}
            </div>
          </div>
        )}

        {ownedCommunities.length === 0 && joinedCommunities.length === 0 && !showCreateForm && (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-4">No Communities Yet</h2>
            <p className="text-neutral-600 mb-8">
              Create your first community or join existing ones to get started.
            </p>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Community
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDashboard;