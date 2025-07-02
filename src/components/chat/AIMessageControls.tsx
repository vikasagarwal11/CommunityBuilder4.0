import React from 'react';
import { ThumbsUp, ThumbsDown, Users, MessageSquare } from 'lucide-react';

interface AIMessageControlsProps {
  messageId: string;
  onFeedback: (messageId: string, isPositive: boolean) => void;
  onPostToFeed: (messageId: string) => void; // New prop for posting to feed
  onReply: (messageId: string) => void; // New prop for replying
  feedbackGiven?: 'positive' | 'negative' | null;
}

const AIMessageControls: React.FC<AIMessageControlsProps> = ({
  messageId,
  onFeedback,
  onPostToFeed,
  onReply,
  feedbackGiven
}) => {
  return (
    <div className="flex items-center justify-end space-x-2 mt-2">
      {/* Feedback buttons */}
      {feedbackGiven === null && (
        <>
          <button
            onClick={() => onFeedback(messageId, true)}
            className="p-1 text-neutral-400 hover:text-green-500 rounded-full"
            title="This was helpful"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onFeedback(messageId, false)}
            className="p-1 text-neutral-400 hover:text-red-500 rounded-full"
            title="This wasn't helpful"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </>
      )}
      
      {feedbackGiven === 'positive' && (
        <span className="text-xs text-green-600 flex items-center">
          <ThumbsUp className="h-3 w-3 mr-1" />
          Helpful
        </span>
      )}
      
      {feedbackGiven === 'negative' && (
        <span className="text-xs text-red-600 flex items-center">
          <ThumbsDown className="h-3 w-3 mr-1" />
          Not helpful
        </span>
      )}
      
      {/* New actions */}
      <button
        onClick={() => onPostToFeed(messageId)}
        className="p-1 text-neutral-400 hover:text-primary-500 rounded-full"
        title="Post to Feed"
      >
        <Users className="h-4 w-4" />
      </button>
      <button
        onClick={() => onReply(messageId)}
        className="p-1 text-neutral-400 hover:text-primary-500 rounded-full"
        title="Reply"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AIMessageControls;