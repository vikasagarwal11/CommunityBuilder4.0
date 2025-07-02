import React from 'react';
import { Info, X, Brain, User, Users, Calendar } from 'lucide-react';

interface AIContextPanelProps {
  userProfile?: {
    interests?: string[];
    fitness_goals?: string[];
    experience_level?: string;
  };
  communityInfo?: {
    name: string;
    description: string;
    tags?: string[];
  };
  conversationContext?: {
    recentTopics: string[];
    messageCount: number;
    lastInteraction: Date;
  };
  onClose: () => void;
}

const AIContextPanel: React.FC<AIContextPanelProps> = ({
  userProfile,
  communityInfo,
  conversationContext,
  onClose
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary-500" />
          AI Context
        </h3>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-4">
        {/* User Profile Context */}
        {userProfile && (
          <div className="bg-neutral-50 rounded-lg p-3">
            <h4 className="text-sm font-medium flex items-center mb-2">
              <User className="h-4 w-4 mr-2 text-neutral-600" />
              Your Profile Context
            </h4>
            <div className="space-y-2 text-sm">
              {userProfile.interests && userProfile.interests.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500">Interests:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userProfile.interests.map((interest, index) => (
                      <span key={index} className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {userProfile.fitness_goals && userProfile.fitness_goals.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500">Fitness Goals:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userProfile.fitness_goals.map((goal, index) => (
                      <span key={index} className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {userProfile.experience_level && (
                <div>
                  <p className="text-xs text-neutral-500">Experience Level:</p>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">
                    {userProfile.experience_level}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Community Context */}
        {communityInfo && (
          <div className="bg-neutral-50 rounded-lg p-3">
            <h4 className="text-sm font-medium flex items-center mb-2">
              <Users className="h-4 w-4 mr-2 text-neutral-600" />
              Community Context
            </h4>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{communityInfo.name}</p>
              <p className="text-xs text-neutral-600">{communityInfo.description}</p>
              
              {communityInfo.tags && communityInfo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {communityInfo.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Conversation Context */}
        {conversationContext && (
          <div className="bg-neutral-50 rounded-lg p-3">
            <h4 className="text-sm font-medium flex items-center mb-2">
              <Calendar className="h-4 w-4 mr-2 text-neutral-600" />
              Conversation History
            </h4>
            <div className="space-y-2 text-sm">
              <p className="text-xs text-neutral-500">Recent Topics:</p>
              <div className="flex flex-wrap gap-1">
                {conversationContext.recentTopics.map((topic, index) => (
                  <span key={index} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                    {topic}
                  </span>
                ))}
              </div>
              
              <div className="flex justify-between text-xs text-neutral-500">
                <span>{conversationContext.messageCount} messages</span>
                <span>Last active: {conversationContext.lastInteraction.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-xs text-neutral-500 text-center">
          <p>This context helps the AI provide more personalized and relevant responses.</p>
          <p>You can update your profile information in your account settings.</p>
        </div>
      </div>
    </div>
  );
};

export default AIContextPanel;