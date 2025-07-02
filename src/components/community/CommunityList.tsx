import { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CommunityCard from './CommunityCard';

interface CommunityListProps {
  communities: any[];
  title: string;
  emptyMessage?: string;
  limit?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
  isLoading?: boolean;
}

const CommunityList = ({ 
  communities, 
  title, 
  emptyMessage = "No communities found", 
  limit = 6,
  showViewAll = true,
  viewAllLink = "/communities",
  isLoading = false
}: CommunityListProps) => {
  const [hoveredCommunity, setHoveredCommunity] = useState<string | null>(null);
  
  const displayedCommunities = limit ? communities.slice(0, limit) : communities;
  
  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4 animate-pulse"></div>
          {showViewAll && <div className="h-8 bg-neutral-200 rounded w-24 animate-pulse"></div>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(limit || 3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
              <div className="h-48 bg-neutral-200"></div>
              <div className="p-6 space-y-3">
                <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-full"></div>
                <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
                <div className="h-10 bg-neutral-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (communities.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6">{title}</h2>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showViewAll && communities.length > limit && (
          <Link 
            to={viewAllLink}
            className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCommunities.map(community => (
          <CommunityCard 
            key={community.id}
            community={community}
            onClick={() => window.location.href = `/community/${community.id}`}
            onMouseEnter={() => setHoveredCommunity(community.id)}
            onMouseLeave={() => setHoveredCommunity(null)}
            isHovered={hoveredCommunity === community.id}
          />
        ))}
      </div>
    </div>
  );
};

export default CommunityList;