import React from 'react';
import { motion } from 'framer-motion';

interface AITypingIndicatorProps {
  model?: 'xai' | 'gemini' | 'groq';
}

const AITypingIndicator: React.FC<AITypingIndicatorProps> = ({ model = 'xai' }) => {
  const getColor = () => {
    switch (model) {
      case 'xai':
        return 'bg-purple-400';
      case 'gemini':
        return 'bg-blue-400';
      case 'groq':
        return 'bg-green-400';
      default:
        return 'bg-neutral-400';
    }
  };

  const dotColor = getColor();

  return (
    <div className="flex items-center space-x-2 p-3 bg-neutral-100 rounded-lg">
      <motion.div 
        className={`h-2 w-2 ${dotColor} rounded-full`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.div 
        className={`h-2 w-2 ${dotColor} rounded-full`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div 
        className={`h-2 w-2 ${dotColor} rounded-full`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
};

export default AITypingIndicator;