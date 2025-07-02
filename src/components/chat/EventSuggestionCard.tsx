import React from 'react';
import { Calendar, Clock, MapPin, Users, Sparkles, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventSuggestionCardProps {
  suggestion: {
    title: string;
    description: string;
    date: string;
    time: string;
    location?: string;
    capacity?: number;
    tags?: string[];
    confidence: number;
  };
  onUse: () => void;
}

const EventSuggestionCard: React.FC<EventSuggestionCardProps> = ({
  suggestion,
  onUse
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-all"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-3">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold">{suggestion.title}</h3>
          <div className="flex items-center">
            <Sparkles className="h-4 w-4 text-primary-500 mr-1" />
            <span className="text-xs font-medium text-primary-700">
              {Math.round(suggestion.confidence * 100)}% match
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-neutral-700 mb-4 line-clamp-2">{suggestion.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-neutral-600">
            <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{formatDate(suggestion.date)}</span>
          </div>
          <div className="flex items-center text-sm text-neutral-600">
            <Clock className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{suggestion.time}</span>
          </div>
          {suggestion.location && (
            <div className="flex items-center text-sm text-neutral-600">
              <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
              <span>{suggestion.location}</span>
            </div>
          )}
          {suggestion.capacity && (
            <div className="flex items-center text-sm text-neutral-600">
              <Users className="h-4 w-4 mr-2 text-neutral-400" />
              <span>Capacity: {suggestion.capacity}</span>
            </div>
          )}
        </div>
        
        {suggestion.tags && suggestion.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {suggestion.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <button
          onClick={onUse}
          className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center justify-center text-sm font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Use This Suggestion
        </button>
      </div>
    </motion.div>
  );
};

export default EventSuggestionCard;