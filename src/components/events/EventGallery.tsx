import { useState, useEffect } from 'react';
import { Image, Film, X, Plus, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventGalleryProps {
  eventId: string;
  communityId: string;
}

const EventGallery = ({ eventId, communityId }: EventGalleryProps) => {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      
      // Use sample data for demonstration purposes
      const samplePhotos = [
        {
          id: 1,
          photo_url: "https://images.pexels.com/photos/6551133/pexels-photo-6551133.jpeg?auto=compress&cs=tinysrgb&w=400",
          caption: "Morning yoga session",
          created_at: "2025-05-15T08:30:00Z",
          user: { full_name: "Sarah Williams" }
        },
        {
          id: 2,
          photo_url: "https://images.pexels.com/photos/6551126/pexels-photo-6551126.jpeg?auto=compress&cs=tinysrgb&w=400",
          caption: "Mom & baby workout",
          created_at: "2025-05-10T10:15:00Z",
          user: { full_name: "Jessica Chen" }
        },
        {
          id: 3,
          photo_url: "https://images.pexels.com/photos/6551061/pexels-photo-6551061.jpeg?auto=compress&cs=tinysrgb&w=400",
          caption: "Strength training class",
          created_at: "2025-04-28T11:00:00Z",
          user: { full_name: "Michelle Park" }
        },
        {
          id: 4,
          photo_url: "https://images.pexels.com/photos/4571321/pexels-photo-4571321.jpeg?auto=compress&cs=tinysrgb&w=400",
          caption: "Weekend park run",
          created_at: "2025-04-20T09:00:00Z",
          user: { full_name: "Alicia Jones" }
        }
      ];
      
      setPhotos(samplePhotos);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [eventId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-neutral-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold flex items-center">
          <Image className="h-5 w-5 mr-2 text-primary-500" />
          {eventId === 'all' ? 'Community Photo Gallery' : 'Event Gallery'}
        </h2>
      </div>

      {/* Photo gallery */}
      {photos.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-lg">
          <Image className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No photos yet</h3>
          <p className="text-neutral-600 mb-4">
            {eventId === 'all' 
              ? 'No photos have been added to any events yet.'
              : 'Be the first to add photos from this event!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <motion.div 
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo.photo_url} 
                alt={photo.caption || 'Event photo'} 
                className="w-full h-full object-cover"
                loading="lazy"
                // Use srcset for responsive images
                srcSet={`${photo.photo_url} 400w, ${photo.photo_url} 800w`}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-sm font-medium truncate">
                    {photo.user.full_name}
                  </p>
                  <p className="text-xs">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Photo viewer modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 z-10"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex-1 overflow-hidden rounded-lg bg-black flex items-center justify-center">
              <img 
                src={selectedPhoto.photo_url} 
                alt={selectedPhoto.caption || 'Event photo'} 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            <div className="bg-white p-4 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedPhoto.caption || 'Event photo'}</p>
                  <p className="text-sm text-neutral-500">
                    Uploaded by {selectedPhoto.user.full_name} on {new Date(selectedPhoto.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventGallery;