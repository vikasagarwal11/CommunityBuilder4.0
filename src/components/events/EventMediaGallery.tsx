import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Image, Film, X, Plus, Info, Grid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import EventMediaUploader from './EventMediaUploader';

interface EventMediaGalleryProps {
  eventId: string;
  communityId: string;
}

const EventMediaGallery = ({ eventId, communityId }: EventMediaGalleryProps) => {
  const { user } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  // Mock data for sample events
  const getMockMediaData = () => [
    {
      id: 'mock-1',
      media_url: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
      media_type: 'image',
      file_name: 'group-workout-session.jpg',
      file_size: 245760,
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      user_id: 'mock-user-1',
      user: {
        full_name: 'Sarah Johnson',
        avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100'
      }
    },
    {
      id: 'mock-2',
      media_url: 'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=800',
      media_type: 'image',
      file_name: 'fitness-equipment.jpg',
      file_size: 189440,
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      user_id: 'mock-user-2',
      user: {
        full_name: 'Mike Chen',
        avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100'
      }
    },
    {
      id: 'mock-3',
      media_url: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800',
      media_type: 'image',
      file_name: 'outdoor-training.jpg',
      file_size: 312320,
      created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      user_id: 'mock-user-3',
      user: {
        full_name: 'Emma Davis',
        avatar_url: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100'
      }
    }
  ];

  const fetchMedia = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if this is a sample/mock event
      if (eventId.startsWith('sample-')) {
        // Use mock data for sample events
        const mockData = getMockMediaData();
        setMedia(mockData);
        setLoading(false);
        return;
      }

      // Fetch media from event_media table for real events
      const { data, error } = await supabase
        .from('event_media')
        .select(`
          id,
          media_url,
          media_type,
          file_name,
          file_size,
          created_at,
          user_id,
          profiles:users!inner(
            profiles(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Format the data
      const formattedMedia = data?.map(item => ({
        ...item,
        user: item.profiles?.profiles || { full_name: 'Unknown User' }
      })) || [];
      
      setMedia(formattedMedia);
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    if (!user) return;

    // Skip admin check for sample events
    if (eventId.startsWith('sample-')) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(data?.role === 'admin' || data?.role === 'co-admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  useEffect(() => {
    fetchMedia();
    checkAdminStatus();
  }, [eventId, user]);

  const handleDelete = async (id: string) => {
    // Prevent deletion for mock data
    if (id.startsWith('mock-')) {
      setError('Cannot delete sample media');
      return;
    }

    if (!user || (!isAdmin && media.find(m => m.id === id)?.user_id !== user.id)) return;

    try {
      const { error } = await supabase
        .from('event_media')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update the UI
      setMedia(media.filter(item => item.id !== id));
      
      // Close media viewer if the deleted item was selected
      if (selectedMedia?.id === id) {
        setSelectedMedia(null);
      }
    } catch (err) {
      console.error('Error deleting media:', err);
      setError('Failed to delete media');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-neutral-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (showUploader) {
    return (
      <EventMediaUploader 
        eventId={eventId}
        onUploadComplete={() => {
          setShowUploader(false);
          fetchMedia();
        }}
        onCancel={() => setShowUploader(false)}
      />
    );
  }

  const isSampleEvent = eventId.startsWith('sample-');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold flex items-center">
          <Image className="h-5 w-5 mr-2 text-primary-500" />
          Event Media
        </h2>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-white rounded-lg border border-neutral-200 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid' 
                  ? 'bg-primary-500 text-white' 
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title="Grid view"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list' 
                  ? 'bg-primary-500 text-white' 
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          
          {user && !isSampleEvent && (
            <button
              onClick={() => setShowUploader(true)}
              className="btn-primary text-sm flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm">
          <Info className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Media gallery */}
      {media.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-lg">
          <Image className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No media yet</h3>
          <p className="text-neutral-600 mb-4">
            {isSampleEvent 
              ? "This is a sample event with no media to display."
              : "Be the first to add photos or videos from this event!"
            }
          </p>
          {user && !isSampleEvent && (
            <button
              onClick={() => setShowUploader(true)}
              className="btn-primary"
            >
              Add Media
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {media.map((item) => (
            <motion.div 
              key={item.id}
              className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedMedia(item)}
            >
              {item.media_type === 'image' ? (
                <img 
                  src={item.media_url} 
                  alt={item.file_name || 'Event media'} 
                  className="w-full h-full object-cover"
                />
              ) : item.media_type === 'video' ? (
                <div className="relative w-full h-full bg-neutral-900">
                  <video 
                    src={item.media_url}
                    className="w-full h-full object-contain"
                    controls={false}
                  />
                  <Film className="absolute inset-0 m-auto h-12 w-12 text-white opacity-70" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                  <Film className="h-12 w-12 text-neutral-400" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-sm font-medium truncate">
                    {item.user.full_name}
                  </p>
                  <p className="text-xs">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                {(isAdmin || item.user_id === user?.id) && !isSampleEvent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {media.map((item) => (
            <div 
              key={item.id}
              className="flex items-center bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => setSelectedMedia(item)}
            >
              <div className="flex-shrink-0 mr-4">
                {item.media_type === 'image' ? (
                  <div className="h-16 w-16 rounded overflow-hidden">
                    <img 
                      src={item.media_url} 
                      alt={item.file_name || 'Event media'} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : item.media_type === 'video' ? (
                  <div className="h-16 w-16 rounded overflow-hidden bg-neutral-900 flex items-center justify-center">
                    <Film className="h-8 w-8 text-white" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded bg-neutral-100 flex items-center justify-center">
                    <Film className="h-8 w-8 text-neutral-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {item.file_name || `${item.media_type} file`}
                </p>
                <div className="flex items-center text-xs text-neutral-500">
                  <span>Uploaded by {item.user.full_name}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  {item.file_size && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{formatFileSize(item.file_size)}</span>
                    </>
                  )}
                </div>
              </div>
              
              {(isAdmin || item.user_id === user?.id) && !isSampleEvent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="ml-4 p-2 text-neutral-400 hover:text-red-500 rounded-full hover:bg-neutral-100"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Media viewer modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 z-10"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex-1 overflow-hidden rounded-lg bg-black flex items-center justify-center">
              {selectedMedia.media_type === 'image' ? (
                <img 
                  src={selectedMedia.media_url} 
                  alt={selectedMedia.file_name || 'Event media'} 
                  className="max-w-full max-h-full object-contain"
                />
              ) : selectedMedia.media_type === 'video' ? (
                <video 
                  src={selectedMedia.media_url}
                  className="max-w-full max-h-full"
                  controls
                  autoPlay
                />
              ) : (
                <div className="text-white text-center">
                  <Film className="h-16 w-16 mx-auto mb-4" />
                  <p>This media type cannot be previewed</p>
                </div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedMedia.file_name || `${selectedMedia.media_type} file`}</p>
                  <p className="text-sm text-neutral-500">
                    Uploaded by {selectedMedia.user.full_name} on {new Date(selectedMedia.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                {(isAdmin || selectedMedia.user_id === user?.id) && !isSampleEvent && (
                  <button
                    onClick={() => handleDelete(selectedMedia.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventMediaGallery;