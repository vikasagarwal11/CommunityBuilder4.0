import { useState } from 'react';

const CommunityFilters = ({ filters, setFilters }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(true)} className="p-2 bg-blue-500 text-white rounded">
        Filters
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-start"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="absolute top-0 left-0 h-full w-64 bg-white p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-500">
              Close
            </button>
            <div>
              <label className="text-sm mb-2 block">Tags</label>
              <input
                type="checkbox"
                checked={filters.tags || false}
                onChange={(e) => toggleFilter('tags', e.target.checked)}
              />
            </div>
            <div className="mt-4">
              <label className="text-sm mb-2 block">Member Count</label>
              <input
                type="range"
                value={filters.memberCount || 0}
                onChange={(e) => toggleFilter('memberCount', parseInt(e.target.value))}
                min="0"
                max="1000"
                step="10"
              />
              <span className="text-sm">{filters.memberCount || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityFilters;