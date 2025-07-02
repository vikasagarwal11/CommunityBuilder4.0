import React, { useState } from 'react';
import { MoreVertical, Share2, MessageSquare, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '../profile/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';

interface UserMessage {
  id: string;
  content: string;
  timestamp: Date;
  attachments?: any[];
  communityPostId?: string;
}

interface UserMessageBubbleProps {
  message: UserMessage;
  showMessageMenu: string | null;
  communityId: string;
  onShowMessageMenu: (messageId: string | null) => void;
  voiceEnabled?: boolean;
  onTranscription?: (text: string) => void;
  isAdmin?: boolean;
  isTemporary?: boolean;
  onPostToFeed?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  messageId?: string;
}

const UserMessageBubble: React.FC<UserMessageBubbleProps> = ({
  message,
  showMessageMenu,
  communityId,
  onShowMessageMenu,
  voiceEnabled = false,
  onTranscription,
  isAdmin = false,
  isTemporary = false,
  onPostToFeed,
  onReply,
}) => {
  const { user } = useAuth();

  const handlePostToFeedClick = () => {
    if (onPostToFeed && message.id && !isTemporary) {
      onPostToFeed(message.id);
      onShowMessageMenu(null);
    }
  };

  const handleReplyClick = () => {
    if (onReply && message.id) {
      onReply(message.id);
      onShowMessageMenu(null);
    }
  };

  return (
    <div className="flex justify-end mb-2">
      <div className="max-w-xs lg:max-w-md">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <div className="bg-primary-500 text-white rounded-2xl rounded-br-md px-3 py-2 relative">
              {isTemporary && (
                <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-1" title="Message being saved...">
                  <AlertTriangle className="h-3 w-3" />
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-1 space-y-1">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="text-xs bg-primary-600 rounded px-2 py-1">
                      📎 {attachment.name || `Attachment ${index + 1}`}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-primary-100">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="relative">
                  <button
                    onClick={() => onShowMessageMenu(showMessageMenu === message.id ? null : message.id)}
                    className="text-primary-100 hover:text-white p-1 rounded"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>
                  <AnimatePresence>
                    {showMessageMenu === message.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-10 min-w-[120px]"
                      >
                        {onPostToFeed && !isTemporary && (
                          <button
                            onClick={handlePostToFeedClick}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                            title="Post to Community Feed"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Post to Feed
                          </button>
                        )}
                        {onReply && (
                          <button
                            onClick={handleReplyClick}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                            title="Reply"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Reply
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
          <UserAvatar userId={user?.id || ''} size="sm" className="flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default UserMessageBubble;