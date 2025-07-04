import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminNotificationCenter from '../admin/AdminNotificationCenter';

interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
  member_count: number;
}

const ProfileAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'communities'>('notifications');

  useEffect(() => {
    if (user) {
      fetchUserCommunities();
    }
  }, [user]);

  const fetchUserCommunities = async () => {
    try {
      setLoading(true);
      
      // Get communities where user is admin (check both 'admin' and 'ADMIN' roles)
      const { data: adminCommunities, error } = await supabase
        .from('community_members')
        .select(`
          community_id,
          communities (
            id,
            name,
            description,
            created_at,
            member_count
          )
        `)
        .eq('user_id', user?.id)
        .in('role', ['admin', 'ADMIN']);

      if (error) throw error;

      console.log('Admin communities found:', adminCommunities);
      const communityData = adminCommunities?.map(item => item.communities).filter(Boolean) || [];
      console.log('Processed community data:', communityData);
      setCommunities(communityData);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Communities to Manage</h3>
          <p className="mt-1 text-sm text-gray-500">
            You're not an admin of any communities yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Dashboard</h2>
            <p className="text-sm text-gray-600">
              Manage your {communities.length} communit{communities.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('communities')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'communities'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Communities
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'notifications' ? (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Admin Notifications</h3>
            <AdminNotificationCenter 
              isProfileView={true}
              communities={communities.map(c => c.id)}
            />
          </div>
        ) : (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Your Communities</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {community.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {community.description}
                      </p>
                      <div className="flex items-center mt-3 text-xs text-gray-500">
                        <span>{community.member_count || 0} members</span>
                        <span className="mx-2">•</span>
                        <span>
                          Created {new Date(community.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => window.location.href = `/community/${community.id}`}
                      className="flex-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Community
                    </button>
                    <button
                      onClick={() => window.location.href = `/community/${community.id}/admin`}
                      className="flex-1 bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileAdminDashboard; 