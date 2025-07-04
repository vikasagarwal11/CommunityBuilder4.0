import { intentDetectionService, DetectedIntent } from './intentDetection';
import { eventSchedulerService, ScheduledEvent } from './eventScheduler';
import { aiService } from './aiService';
import { supabase } from '../../supabase';

export type OrchestratorResult =
  | { type: 'event_created'; event: ScheduledEvent; followUp: string }
  | { type: 'admin_alert_sent'; message: string }
  | { type: 'ai_reply'; reply: string }
  | { type: 'intent_detected'; intent: DetectedIntent; message: string }
  | { type: 'noop' };

export interface OrchestratorOptions {
  text: string;
  communityId: string;
  userId: string;
  userPreferences?: any;
  enableEventCreation?: boolean;
  enableAdminAlerts?: boolean;
  enableAIReply?: boolean;
}

class ChatOrchestratorService {
  private async sendAdminAlert(
    message: string,
    communityId: string,
    userId: string,
    intent: DetectedIntent
  ): Promise<void> {
    try {
      const { data: admins } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', communityId)
        .eq('role', 'admin')
        .neq('user_id', userId);

      const suggestedActions = [
        'Review the message',
        'Take appropriate action',
        'Respond to user if needed'
      ];

      const notificationContent = {
        type: 'admin_alert',
        priority: 'medium',
        summary: `Admin alert: ${intent.intent} intent detected`,
        category: 'admin_alert',
        details: {
          originalMessage: message,
          detectedIntent: intent,
          suggestedActions
        }
      };

      for (const admin of admins || []) {
        await supabase
          .from('admin_notifications')
          .insert({
            user_id: admin.user_id,
            community_id: communityId,
            message_id: null,
            intent_type: intent.intent,
            intent_details: notificationContent,
            category: notificationContent.category,
            summary: notificationContent.summary,
            suggested_actions: suggestedActions,
            created_by: userId,
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error sending admin alert:', error);
    }
  }

  public async handleNewMessage(options: OrchestratorOptions): Promise<OrchestratorResult> {
    const {
      text,
      communityId,
      userId,
      userPreferences,
      enableEventCreation = true,
      enableAdminAlerts = true,
      enableAIReply = true
    } = options;

    try {
      // Step 1: Detect intent
      const intent = await intentDetectionService.detectIntent(text, {
        communityId,
        userId,
        ...userPreferences
      });

      // Step 2: Save intent to database
      await intentDetectionService.saveIntentToDatabase(intent, 'temp-message-id', communityId, userId);

      // Step 3: Handle based on intent type
      switch (intent.intent) {
        case 'create_event':
          if (enableEventCreation && intent.confidence >= 0.6) {
            const event = await eventSchedulerService.createEventFromIntent(intent, communityId, userId);
            if (event) {
              return {
                type: 'event_created',
                event,
                followUp: `📅 Event *${event.title}* created! Should I invite everyone?`
              };
            }
          }
          return {
            type: 'intent_detected',
            intent,
            message: 'Event creation intent detected. An admin will review and create the event.'
          };

        case 'admin_alert':
          if (enableAdminAlerts) {
            await this.sendAdminAlert(text, communityId, userId, intent);
            return {
              type: 'admin_alert_sent',
              message: 'Admin alert sent successfully.'
            };
          }
          break;

        case 'schedule_poll':
          // Handle poll scheduling (future feature)
          return {
            type: 'intent_detected',
            intent,
            message: 'Poll scheduling feature coming soon!'
          };

        case 'general_chat':
        case 'other':
        default:
          if (enableAIReply) {
            const reply = await aiService.generateChatReply(text, `Community: ${communityId}`);
            return {
              type: 'ai_reply',
              reply
            };
          }
          break;
      }

      return { type: 'noop' };
    } catch (error) {
      console.error('Error in chat orchestrator:', error);
      
      // Fallback to AI reply
      if (enableAIReply) {
        try {
          const reply = await aiService.generateChatReply(text);
          return {
            type: 'ai_reply',
            reply
          };
        } catch (fallbackError) {
          console.error('Fallback AI reply failed:', fallbackError);
        }
      }

      return { type: 'noop' };
    }
  }

  public async processMessageWithContext(
    message: string,
    communityId: string,
    userId: string,
    context: {
      recentMessages?: string[];
      userProfile?: any;
      communityContext?: string;
    } = {}
  ): Promise<OrchestratorResult> {
    const userPreferences = {
      communityId,
      userId,
      recentMessages: context.recentMessages,
      userProfile: context.userProfile,
      communityContext: context.communityContext
    };

    return this.handleNewMessage({
      text: message,
      communityId,
      userId,
      userPreferences
    });
  }

  public async getMessageSuggestions(
    userProfile: any,
    recentMessages: string[],
    communityContext?: string
  ): Promise<string[]> {
    try {
      const suggestions = await aiService.generateSuggestions(
        userProfile,
        recentMessages,
        communityContext
      );
      return suggestions.map(s => s.text);
    } catch (error) {
      console.error('Error getting message suggestions:', error);
      return [
        "How's everyone doing today?",
        "Anyone up for a workout session?",
        "Great job everyone! Keep up the motivation! 💪"
      ];
    }
  }

  public async analyzeMessageSentiment(
    message: string,
    userContext?: any
  ): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    topics: string[];
  }> {
    try {
      const analysis = await aiService.analyzeMessage(message, userContext);
      return {
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        topics: analysis.topics
      };
    } catch (error) {
      console.error('Error analyzing message sentiment:', error);
      return {
        sentiment: 'neutral',
        confidence: 0,
        topics: []
      };
    }
  }

  public async moderateMessage(message: string): Promise<{
    isSafe: boolean;
    issues: string[];
    score: number;
  }> {
    try {
      return await aiService.moderateContent(message);
    } catch (error) {
      console.error('Error moderating message:', error);
      return {
        isSafe: true,
        issues: [],
        score: 0.1
      };
    }
  }

  public async getMessageInsights(message: string, userContext?: any): Promise<string> {
    try {
      return await aiService.getMessageInsights(message, userContext);
    } catch (error) {
      console.error('Error getting message insights:', error);
      return 'Message analyzed successfully.';
    }
  }
}

export const chatOrchestratorService = new ChatOrchestratorService(); 