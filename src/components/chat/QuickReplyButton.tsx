import React from 'react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickReplyButtonProps {
  message: string;
  onClick: (message: string) => void;
}

const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ message, onClick }) => {
  return (
    <motion.button
      onClick={() => onClick(message)}
      className="inline-flex items-center px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-full text-xs text-neutral-700 transition-colors"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageSquare className="h-3 w-3 mr-1 text-primary-500" />
      {message}
    </motion.button>
  );
};

export default QuickReplyButton;