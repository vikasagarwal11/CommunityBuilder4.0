import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CommunityAdminMessaging from '../components/community/CommunityAdminMessaging';

interface Community {
  id: string;
  name: string;
  description: string;
}

const CommunityAdminMessagesPage = () => {
  const { id: communityId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAdminAndFetchCommunity = async () => {
      if (!user || !communityId) return;

      try {
        // Check if user is admin of this community
        const { data: memberData, error: memberError } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', communityId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        const userIsAdmin = memberData?.role === 'admin' || memberData?.role === 'co-admin';
        setIsAdmin(userIsAdmin);

        if (!userIsAdmin) {
          setError('You must be a community admin to access this page.');
          return;
        }

        // Fetch community details
        const { data: communityData, error: communityError } = await supabase
          .from('communities')
          .select('id, name, description')
          .eq('id', communityId)
          .single();

        if (communityError) throw communityError;
        setCommunity(communityData);

      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to load community information.');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetchCommunity();
  }, [user, communityId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="container max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
            <p className="text-neutral-600 mb-6">
              {error || 'You do not have permission to access this page.'}
            </p>
            <Link to="/communities" className="btn-primary">
              Back to Communities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="container max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-4">Admin Access Required</h1>
            <p className="text-neutral-600 mb-6">
              You must be a community administrator to access the messaging system.
            </p>
            <Link to={`/community/${communityId}`} className="btn-primary">
              Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container max-w-6xl">
        <div className="mb-6">
          <Link 
            to={`/community/${communityId}`} 
            className="flex items-center text-primary-500 hover:text-primary-600 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to {community.name}
          </Link>
          
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-500 mr-2" />
            <h1 className="text-2xl font-semibold">Community Admin Messages</h1>
          </div>
          <p className="text-neutral-600 mt-1">
            Manage conversations with members of "{community.name}"
          </p>
        </div>

        <CommunityAdminMessaging 
          communityId={communityId!} 
          communityName={community.name}
        />
      </div>
    </div>
  );
};

export default CommunityAdminMessagesPage;