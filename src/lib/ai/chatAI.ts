// AI-powered chat features for MomFit
import { supabase } from '../supabase';

export interface AIResponse {
  message: string;
  confidence: number;
  suggestions?: string[];
  resources?: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'exercise';
  }>;
}

export interface ChatContext {
  userId: string;
  communityId: string;
  recentMessages: Array<{
    content: string;
    timestamp: string;
    userId: string;
  }>;
  userProfile?: {
    fitness_goals?: string[];
    children_info?: any;
  };
}

class ChatAI {
  private fitnessKeywords = [
    'workout', 'exercise', 'fitness', 'strength', 'cardio', 'yoga', 'pilates',
    'postpartum', 'recovery', 'nutrition', 'diet', 'weight', 'muscle', 'core',
    'pelvic floor', 'diastasis recti', 'breastfeeding', 'energy', 'tired',
    'motivation', 'schedule', 'time', 'baby', 'toddler', 'sleep'
  ];

  private responses = {
    motivation: [
      "You're doing amazing! Every small step counts on your fitness journey. 💪",
      "Remember, you're not just taking care of yourself - you're setting a great example for your children! 🌟",
      "Progress isn't always linear. Be patient with yourself and celebrate small wins! 🎉"
    ],
    postpartum: [
      "Postpartum recovery is unique for everyone. Listen to your body and start slowly. 🤱",
      "Have you been cleared by your doctor for exercise? That's always the first step! 👩‍⚕️",
      "Core and pelvic floor recovery should be your priority. Consider seeing a pelvic floor physiotherapist. 🏥"
    ],
    time_management: [
      "Try micro-workouts! Even 10-15 minutes can make a difference. ⏰",
      "Consider baby-wearing workouts or exercises you can do while your little one plays nearby. 👶",
      "Early morning or nap time workouts work well for many moms. Find what fits your schedule! 🌅"
    ],
    nutrition: [
      "Focus on nutrient-dense foods that give you sustained energy throughout the day. 🥗",
      "Meal prep can be a game-changer for busy moms. Try preparing healthy snacks in advance! 🍎",
      "Stay hydrated, especially if you're breastfeeding. Water is crucial for energy and recovery! 💧"
    ],
    exercise_suggestions: [
      "Walking is an excellent low-impact exercise that you can do with your baby! 🚶‍♀️",
      "Bodyweight exercises like squats, modified push-ups, and planks are great for home workouts. 🏠",
      "Yoga can help with both physical recovery and mental wellness. Try some gentle flows! 🧘‍♀️"
    ]
  };

  private exerciseDatabase = [
    {
      name: "Modified Push-ups",
      description: "Wall or knee push-ups perfect for rebuilding upper body strength",
      duration: "5-10 minutes",
      equipment: "None",
      postpartum_safe: true
    },
    {
      name: "Pelvic Tilts",
      description: "Gentle core activation exercise safe for early postpartum",
      duration: "5 minutes",
      equipment: "None",
      postpartum_safe: true
    },
    {
      name: "Baby-wearing Squats",
      description: "Functional leg exercise you can do while carrying your baby",
      duration: "10 minutes",
      equipment: "Baby carrier",
      postpartum_safe: true
    },
    {
      name: "Stroller Intervals",
      description: "Cardio workout incorporating your stroller for resistance",
      duration: "20-30 minutes",
      equipment: "Stroller",
      postpartum_safe: true
    }
  ];

  public async generateResponse(message: string, context: ChatContext): Promise<AIResponse> {
    const lowerMessage = message.toLowerCase();
    
    // Detect intent based on keywords
    const intent = this.detectIntent(lowerMessage);
    
    // Generate contextual response
    const response = this.generateContextualResponse(intent, lowerMessage, context);
    
    // Add exercise suggestions if relevant
    const suggestions = this.generateSuggestions(intent, context);
    
    // Add relevant resources
    const resources = this.getRelevantResources(intent);

    return {
      message: response,
      confidence: this.calculateConfidence(intent, lowerMessage),
      suggestions,
      resources
    };
  }

  private detectIntent(message: string): string {
    if (this.containsKeywords(message, ['tired', 'exhausted', 'no energy', 'motivation', 'give up'])) {
      return 'motivation';
    }
    if (this.containsKeywords(message, ['postpartum', 'after birth', 'c-section', 'recovery', 'diastasis'])) {
      return 'postpartum';
    }
    if (this.containsKeywords(message, ['no time', 'busy', 'schedule', 'when to workout', 'time management'])) {
      return 'time_management';
    }
    if (this.containsKeywords(message, ['diet', 'nutrition', 'eating', 'food', 'meal', 'breastfeeding'])) {
      return 'nutrition';
    }
    if (this.containsKeywords(message, ['exercise', 'workout', 'routine', 'what should i do'])) {
      return 'exercise_suggestions';
    }
    return 'general';
  }

