import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { profileService } from '../lib/supabase';
import { User, Calendar, MapPin, Tag, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Profile } from '../lib/supabase';

const UserProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      
      try {
        setLoading(true);
        const profileData = await profileService.getProfileByUsername(username);
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Profile not found or an error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <User className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-4">Profile Not Found</h1>
            <p className="text-neutral-600 mb-6">
              {error || "The user profile you're looking for doesn't exist or has been removed."}
            </p>
            <Link to="/" className="btn-primary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container max-w-4xl">
        <div className="mb-6">
          <Link to="/" className="flex items-center text-primary-500 hover:text-primary-600">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Cover photo area - could be added in the future */}
          <div className="h-48 bg-gradient-to-r from-primary-500 to-secondary-500"></div>
          
          {/* Profile header */}
          <div className="relative px-6 sm:px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 mb-6">
              <div className="h-32 w-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-neutral-100">
                    <User className="h-16 w-16 text-neutral-400" />
                  </div>
                )}
              </div>
              
              <div className="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left">
                <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
                <p className="text-neutral-500">@{profile.username}</p>
              </div>
            </div>

            {/* Profile details */}
            <div className="space-y-6">
              {profile.bio && (
                <div>
                  <h2 className="text-lg font-semibold mb-2">About</h2>
                  <p className="text-neutral-700">{profile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal details */}
                <div className="space-y-4">
                  {profile.location && (
                    <div className="flex items-center text-neutral-700">
                      <MapPin className="h-5 w-5 mr-3 text-neutral-500" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  
                  {profile.experience_level && (
                    <div className="flex items-center text-neutral-700">
                      <Calendar className="h-5 w-5 mr-3 text-neutral-500" />
                      <span className="capitalize">{profile.experience_level} level</span>
                    </div>
                  )}
                </div>

                {/* Interests */}
                {(profile.interests?.length > 0 || profile.custom_interests?.length > 0) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {[...(profile.interests || []), ...(profile.custom_interests || [])].map((interest, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Share profile section */}
              <div className="mt-8 pt-6 border-t border-neutral-200">
                <h3 className="text-lg font-semibold mb-3">Share Profile</h3>
                <div className="flex items-center">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={`${window.location.origin}/user/${profile.username}`}
                      readOnly
                      className="input w-full bg-neutral-50"
                    />
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/user/${profile.username}`);
                      // Could add a toast notification here
                    }}
                    className="ml-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;