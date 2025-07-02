import React from 'react';
import { ThumbsUp, ThumbsDown, Share2, MessageSquare, Volume2, VolumeX, Heart, AlertTriangle } from 'lucide-react';
import UserAvatar from '../profile/UserAvatar';
import AIMessageControls from './AIMessageControls';
import MessageReactions from './MessageReactions';

interface AIMessageBubbleProps {
  message: {
    id: string;
    content: string;
    model?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    audioUrl?: string;
    isLoading?: boolean;
    attachments?: {
      url: string;
      type: string;
      name: string;
    }[];
    communityPostId?: string;
  };
  isAudioPlaying: boolean;
  onToggleAudio: () => void;
  getModelIcon: (model: string) => React.ReactNode;
  getModelColor: (model: string) => string;
  onPostToFeed: (messageId: string) => void;
  onReply: (messageId: string) => void;
  messageId?: string;
}

const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({
  message,
  isAudioPlaying,
  onToggleAudio,
  getModelIcon,
  getModelColor,
  onPostToFeed,
  onReply,
  messageId
}) => {
  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'negative':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[80%]">
      <div className="flex items-center mb-1 space-x-1">
        <UserAvatar size="sm" />
        <span className="text-xs text-neutral-500">AI Assistant</span>
        {message.model && !message.isLoading && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full flex items-center ${getModelColor(message.model)}`}>
            {getModelIcon(message.model)}
            <span className="ml-1">{message.model.split('-')[0]}</span>
          </span>
        )}
        {message.sentiment && getSentimentIcon(message.sentiment)}
        {message.audioUrl && (
          <button
            onClick={onToggleAudio}
            className="p-1 text-neutral-500 hover:text-neutral-700 rounded-full"
            title={isAudioPlaying ? "Pause voice" : "Play voice"}
          >
            {isAudioPlaying ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </button>
        )}
      </div>
      
      <div className="rounded-lg p-3 bg-neutral-100 text-neutral-800">
        {message.isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {message.attachments.map((attachment, index) => (
                  attachment.type.startsWith('image/') ? (
                    <div key={index} className="relative rounded-lg overflow-hidden">
                      <img 
                        src={attachment.url} 
                        alt={attachment.name} 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ) : (
                    <div key={index} className="p-2 bg-neutral-200 rounded-lg text-xs flex items-center">
                      <span>{attachment.name}</span>
                    </div>
                  )
                ))}
              </div>
            )}
            {!message.isLoading && (
              <>
                <AIMessageControls
                  messageId={message.id}
                  onFeedback={(id, isPositive) => {/* Implement feedback logic if needed */}}
                  onPostToFeed={onPostToFeed}
                  onReply={onReply}
                  feedbackGiven={null}
                />
                <MessageReactions
                  messageId={message.id}
                  sourceTable={message.communityPostId ? 'community_posts' : 'ai_chats'}
                  className="justify-start mt-1"
                  isTemporary={message.isLoading}
                  onReply={onReply}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIMessageBubble;