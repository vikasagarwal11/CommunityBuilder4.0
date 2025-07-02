import { supabase } from '../supabase';

export interface ChatSuggestion {
  id: string;
  text: string;
  confidence: number;
  category: string;
}

export interface ChatContext {
  userId: string;
  communityId: string;
  recentMessages: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  userProfile?: {
    interests?: string[];
    custom_interests?: string[];
    experience_level?: string;
  };
}

class ChatAssistant {
  private categories = {
    engagement: [
      "How's everyone doing today?",
      "What's been your biggest fitness win this week?",
      "Anyone trying a new workout routine they'd like to share?",
      "What motivates you to stay consistent with your fitness goals?",
      "How do you balance fitness with other responsibilities?"
    ],
    questions: [
      "I'm looking for recommendations for a good home workout. Any suggestions?",
      "What's your favorite post-workout meal?",
      "How do you stay motivated when you don't feel like exercising?",
      "Any tips for reducing muscle soreness after a tough workout?",
      "What's your favorite way to track your fitness progress?"
    ],
    support: [
      "I'm struggling to find time for workouts. Any advice?",
      "Having a hard time staying consistent. How do you all manage?",
      "Need some encouragement today - feeling unmotivated.",
      "Looking for accountability partners for my fitness journey!",
      "How do you get back on track after missing workouts?"
    ]
  };

  private interestBasedSuggestions: Record<string, string[]> = {
    yoga: [
      "What's your favorite yoga pose for stress relief?",
      "Has anyone tried online yoga classes? Any recommendations?",
      "How often do you practice yoga in your weekly routine?",
      "What benefits have you noticed from regular yoga practice?"
    ],
    running: [
      "Favorite running routes in the area?",
      "What running shoes are you all using these days?",
      "Training for any races coming up?",
      "Best tips for new runners?"
    ],
    strength: [
      "What's your current strength training split?",
      "Favorite exercises for building upper body strength?",
      "Home vs. gym strength training - what works better for you?",
      "How do you track your strength progress?"
    ],
    nutrition: [
      "Favorite healthy meal prep ideas?",
      "How do you handle nutrition on busy days?",
      "Best protein sources for vegetarians?",
      "How do you balance treats while staying on track?"
    ],
    postpartum: [
      "Best exercises for diastasis recti recovery?",
      "How long did it take you to return to your regular fitness routine?",
      "Favorite resources for postpartum fitness?",
      "How do you find time to exercise with a newborn?"
    ]
  };

  /**
   * Generate message suggestions based on user profile and community context
   */
  public async getSuggestions(context: ChatContext): Promise<ChatSuggestion[]> {
    try {
      // Check if we have any cached suggestions for this user and community
      const { data: cachedSuggestions } = await supabase
        .from('ai_suggestion_history')
        .select('id, suggestion')
        .eq('user_id', context.userId)
        .eq('community_id', context.communityId)
        .eq('was_used', false)
        .order('created_at', { ascending: false })
        .limit(2);

      const suggestions: ChatSuggestion[] = [];
      
      // Add cached suggestions if available
      if (cachedSuggestions && cachedSuggestions.length > 0) {
        cachedSuggestions.forEach(suggestion => {
          suggestions.push({
            id: suggestion.id,
            text: suggestion.suggestion,
            confidence: 0.9,
            category: 'history'
          });
        });
      }
      
      // Generate new suggestions based on user interests
      if (context.userProfile?.interests) {
        for (const interest of context.userProfile.interests) {
          const lowerInterest = interest.toLowerCase();
          
          // Find matching interest category
          for (const [category, suggestionList] of Object.entries(this.interestBasedSuggestions)) {
            if (lowerInterest.includes(category) || category.includes(lowerInterest)) {
              // Add a random suggestion from this category
              const randomSuggestion = suggestionList[Math.floor(Math.random() * suggestionList.length)];
              suggestions.push({
                id: `interest-${Date.now()}-${Math.random()}`,
                text: randomSuggestion,
                confidence: 0.85,
                category: 'interest'
              });
              break;
            }
          }
          
          // Limit to 2 interest-based suggestions
          if (suggestions.filter(s => s.category === 'interest').length >= 2) {
            break;
          }
        }
      }
      
      // Add general suggestions from different categories
      const categories = Object.keys(this.categories);
      const selectedCategories = categories.sort(() => 0.5 - Math.random()).slice(0, 2);
      
      for (const category of selectedCategories) {
        const suggestionList = this.categories[category as keyof typeof this.categories];
        const randomSuggestion = suggestionList[Math.floor(Math.random() * suggestionList.length)];
        
        suggestions.push({
          id: `general-${Date.now()}-${Math.random()}`,
          text: randomSuggestion,
          confidence: 0.7,
          category
        });
      }
      
      // Analyze recent messages for context-aware suggestions
      if (context.recentMessages && context.recentMessages.length > 0) {
        const recentTopics = this.analyzeRecentMessages(context.recentMessages);
        
        if (recentTopics.length > 0) {
          const topTopic = recentTopics[0];
          let contextSuggestion = '';
          
          switch (topTopic) {
            case 'workout':
              contextSuggestion = "What's your favorite workout that was mentioned recently?";
              break;
            case 'nutrition':
              contextSuggestion = "Any healthy recipes you'd recommend based on the nutrition discussion?";
              break;
            case 'motivation':
              contextSuggestion = "What motivational quotes or tips help you stay consistent?";
              break;
            case 'challenge':
              contextSuggestion = "Would anyone be interested in a weekly challenge related to this topic?";
              break;
            default:
              contextSuggestion = `What are your thoughts on the ${topTopic} discussion?`;
          }
          
          suggestions.push({
            id: `context-${Date.now()}`,
            text: contextSuggestion,
            confidence: 0.95,
            category: 'context'
          });
        }
      }
      
      // Shuffle and limit to 4 suggestions
      return this.shuffleArray(suggestions).slice(0, 4);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Analyze recent messages to identify topics
   */
  private analyzeRecentMessages(messages: Array<{content: string; created_at: string; user_id: string}>): string[] {
    const topicKeywords: Record<string, string[]> = {
      workout: ['workout', 'exercise', 'training', 'gym', 'fitness', 'routine'],
      nutrition: ['food', 'diet', 'nutrition', 'meal', 'protein', 'carbs', 'eating'],
      motivation: ['motivation', 'inspired', 'goals', 'progress', 'achieve', 'success'],
      challenge: ['challenge', 'difficult', 'struggling', 'hard', 'tough', 'problem'],
      recovery: ['recovery', 'rest', 'sleep', 'injury', 'sore', 'pain', 'healing']
    };
    
    const topicCounts: Record<string, number> = {};
    
    // Count occurrences of topics in messages
    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            break; // Count each topic only once per message
          }
        }
      }
    }
    
    // Sort topics by frequency
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }

  /**
   * Analyze message sentiment and emotional tone
   */
  public analyzeMessageTone(message: string): { 
    tone: 'enthusiastic' | 'questioning' | 'concerned' | 'neutral',
    intensity: number 
  } {
    const enthusiasticPatterns = ['!', 'wow', 'amazing', 'great', 'love', 'awesome', 'excited'];
    const questioningPatterns = ['?', 'how', 'what', 'when', 'where', 'why', 'who', 'which'];
    const concernedPatterns = ['worried', 'concerned', 'problem', 'issue', 'help', 'struggling'];
    
    const lowerMessage = message.toLowerCase();
    
    let enthusiasticScore = 0;
    let questioningScore = 0;
    let concernedScore = 0;
    
    // Count pattern matches
    enthusiasticPatterns.forEach(pattern => {
      if (lowerMessage.includes(pattern)) enthusiasticScore++;
      // Extra points for exclamation marks
      if (pattern === '!' && message.includes('!')) {
        enthusiasticScore += (message.match(/!/g) || []).length;
      }
    });
    
    questioningPatterns.forEach(pattern => {
      if (lowerMessage.includes(pattern)) questioningScore++;
      // Extra points for question marks
      if (pattern === '?' && message.includes('?')) {
        questioningScore += (message.match(/\?/g) || []).length;
      }
    });
    
    concernedPatterns.forEach(pattern => {
      if (lowerMessage.includes(pattern)) concernedScore++;
    });
    
    // Determine dominant tone
    const scores = [
      { tone: 'enthusiastic', score: enthusiasticScore },
      { tone: 'questioning', score: questioningScore },
      { tone: 'concerned', score: concernedScore }
    ];
    
    const highestScore = Math.max(enthusiasticScore, questioningScore, concernedScore);
    
    // If no clear tone is detected, return neutral
    if (highestScore === 0) {
      return { tone: 'neutral', intensity: 0 };
    }
    
    // Find the dominant tone
    const dominantTone = scores.find(s => s.score === highestScore)!.tone as 'enthusiastic' | 'questioning' | 'concerned';
    
    // Calculate intensity (0-1)
    const intensity = Math.min(highestScore / 5, 1);
    
    return { 
      tone: dominantTone, 
      intensity 
    };
  }
  /**
   * Save a suggestion when it's used
   */
  public async saveSuggestionUsage(suggestionId: string, userId: string, communityId: string, text: string): Promise<void> {
    try {
      // If it's a cached suggestion, mark it as used
      if (suggestionId.startsWith('history-')) {
        await supabase
          .from('ai_suggestion_history')
          .update({ was_used: true })
          .eq('id', suggestionId);
      } else {
        // Otherwise, save it as a new entry
        await supabase
          .from('ai_suggestion_history')
          .insert({
            user_id: userId,
            community_id: communityId,
            query: '',
            suggestion: text,
            was_used: true
          });
      }
    } catch (error) {
      console.error('Error saving suggestion usage:', error);
    }
  }

  /**
   * Get fallback suggestions if the main method fails
   */
  private getFallbackSuggestions(): ChatSuggestion[] {
    return [
      {
        id: `fallback-1`,
        text: "How is everyone doing today?",
        confidence: 0.7,
        category: 'engagement'
      },
      {
        id: `fallback-2`,
        text: "What's your favorite workout routine?",
        confidence: 0.7,
        category: 'questions'
      },
      {
        id: `fallback-3`,
        text: "Any fitness goals for this week?",
        confidence: 0.7,
        category: 'engagement'
      },
      {
        id: `fallback-4`,
        text: "Looking for some motivation today!",
        confidence: 0.7,
        category: 'support'
      }
    ];
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  /**
   * Analyze message sentiment with more nuanced detection
   */
  public analyzeSentiment(message: string): { 
    sentiment: 'positive' | 'negative' | 'neutral', 
    score: number,
    emotions?: string[]
  } {
    const positiveWords = ['great', 'happy', 'excited', 'love', 'awesome', 'amazing', 'good', 'excellent', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'sad', 'angry', 'upset', 'terrible', 'horrible', 'awful', 'disappointed', 'frustrated', 'hate'];
    
    // Emotion detection
    const emotionMap: Record<string, string> = {
      'happy': 'joy', 'excited': 'joy', 'love': 'love', 'awesome': 'joy',
      'sad': 'sadness', 'upset': 'sadness', 'frustrated': 'anger',
      'angry': 'anger', 'hate': 'anger', 'worried': 'fear',
      'scared': 'fear', 'anxious': 'fear', 'proud': 'pride',
      'grateful': 'gratitude', 'thankful': 'gratitude'
    };
    
    const detectedEmotions = new Set<string>();
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    const words = message.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (positiveWords.includes(word)) {
        positiveScore++;
        // Check for emotions
        if (emotionMap[word]) {
          detectedEmotions.add(emotionMap[word]);
        }
      }
      if (negativeWords.includes(word)) {
        negativeScore++;
        // Check for emotions
        if (emotionMap[word]) {
          detectedEmotions.add(emotionMap[word]);
        }
      }
    }
    
    const totalScore = positiveScore - negativeScore;
    const emotions = Array.from(detectedEmotions);
    
    if (totalScore > 0) return { sentiment: 'positive', score: totalScore / words.length, emotions: emotions.length > 0 ? emotions : undefined };
    if (totalScore < 0) return { sentiment: 'negative', score: Math.abs(totalScore) / words.length, emotions: emotions.length > 0 ? emotions : undefined };
    return { sentiment: 'neutral', score: 0, emotions: emotions.length > 0 ? emotions : undefined };
  }

  /**
   * Get personalized response to a message
   */
  public getPersonalizedResponse(message: string, userProfile?: any): string {
    const sentiment = this.analyzeSentiment(message);
    
    if (sentiment.sentiment === 'negative' && sentiment.score > 0.1) {
      return "I notice you might be feeling frustrated. Remember that everyone's fitness journey has ups and downs. The community is here to support you!";
    }
    
    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('advice')) {
      return "It looks like you're seeking advice. While I can offer general suggestions, remember that our community members have diverse experiences that might be helpful for your specific situation.";
    }
    
    if (userProfile?.experience_level === 'beginner' && 
        (message.toLowerCase().includes('workout') || message.toLowerCase().includes('exercise'))) {
      return "As someone new to fitness, remember that consistency matters more than intensity. Start small, celebrate progress, and don't hesitate to ask specific questions!";
    }
    
    return "";
  }
}

export const chatAssistant = new ChatAssistant();