  private containsKeywords(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => message.includes(keyword));
  }

  private generateContextualResponse(intent: string, message: string, context: ChatContext): string {
    const responses = this.responses[intent as keyof typeof this.responses] || [
      "That's a great question! Our community has lots of experience with similar challenges. 💕",
      "I'd love to help! Can you share a bit more about your specific situation? 🤔",
      "You're in the right place for support! This community is amazing for advice and encouragement. 🌟"
    ];

    let response = responses[Math.floor(Math.random() * responses.length)];

    // Add personalization based on user profile
    if (context.userProfile?.fitness_goals) {
      const goals = context.userProfile.fitness_goals;
      if (goals.includes('Postpartum Recovery') && intent === 'exercise_suggestions') {
        response += " Since you're focusing on postpartum recovery, remember to start slowly and listen to your body.";
      }
      if (goals.includes('Weight Loss') && intent === 'nutrition') {
        response += " For healthy weight loss while maintaining energy, focus on balanced meals with protein, healthy fats, and complex carbs.";
      }
    }

    return response;
  }

  private generateSuggestions(intent: string, context: ChatContext): string[] {
    const suggestions: string[] = [];

    switch (intent) {
      case 'exercise_suggestions':
        suggestions.push(
          "Try a 15-minute morning routine",
          "Look into baby-wearing workouts",
          "Join our next group fitness session"
        );
        break;
      case 'motivation':
        suggestions.push(
          "Set small, achievable daily goals",
          "Find an accountability partner in the community",
          "Track your progress with photos or measurements"
        );
        break;
      case 'time_management':
        suggestions.push(
          "Schedule workouts like important appointments",
          "Try 10-minute workout videos during nap time",
          "Include kids in your exercise routine"
        );
        break;
      case 'nutrition':
        suggestions.push(
          "Prep healthy snacks on Sunday",
          "Keep a water bottle with you always",
          "Try batch cooking on weekends"
        );
        break;
    }

    return suggestions;
  }

  private getRelevantResources(intent: string): Array<{title: string; url: string; type: 'article' | 'video' | 'exercise'}> {
    const resources = [];

    switch (intent) {
      case 'postpartum':
        resources.push(
          {
            title: "Safe Postpartum Exercise Guidelines",
            url: "/blog/postpartum-exercise-guide",
            type: "article" as const
          },
          {
            title: "Diastasis Recti Recovery Exercises",
            url: "/exercises/diastasis-recti",
            type: "exercise" as const
          }
        );
        break;
      case 'exercise_suggestions':
        resources.push(
          {
            title: "10-Minute Mom Workout",
            url: "/videos/quick-mom-workout",
            type: "video" as const
          },
          {
            title: "Bodyweight Exercises for Busy Moms",
            url: "/exercises/bodyweight-routine",
            type: "exercise" as const
          }
        );
        break;
      case 'nutrition':
        resources.push(
          {
            title: "Meal Prep for Busy Moms",
            url: "/blog/meal-prep-guide",
            type: "article" as const
          },
          {
            title: "Healthy Snacks for Energy",
            url: "/blog/healthy-snacks",
            type: "article" as const
          }
        );
        break;
    }

    return resources;
  }

  private calculateConfidence(intent: string, message: string): number {
    const keywordMatches = this.fitnessKeywords.filter(keyword => 
      message.includes(keyword)
    ).length;
    
    const baseConfidence = intent === 'general' ? 0.6 : 0.8;
    const keywordBonus = Math.min(keywordMatches * 0.1, 0.3);
    
    return Math.min(baseConfidence + keywordBonus, 1.0);
  }

  public async suggestExercise(userProfile: any, timeAvailable: number): Promise<any> {
    const suitableExercises = this.exerciseDatabase.filter(exercise => {
      if (userProfile?.fitness_goals?.includes('Postpartum Recovery')) {
        return exercise.postpartum_safe;
      }
      return true;
    });

    const timeFilteredExercises = suitableExercises.filter(exercise => {
      const duration = parseInt(exercise.duration.split('-')[0]);
      return duration <= timeAvailable;
    });

    return timeFilteredExercises[Math.floor(Math.random() * timeFilteredExercises.length)];
  }

  public async analyzeMessageSentiment(message: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    needsSupport: boolean;
    keywords: string[];
  }> {
    const positiveWords = ['great', 'amazing', 'love', 'excited', 'happy', 'progress', 'success'];
    const negativeWords = ['tired', 'frustrated', 'difficult', 'hard', 'struggle', 'give up', 'overwhelmed'];
    const supportWords = ['help', 'advice', 'struggling', 'don\'t know', 'confused', 'lost'];

    const lowerMessage = message.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    const supportCount = supportWords.filter(word => lowerMessage.includes(word)).length;

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    const needsSupport = supportCount > 0 || sentiment === 'negative';
    
    const keywords = this.fitnessKeywords.filter(keyword => lowerMessage.includes(keyword));

    return { sentiment, needsSupport, keywords };
  }
}

export const chatAI = new ChatAI();