import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressiveProfilingPromptProps {
  onDismiss: () => void;
}

const ProgressiveProfilingPrompt: React.FC<ProgressiveProfilingPromptProps> = ({ onDismiss }) => {
  const [timeLeft, setTimeLeft] = useState(10);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (timeLeft <= 0) {
      onDismiss();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onDismiss]);

  return (
    <AnimatePresence>
      <motion.div 
        className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4 border border-primary-100 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="font-medium text-primary-700">Personalize Your Experience</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Update your interests to get better recommendations and content
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link 
              to="/settings?tab=preferences"
              className="px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm flex items-center"
            >
              Update Interests
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
            <button
              onClick={onDismiss}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="mt-2 bg-white/50 rounded-full h-1 overflow-hidden">
          <div 
            className="bg-primary-500 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          ></div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProgressiveProfilingPrompt;