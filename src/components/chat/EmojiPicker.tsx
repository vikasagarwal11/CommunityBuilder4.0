import React, { useState, useEffect, useRef } from 'react';
import { Smile, Heart, ThumbsUp, Laugh, Angry, Frown, Search, X, Clock, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent emojis from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentEmojis');
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent emojis', e);
        setRecentEmojis([]);
      }
    }
    
    // Focus search input when opened
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Save recent emojis to localStorage when updated
  const addToRecent = (emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
    setRecentEmojis(updated);
    localStorage.setItem('recentEmojis', JSON.stringify(updated));
  };

  const handleEmojiClick = (emoji: string) => {
    addToRecent(emoji);
    onEmojiSelect(emoji);
    onClose();
  };

  const emojiCategories = {
    recent: {
      icon: <Clock className="h-5 w-5" />,
      title: 'Recent',
      emojis: recentEmojis
    },
    smileys: {
      icon: <Smile className="h-5 w-5" />,
      title: 'Smileys & Emotion',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕']
    },
    gestures: {
      icon: <ThumbsUp className="h-5 w-5" />,
      title: 'Gestures',
      emojis: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✊', '👊', '🤛', '🤜', '💪', '🦾', '🖐️', '✋', '🤚', '👋', '🤚', '🖖', '👌', '🤌', '🤏', '✌️']
    },
    hearts: {
      icon: <Heart className="h-5 w-5" />,
      title: 'Hearts & Love',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤']
    },
    activities: {
      icon: <Star className="h-5 w-5" />,
      title: 'Activities',
      emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴']
    },
    food: {
      icon: <Laugh className="h-5 w-5" />,
      title: 'Food & Drink',
      emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥣', '🥡', '🥢', '🧂']
    },
    nature: {
      icon: <Frown className="h-5 w-5" />,
      title: 'Nature',
      emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐾', '🐉', '🐲', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫️']
    },
    travel: {
      icon: <Angry className="h-5 w-5" />,
      title: 'Travel & Places',
      emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏢', '🏭', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁']
    }
  };

  // Get current category emojis
  const currentEmojis = emojiCategories[selectedCategory as keyof typeof emojiCategories]?.emojis || [];
  
  // Filter emojis based on search term
  const filteredEmojis = searchTerm 
    ? Object.values(emojiCategories).flatMap(cat => cat.emojis).filter(emoji => 
        emoji.includes(searchTerm) || 
        (emoji.codePointAt(0)?.toString(16) || '').includes(searchTerm.toLowerCase())
      )
    : currentEmojis;
  
  // Pagination
  const emojisPerPage = 42; // 6x7 grid
  const pageCount = Math.ceil(filteredEmojis.length / emojisPerPage);
  const paginatedEmojis = filteredEmojis.slice(
    currentPage * emojisPerPage, 
    (currentPage + 1) * emojisPerPage
  );

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-neutral-200 p-3 z-50 w-80"
    >
      {/* Search bar */}
      <div className="relative mb-3">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search emojis..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0); // Reset to first page on search
          }}
          className="w-full pl-8 pr-8 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-2.5 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex space-x-1 mb-3 overflow-x-auto pb-2 scrollbar-hide">
        {Object.entries(emojiCategories).map(([category, data]) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setSearchTerm('');
              setCurrentPage(0);
            }}
            className={`p-2 rounded-md transition-colors flex-shrink-0 ${
              selectedCategory === category && !searchTerm
                ? 'bg-primary-100 text-primary-600'
                : 'text-neutral-500 hover:bg-neutral-100'
            }`}
            title={data.title}
          >
            {data.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${searchTerm}-${currentPage}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto"
          >
            {paginatedEmojis.length > 0 ? (
              paginatedEmojis.map((emoji, index) => (
                <motion.button
                  key={`${emoji}-${index}`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEmojiClick(emoji)}
                  className="p-2 text-xl hover:bg-neutral-100 rounded-md transition-colors"
                >
                  {emoji}
                </motion.button>
              ))
            ) : (
              <div className="col-span-7 py-8 text-center text-neutral-500">
                <Smile className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                <p>No emojis found</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-neutral-200">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="p-1 rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-xs text-neutral-500">
            {currentPage + 1} / {pageCount}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(pageCount - 1, prev + 1))}
            disabled={currentPage === pageCount - 1}
            className="p-1 rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;