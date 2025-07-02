import React, { useState, useEffect } from 'react';
import { Zap, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { googleAI } from '../../lib/ai/googleAI';
import { motion } from 'framer-motion';

interface GoogleAISmartRepliesProps {
  message: {
    id: string;
    content: string;
    user_id: string;
  };
  onReplySelect: (reply: string) => void;
}

const GoogleAISmartReplies: React.FC<GoogleAISmartRepliesProps> = ({ 
  message, 
  onReplySelect 
}) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateReplies = async () => {
      if (!user || message.user_id === user.id) {
        // Don't generate replies to your own messages
        setReplies([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Analyze message to generate appropriate replies
        const analysis = await googleAI.analyzeMessage(message.content);
        
        // Generate smart replies based on message content
        let smartReplies: string[] = [];
        
        // Check if it's a question
        if (message.content.includes('?')) {
          if (analysis.topics.includes('workout') || analysis.keywords.includes('exercise')) {
            smartReplies.push("I usually do a mix of cardio and strength training!");
            smartReplies.push("I've found that morning workouts work best for my schedule.");
          } else if (analysis.topics.includes('nutrition') || analysis.keywords.includes('food')) {
            smartReplies.push("I try to focus on protein and veggies for most meals.");
            smartReplies.push("Meal prepping on Sundays has been a game-changer for me!");
          } else {
            smartReplies.push("That's a great question!");
            smartReplies.push("I've been wondering about that too.");
          }
        } 
        // Check if it's sharing an achievement
        else if (analysis.sentiment === 'positive' && 
                (message.content.toLowerCase().includes('did') || 
                 message.content.toLowerCase().includes('completed') ||
                 message.content.toLowerCase().includes('finished'))) {
          smartReplies.push("That's amazing! Great job! 👏");
          smartReplies.push("Way to go! How did it feel?");
          smartReplies.push("You're crushing it! 💪");
        }
        // Check if it's expressing difficulty
        else if (analysis.sentiment === 'negative' && 
                (message.content.toLowerCase().includes('hard') || 
                 message.content.toLowerCase().includes('difficult') ||
                 message.content.toLowerCase().includes('struggling'))) {
          smartReplies.push("I've been there too. It does get easier!");
          smartReplies.push("Don't be too hard on yourself. Small steps still count!");
          smartReplies.push("Would you like some tips on what worked for me?");
        }
        // Default responses
        else {
          smartReplies.push("Thanks for sharing!");
          smartReplies.push("I appreciate your perspective.");
          smartReplies.push("That's interesting!");
        }
        
        setReplies(smartReplies);
      } catch (error) {
        console.error('Error generating smart replies:', error);
        setReplies([
          "Thanks for sharing!",
          "I appreciate your perspective."
        ]);
      } finally {
        setLoading(false);
      }
    };

    generateReplies();
  }, [message, user]);

  if (loading) {
    return (
      <div className="flex items-center mt-1 space-x-1">
        <div className="h-1.5 w-1.5 bg-neutral-300 rounded-full animate-pulse"></div>
        <div className="h-1.5 w-1.5 bg-neutral-300 rounded-full animate-pulse delay-100"></div>
        <div className="h-1.5 w-1.5 bg-neutral-300 rounded-full animate-pulse delay-200"></div>
      </div>
    );
  }

  if (replies.length === 0 || (user && message.user_id === user.id)) return null;

  return (
    <motion.div 
      className="mt-1 flex flex-wrap gap-1"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {replies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onReplySelect(reply)}
          className="inline-flex items-center px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-full text-xs text-neutral-700 transition-colors"
        >
          <Zap className="h-3 w-3 mr-1 text-blue-500" />
          {reply}
        </button>
      ))}
    </motion.div>
  );
};

export default GoogleAISmartReplies;