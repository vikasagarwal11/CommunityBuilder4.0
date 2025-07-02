import React, { useState } from 'react';
import { Clock, Search, Filter, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatSession {
  id: string;
  date: Date;
  title: string;
  preview: string;
  messageCount: number;
  models: string[];
}

interface AIMessageHistoryProps {
  sessions: ChatSession[];
  onSelectSession: (sessionId: string) => void;
  onClearHistory: () => void;
}

const AIMessageHistory: React.FC<AIMessageHistoryProps> = ({
  sessions,
  onSelectSession,
  onClearHistory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const filteredSessions = sessions.filter(session => {
    // Apply search filter
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          session.preview.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply date filter
    let matchesDate = true;
    const now = new Date();
    const sessionDate = new Date(session.date);
    
    if (dateFilter === 'today') {
      matchesDate = sessionDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      matchesDate = sessionDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      matchesDate = sessionDate >= monthAgo;
    }
    
    return matchesSearch && matchesDate;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary-500" />
          Chat History
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-neutral-500 hover:text-neutral-700"
        >
          {showFilters ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
      
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-sm"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Date filter */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Date Range
                </label>
                <div className="flex space-x-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setDateFilter(option.value as any)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        dateFilter === option.value
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {filteredSessions.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredSessions.map(session => (
            <div
              key={session.id}
              className="p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-medium text-sm">{session.title}</h4>
                <span className="text-xs text-neutral-500">
                  {session.date.toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-neutral-600 line-clamp-2 mb-2">
                {session.preview}
              </p>
              <div className="flex justify-between items-center">
                <div className="flex space-x-1">
                  {session.models.map((model, index) => {
                    let bgColor = 'bg-neutral-100';
                    let textColor = 'text-neutral-600';
                    
                    if (model.includes('grok') || model.includes('xai')) {
                      bgColor = 'bg-purple-100';
                      textColor = 'text-purple-700';
                    } else if (model.includes('gemini')) {
                      bgColor = 'bg-blue-100';
                      textColor = 'text-blue-700';
                    } else if (model.includes('mistral') || model.includes('groq')) {
                      bgColor = 'bg-green-100';
                      textColor = 'text-green-700';
                    }
                    
                    return (
                      <span 
                        key={index} 
                        className={`px-1.5 py-0.5 rounded-full text-xs ${bgColor} ${textColor}`}
                      >
                        {model.split('-')[0]}
                      </span>
                    );
                  })}
                </div>
                <span className="text-xs text-neutral-500">
                  {session.messageCount} messages
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
          <p className="text-neutral-500">No chat history found</p>
          <p className="text-xs text-neutral-400 mt-1">
            {searchTerm ? 'Try a different search term' : 'Your conversations will appear here'}
          </p>
        </div>
      )}
      
      {sessions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-between">
          <button
            onClick={onClearHistory}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Clear History
          </button>
          <span className="text-xs text-neutral-500">
            {sessions.length} total conversations
          </span>
        </div>
      )}
    </div>
  );
};

export default AIMessageHistory;