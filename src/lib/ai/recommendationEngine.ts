import { supabase } from '../supabase';
import { chatAssistant } from './chatAssistant';

interface RecommendationContext {
  userId?: string;
  communityId: string;
  recentMessages: Array<{
    content: string;
    created_at: string;
    user_id: string;
  }>;
  userProfile?: any;
  communityProfile?: any;
  currentMessage?: string;
}

interface Recommendation {
  text: string;
  confidence: number;
  category: string;
  id: string;
  source: 'ai' | 'history' | 'context' | 'community';
}

class RecommendationEngine {
  private static instance: RecommendationEngine;
  
  private constructor() {}
  
  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }
  
  /**
   * Generate recommendations based on context
   */
  public async getRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = [];
      
      // Add recommendations from different sources
      const aiRecommendations = await this.getAIRecommendations(context);
      const historyRecommendations = await this.getHistoryRecommendations(context);
      const contextualRecommendations = await this.getContextualRecommendations(context);
      const communityRecommendations = await this.getCommunityRecommendations(context);
      
      // Combine all recommendations
      recommendations.push(
        ...aiRecommendations,
        ...historyRecommendations,
        ...contextualRecommendations,
        ...communityRecommendations
      );
      
      // Deduplicate and sort by confidence
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
      const sortedRecommendations = this.sortRecommendations(uniqueRecommendations);
      
      // Limit to a reasonable number
      return sortedRecommendations.slice(0, 8);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }
  
  /**
   * Get recommendations from AI
   */
  private async getAIRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    try {
      // In a real implementation, this would call an AI service
      // For now, we'll use a simple approach based on keywords
      
      const recommendations: Recommendation[] = [];
      
      // Get the latest message for context
      const latestMessage = context.recentMessages[context.recentMessages.length - 1];
      
      if (!latestMessage) {
        return [];
      }
      
      // Simple keyword-based recommendation generation
      const lowerCaseContent = latestMessage.content.toLowerCase();
      
      if (lowerCaseContent.includes('yoga')) {
        recommendations.push(
          this.createRecommendation("What's your favorite yoga pose?", 'question', 'ai'),
          this.createRecommendation("How often do you practice yoga?", 'question', 'ai'),
          this.createRecommendation("Have you tried any online yoga classes?", 'question', 'ai')
        );
      } else if (lowerCaseContent.includes('run') || lowerCaseContent.includes('running')) {
        recommendations.push(
          this.createRecommendation("What's your favorite running route?", 'question', 'ai'),
          this.createRecommendation("Do you use any apps to track your runs?", 'question', 'ai'),
          this.createRecommendation("What running shoes do you recommend?", 'question', 'ai')
        );
      } else if (lowerCaseContent.includes('food') || lowerCaseContent.includes('nutrition') || lowerCaseContent.includes('diet')) {
        recommendations.push(
          this.createRecommendation("What's your go-to healthy snack?", 'question', 'ai'),
          this.createRecommendation("How do you meal prep for the week?", 'question', 'ai'),
          this.createRecommendation("Any favorite protein-rich recipes to share?", 'question', 'ai')
        );
      } else if (lowerCaseContent.includes('workout') || lowerCaseContent.includes('exercise')) {
        recommendations.push(
          this.createRecommendation("What's your current workout routine?", 'question', 'ai'),
          this.createRecommendation("How many days a week do you exercise?", 'question', 'ai'),
          this.createRecommendation("What's your favorite muscle group to train?", 'question', 'ai')
        );
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get recommendations from user history
   */
  private async getHistoryRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    try {
      if (!context.userId) {
        return [];
      }
      
      // Get previously used suggestions from history
      const { data } = await supabase
        .from('ai_suggestion_history')
        .select('suggestion')
        .eq('user_id', context.userId)
        .eq('was_used', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Convert to recommendations
      return data.map(item => {
        const category = this.getCategoryForSuggestion(item.suggestion);
        return this.createRecommendation(item.suggestion, category, 'history');
      });
    } catch (error) {
      console.error('Error getting history recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get recommendations based on current message context
   */
  private async getContextualRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    try {
      if (!context.currentMessage) {
        return [];
      }
      
      const recommendations: Recommendation[] = [];
      
      // Analyze the current message
      const messageAnalysis = chatAssistant.analyzeMessageTone(context.currentMessage);
      
      // Generate recommendations based on tone
      if (messageAnalysis.tone === 'questioning') {
        recommendations.push(
          this.createRecommendation("That's a great question!", 'response', 'context'),
          this.createRecommendation("I've been wondering about that too.", 'response', 'context'),
          this.createRecommendation("I'd love to hear what others think about this.", 'response', 'context')
        );
      } else if (messageAnalysis.tone === 'enthusiastic') {
        recommendations.push(
          this.createRecommendation("I'm excited about this too!", 'response', 'context'),
          this.createRecommendation("That's awesome to hear!", 'response', 'context'),
          this.createRecommendation("I love your enthusiasm!", 'response', 'context')
        );
      } else if (messageAnalysis.tone === 'concerned') {
        recommendations.push(
          this.createRecommendation("I understand your concern.", 'response', 'context'),
          this.createRecommendation("That sounds challenging. How can I help?", 'response', 'context'),
          this.createRecommendation("I've faced similar challenges before.", 'response', 'context')
        );
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error getting contextual recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get recommendations based on community context
   */
  private async getCommunityRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    try {
      // Get community profile
      let communityProfile = context.communityProfile;
      
      if (!communityProfile) {
        const { data } = await supabase
          .from('ai_community_profiles')
          .select('*, anonymized_insights')
          .eq('community_id', context.communityId)
          .maybeSingle();
        
        if (!data) {
          return [];
        }
        
        communityProfile = data;
      }
      
      const recommendations: Recommendation[] = [];
      
      // Check if we can use anonymized insights from other communities
      if (communityProfile.knowledge_transfer_enabled && communityProfile.anonymized_insights) {
        try {
          // Use anonymized insights to generate recommendations
          const insightBasedRecommendations = this.generateInsightBasedRecommendations(
            communityProfile.anonymized_insights
          );
          
          recommendations.push(...insightBasedRecommendations);
        } catch (error) {
          console.error('Error generating insight-based recommendations:', error);
        }
      }
      
      // If we don't have enough recommendations yet, add more based on community topics
      if (recommendations.length < 3) {
        // Generate recommendations based on community topics
        if (communityProfile.common_topics) {
          communityProfile.common_topics.forEach((topic: string) => {
            recommendations.push(
              this.createRecommendation(`What's your experience with ${topic}?`, 'question', 'community'),
              this.createRecommendation(`Any tips for someone new to ${topic}?`, 'question', 'community')
            );
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error getting community recommendations:', error);
      return [];
    }
  }
  
  /**
   * Generate recommendations based on anonymized insights from other communities
   */
  private generateInsightBasedRecommendations(insights: any): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    try {
      if (insights.popularTopics) {
        insights.popularTopics.forEach((topic: string) => {
          recommendations.push(
            this.createRecommendation(
              `Have you tried discussing ${topic}? It's popular in similar communities.`, 
              'suggestion', 
              'community'
            )
          );
        });
      }
      
      if (insights.successfulEvents) {
        insights.successfulEvents.forEach((event: string) => {
          recommendations.push(
            this.createRecommendation(
              `Would anyone be interested in a ${event} event? These have been successful in similar communities.`, 
              'event', 
              'community'
            )
          );
        });
      }
      
      if (insights.engagementTips) {
        insights.engagementTips.forEach((tip: string) => {
          recommendations.push(
            this.createRecommendation(tip, 'tip', 'community')
          );
        });
      }
      
      // Generate recommendations based on community topics
      if (context.communityProfile.common_topics) {
        context.communityProfile.common_topics.forEach((topic: string) => {
          recommendations.push(
            this.createRecommendation(`What's your experience with ${topic}?`, 'question', 'community'),
            this.createRecommendation(`Any tips for someone new to ${topic}?`, 'question', 'community')
          );
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error getting community recommendations:', error);
      return [];
    }
  }
  
  /**
   * Create a recommendation object
   */
  private createRecommendation(
    text: string,
    category: string,
    source: 'ai' | 'history' | 'context' | 'community'
  ): Recommendation {
    return {
      text,
      confidence: this.calculateConfidence(text, category, source),
      category,
      id: `recommendation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source
    };
  }
  
  /**
   * Calculate confidence score for a recommendation
   */
  private calculateConfidence(text: string, category: string, source: string): number {
    // Base confidence by source
    let confidence = 0.7;
    
    switch (source) {
      case 'ai':
        confidence = 0.8;
        break;
      case 'history':
        confidence = 0.9; // Higher confidence for previously used suggestions
        break;
      case 'context':
        confidence = 0.85;
        break;
      case 'community':
        confidence = 0.75;
        break;
    }
    
    // Adjust based on category
    if (category === 'question') {
      confidence += 0.05; // Questions tend to be good conversation starters
    }
    
    // Adjust based on text length (prefer medium-length suggestions)
    const length = text.length;
    if (length > 20 && length < 100) {
      confidence += 0.05;
    } else if (length > 100) {
      confidence -= 0.05;
    }
    
    // Cap confidence between 0 and 1
    return Math.min(Math.max(confidence, 0), 1);
  }
  
  /**
   * Determine category based on suggestion content
   */
  private getCategoryForSuggestion(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('?')) {
      return 'question';
    } else if (lowerText.includes('recommend') || lowerText.includes('suggestion') || lowerText.includes('advice')) {
      return 'advice';
    } else if (lowerText.includes('looking for') || lowerText.includes('need')) {
      return 'request';
    } else if (lowerText.includes('completed') || lowerText.includes('did') || lowerText.includes('finished')) {
      return 'achievement';
    } else {
      return 'general';
    }
  }
  
  /**
   * Deduplicate recommendations by text similarity
   */
  private deduplicateRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const uniqueRecommendations: Recommendation[] = [];
    const seenTexts = new Set<string>();
    
    recommendations.forEach(recommendation => {
      // Normalize text for comparison
      const normalizedText = recommendation.text.toLowerCase().trim();
      
      // Check if we've seen a similar text
      let isDuplicate = false;
      seenTexts.forEach(text => {
        if (this.calculateSimilarity(normalizedText, text) > 0.8) {
          isDuplicate = true;
        }
      });
      
      if (!isDuplicate) {
        uniqueRecommendations.push(recommendation);
        seenTexts.add(normalizedText);
      }
    });
    
    return uniqueRecommendations;
  }
  
  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Sort recommendations by confidence
   */
  private sortRecommendations(recommendations: Recommendation[]): Recommendation[] {
    return [...recommendations].sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Get fallback recommendations
   */
  private getFallbackRecommendations(): Recommendation[] {
    return [
      this.createRecommendation("How's everyone doing today?", 'question', 'ai'),
      this.createRecommendation("What's your favorite workout routine?", 'question', 'ai'),
      this.createRecommendation("Any fitness goals you're working towards?", 'question', 'ai'),
      this.createRecommendation("I just completed a 30-minute HIIT session!", 'achievement', 'ai')
    ];
  }
}

export const recommendationEngine = RecommendationEngine.getInstance();