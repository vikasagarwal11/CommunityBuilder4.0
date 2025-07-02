import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Image, Mic, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceInputButton from './VoiceInputButton';
import ImageUploadButton from './ImageUploadButton';
import EmojiPicker from './EmojiPicker';

interface MultimodalChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImagesSelected: (files: File[]) => void;
  imageAttachments: any[];
  onRemoveImage: (index: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MultimodalChatInput: React.FC<MultimodalChatInputProps> = ({
  value,
  onChange,
  onSend,
  onImagesSelected,
  imageAttachments,
  onRemoveImage,
  disabled = false,
  placeholder = "Type a message..."
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker && 
        emojiButtonRef.current && 
        !emojiButtonRef.current.contains(event.target as Node) &&
        !document.querySelector('.emoji-picker-container')?.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    // Insert emoji at cursor position
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newValue = value.substring(0, start) + emoji + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after the inserted emoji
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + emoji.length;
          textareaRef.current.selectionEnd = start + emoji.length;
          textareaRef.current.focus();
        }
      }, 0);
    } else {
      onChange(value + emoji);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    onChange(value + (value ? ' ' : '') + text);
  };

  return (
    <div className="w-full">
      {/* Image attachments preview */}
      {imageAttachments.length > 0 && (
        <div className="mb-2 p-2 bg-neutral-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-700">
              {imageAttachments.length} image{imageAttachments.length !== 1 ? 's' : ''} attached
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {imageAttachments.map((image, index) => (
              <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200">
                <img 
                  src={image.url} 
                  alt={`Attachment ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-0 right-0 p-1 bg-black/50 text-white rounded-bl-lg"
                >
                  <X className="h-3 w-3" />
                </button>
                {image.isAnalyzing && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white"></div>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => document.getElementById('additional-image-upload')?.click()}
              className="w-16 h-16 flex items-center justify-center border border-dashed border-neutral-300 rounded-lg hover:border-primary-300 text-neutral-400 hover:text-primary-500"
            >
              <Plus className="h-5 w-5" />
              <input
                id="additional-image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onImagesSelected(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
              />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center bg-neutral-50 rounded-lg p-2">
        <div className="relative">
          <button 
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
            title="Add emoji"
          >
            <Smile size={20} />
          </button>
          
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="emoji-picker-container"
              >
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <ImageUploadButton
          onImagesSelected={onImagesSelected}
          disabled={disabled}
        />
        
        <textarea 
          ref={textareaRef}
          className="flex-grow mx-2 bg-transparent resize-none outline-none py-2 max-h-32 min-h-[2.5rem]"
          placeholder={placeholder}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
        
        <VoiceInputButton
          onTranscription={handleVoiceTranscription}
          isListening={isListening}
          setIsListening={setIsListening}
        />
        
        <button 
          className={`p-2 rounded-full ${
            value.trim() || imageAttachments.length > 0 ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-neutral-200 text-neutral-500'
          }`}
          onClick={onSend}
          disabled={disabled || (value.trim() === '' && imageAttachments.length === 0)}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default MultimodalChatInput;