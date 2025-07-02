import { useState } from 'react';
import { Users, Tag, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Community {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  member_count?: number;
  is_member?: boolean;
  tags?: string[];
  match_score?: number;
  is_active?: boolean;
  deleted_at?: string | null;
}

interface CommunityCardProps {
  community: Community;
  onClick?: (community: Community) => void; // Standardized to onClick
}

const CommunityCard = ({ community, onClick }: CommunityCardProps) => {
  const [imageError, setImageError] = useState(false);
  const placeholderImage = 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=400';
  const isDeleted = community.deleted_at !== null;
  const isInactive = community.is_active === false;
  const memberCount = community.member_count ?? 0;
  const score = typeof community.match_score === 'number' && !Number.isNaN(community.match_score) ? Math.round(community.match_score) : null;

  if (process.env.NODE_ENV === 'development' && community.match_score == null) {
    console.warn(`Community ${community.id} has no match_score`);
  }
  console.log('Rendering Community:', { id: community.id, member_count: memberCount, match_score: community.match_score });
  console.log('Received onClick:', onClick); // Debug the prop value

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('handleClick triggered for community:', community.id);
    onClick?.(community); // Safe invoke with community as argument
  };

  return (
    <motion.div
      onClick={handleClick}
      className="bg-white rounded-xl shadow-sm overflow-hidden w-full mb-4 cursor-pointer relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ zIndex: 0, position: 'relative', width: '100%', height: '100%' }}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={!imageError ? (community.image_url || placeholderImage) : placeholderImage}
          alt={community.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        {(isDeleted || isInactive) && (
          <div className="absolute top-2 right-2 z-10">
            <span className={`${isDeleted ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'} px-2 py-1 rounded-full text-xs font-medium`}>
              {isDeleted ? 'Deleted' : 'Inactive'}
            </span>
          </div>
        )}
        {score !== null && score > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
              {score}% Match
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900">{community.name}</h3>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1 text-gray-500" />
            <span className="text-sm text-gray-500">{memberCount}</span>
          </div>
        </div>
        <p className="text-gray-600 text-sm line-clamp-1 mb-2">{community.description}</p>
        <div className="flex gap-2 mb-2">
          {community.tags?.slice(0, 1).map((tag, index) => (
            <div key={index} className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
              <Tag className="w-3 h-3 mr-1 text-gray-700" />
              <span className="text-xs text-gray-700">{tag}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
            <MessageSquare className="w-3 h-3 mr-1 text-blue-500" />
            <span className="text-xs text-gray-600">Active</span>
          </div>
          <div className="flex items-center bg-gray-100 px-2 py-1 rounded-full">
            <Calendar className="w-3 h-3 mr-1 text-blue-500" />
            <span className="text-xs text-gray-600">Events</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CommunityCard;