import { supabase } from '../supabase';

class LearningSystem {
  public async initialize() {
    console.log('Initializing AI Learning System');
  }

  public async getPersonalizedRecommendations(
    userId: string,
    communityId: string,
    type: 'content' | 'events' | 'connections' | 'all' = 'all'
  ): Promise<any> {
    try {
      // Ensure user interest vector exists first
      await this.generateUserInterestVector(userId, communityId);

      const { data: existingRecs } = await supabase
        .from('user_recommendations')
        .select('recommendations, updated_at')
        .eq('user_id', userId)
        .eq('community_id', communityId)
        .maybeSingle();

      if (existingRecs) {
        const updatedAt = new Date(existingRecs.updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate < 24) {
          return existingRecs.recommendations;
        }
      }

      const { data, error } = await supabase.functions.invoke('personalized-recommendations', {
        body: JSON.stringify({
          userId,
          communityId,
          recommendationType: type
        })
      });

      if (error) throw new Error(`Edge Function error: ${error.message}`);
      return data?.recommendations || null;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return null;
    }
  }

  /**
   * Generate user interest vector for a specific community
   */
  private async generateUserInterestVector(userId: string, communityId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('generate-user-interest-vector', {
        body: JSON.stringify({
          user_id: userId,
          community_id: communityId
        })
      });

      if (error) {
        console.warn('Failed to generate user interest vector:', error);
        // Don't throw error - this is not critical for recommendations to work
      }
    } catch (error) {
      console.warn('Error calling generate-user-interest-vector:', error);
      // Don't throw error - this is not critical for recommendations to work
    }
  }

  /**
   * Generate user interest vectors for all user communities
   */
  public async generateAllUserInterestVectors(userId: string): Promise<void> {
    try {
      const { data: communities } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      if (!communities || communities.length === 0) {
        return;
      }

      // Generate vectors for all communities in parallel
      const promises = communities.map(({ community_id }) => 
        this.generateUserInterestVector(userId, community_id)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error generating all user interest vectors:', error);
    }
  }

  public async recordFeedback(
    userId: string,
    contentType: string,
    contentId: string,
    isPositive: boolean,
    details?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_interactions')
        .insert({
          user_id: userId,
          interaction_type: 'feedback',
          content: contentType,
          result: { contentId, isPositive, details },
          feedback: isPositive ? 'positive' : 'negative',
          created_at: new Date().toISOString(),
        });
      
      if (error) throw error;

      // Only regenerate vectors if this is significant feedback
      // (e.g., after multiple interactions or significant content)
      if (isPositive && details && details.length > 10) {
        // Regenerate vectors for all user communities after significant positive feedback
        await this.generateAllUserInterestVectors(userId);
      }

      return true;
    } catch (error) {
      console.error('Error recording feedback:', error);
      return false;
    }
  }

  public async scheduleTask(
    taskType: 'user_learning',
    params: any
  ): Promise<boolean> {
    try {
      if (taskType === 'user_learning') {
        await this.getPersonalizedRecommendations(params.userId, params.communityId);
        return true;
      }
      throw new Error(`Unknown task type: ${taskType}`);
    } catch (error) {
      console.error('Error scheduling task:', error);
      return false;
    }
  }

  /**
   * Trigger vector generation when user joins a community
   */
  public async onUserJoinsCommunity(userId: string, communityId: string): Promise<void> {
    await this.generateUserInterestVector(userId, communityId);
  }

  /**
   * Trigger vector regeneration when user profile is updated
   */
  public async onUserProfileUpdate(userId: string): Promise<void> {
    await this.generateAllUserInterestVectors(userId);
  }
}

export const learningSystem = new LearningSystem();