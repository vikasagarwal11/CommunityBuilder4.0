import { useState, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCommunities } from '../hooks/useCommunities';
import CommunityCard from '../components/community/CommunityCard'; // Adjust path if needed
import CommunityFilters from '../components/CommunityFilters';
import { motion } from 'framer-motion';

const COLUMN_WIDTH = 280;
const ROW_HEIGHT = 320;
const gutter = 16;

const CommunityBrowser = () => {
  const [filters, setFilters] = useState({});
  const { data, fetchNextPage, hasNextPage } = useCommunities(filters);
  const observerRef = useRef(null);

  const communities = data?.pages.flatMap((page) => page) || [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);

  const renderCommunity = ({ index, style }) => {
    if (index >= communities.length) return null;
    const community = communities[index];
    return (
      <div style={{ ...style, padding: `${gutter / 2}px` }}> {/* Add padding to prevent touching */}
        <CommunityCard
          key={community.id}
          community={community}
          onClick={(clickedCommunity) => handleCardClick(clickedCommunity.id)}
        />
      </div>
    );
  };

  const handleCardClick = (id: string) => {
    console.log('Community clicked:', id);
    window.alert(`Community ${id} clicked!`);
    // Add navigation logic here (e.g., window.location.href = `/community/${id}`)
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 min-h-screen">
      {/* Hero Carousel (Placeholder) */}
      <div className="h-48 bg-gray-200 mb-4 rounded-lg" />
      {/* Smart Rows */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Trending</h2>
        <div className="flex space-x-4 overflow-x-auto">
          {communities.slice(0, 3).map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onClick={(clickedCommunity) => handleCardClick(clickedCommunity.id)}
            />
          ))}
        </div>
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Recommended</h2>
        <div className="flex space-x-4 overflow-x-auto">
          {communities.slice(3, 6).map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onClick={(clickedCommunity) => handleCardClick(clickedCommunity.id)}
            />
          ))}
        </div>
      </div>
      {/* Filter Drawer */}
      <CommunityFilters filters={filters} setFilters={setFilters} />
      {/* Virtualized Grid */}
      <Grid
        columnCount={Math.floor(window.innerWidth / (COLUMN_WIDTH + gutter))}
        columnWidth={COLUMN_WIDTH + gutter}
        height={window.innerHeight - 200}
        rowCount={Math.ceil(communities.length / Math.floor(window.innerWidth / (COLUMN_WIDTH + gutter)))}
        rowHeight={ROW_HEIGHT + gutter}
        width={window.innerWidth}
      >
        {renderCommunity}
      </Grid>
    </div>
  );
};

export default CommunityBrowser;