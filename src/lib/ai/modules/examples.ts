/**
 * Practical Examples: How to Use the New Modular AI Services
 * 
 * This file contains real-world examples of how to use the modular AI services
 * that have been extracted from the monolithic googleAI.ts file.
 */

import { 
  intentDetectionService, 
  eventSchedulerService, 
  chatOrchestratorService,
  aiService 
} from './index';

// ============================================================================
// EXAMPLE 1: Basic Intent Detection
// ============================================================================

export async function detectUserIntent(message: string, communityId: string, userId: string) {
  try {
    const intent = await intentDetectionService.detectIntent(message, {
      communityId,
      userId
    });

    console.log('Detected Intent:', {
      type: intent.intent,
      confidence: intent.confidence,
      entities: intent.entities
    });

    return intent;
  } catch (error) {
    console.error('Intent detection failed:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 2: Event Creation from Message
// ============================================================================

export async function createEventFromMessage(message: string, communityId: string, userId: string) {
  try {
    // First, detect intent
    const intent = await intentDetectionService.detectIntent(message, {
      communityId,
      userId
    });

    // If it's an event intent with high confidence, create the event
    if (intent.intent === 'create_event' && intent.confidence >= 0.6) {
      const event = await eventSchedulerService.createEventFromIntent(
        intent,
        communityId,
        userId
      );

      if (event) {
        console.log('Event created successfully:', event);
        return event;
      }
    }

    console.log('No event created - low confidence or no event intent');
    return null;
  } catch (error) {
    console.error('Event creation failed:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 3: Full Chat Message Processing
// ============================================================================

export async function processChatMessage(message: string, communityId: string, userId: string) {
  try {
    const result = await chatOrchestratorService.handleNewMessage({
      text: message,
      communityId,
      userId,
      enableEventCreation: true,
      enableAdminAlerts: true,
      enableAIReply: true
    });

    switch (result.type) {
      case 'event_created':
        console.log('Event created:', result.event);
        console.log('Follow-up message:', result.followUp);
        break;
      
      case 'admin_alert_sent':
        console.log('Admin alert sent:', result.message);
        break;
      
      case 'ai_reply':
        console.log('AI reply generated:', result.reply);
        break;
      
      case 'intent_detected':
        console.log('Intent detected:', result.intent);
        console.log('Message:', result.message);
        break;
      
      case 'noop':
        console.log('No action taken');
        break;
    }

    return result;
  } catch (error) {
    console.error('Message processing failed:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 4: Message Analysis and Sentiment
// ============================================================================

export async function analyzeMessage(message: string, userContext: any) {
  try {
    const analysis = await aiService.analyzeMessage(message, userContext);
    
    console.log('Message Analysis:', {
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      topics: analysis.topics,
      keywords: analysis.keywords,
      toxicity: analysis.toxicity
    });

    return analysis;
  } catch (error) {
    console.error('Message analysis failed:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 5: Get Contextual Message Suggestions
// ============================================================================

export async function getMessageSuggestions(userProfile: any, recentMessages: string[], communityContext: string) {
  try {
    const suggestions = await chatOrchestratorService.getMessageSuggestions(
      userProfile,
      recentMessages,
      communityContext
    );

    console.log('Generated suggestions:', suggestions);
    return suggestions;
  } catch (error) {
    console.error('Failed to get suggestions:', error);
    return [];
  }
}

// ============================================================================
// EXAMPLE 6: Content Moderation
// ============================================================================

export async function moderateContent(content: string) {
  try {
    const moderation = await aiService.moderateContent(content);
    
    console.log('Content Moderation:', {
      isSafe: moderation.isSafe,
      score: moderation.score,
      issues: moderation.issues
    });

    return moderation;
  } catch (error) {
    console.error('Content moderation failed:', error);
    return { isSafe: true, score: 0.1, issues: [] };
  }
}

// ============================================================================
// EXAMPLE 7: Multi-Model AI Response
// ============================================================================

export async function getMultiModelResponse(prompt: string) {
  try {
    const responses = await aiService.getMultiModelResponse(prompt, ['google', 'openai']);
    
    console.log('Multi-model responses:', responses);
    return responses;
  } catch (error) {
    console.error('Multi-model response failed:', error);
    return [];
  }
}

// ============================================================================
// EXAMPLE 8: Event Validation and Enhancement
// ============================================================================

export async function validateAndEnhanceEvent(eventDetails: any, originalMessage: string) {
  try {
    // Validate event details
    const validation = await eventSchedulerService.validateEventDetails(eventDetails);
    
    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors);
      console.log('Suggestions:', validation.suggestions);
      return { isValid: false, errors: validation.errors, suggestions: validation.suggestions };
    }

    // Enhance with AI
    const enhancedDetails = await eventSchedulerService.enhanceEventWithAI(
      eventDetails,
      originalMessage
    );

    console.log('Enhanced event details:', enhancedDetails);
    return { isValid: true, enhancedDetails };
  } catch (error) {
    console.error('Event validation/enhancement failed:', error);
    return { isValid: false, errors: ['Processing failed'], suggestions: [] };
  }
}

// ============================================================================
// EXAMPLE 9: Complete Chat Bot Implementation
// ============================================================================

export class ChatBot {
  private communityId: string;
  private userId: string;

  constructor(communityId: string, userId: string) {
    this.communityId = communityId;
    this.userId = userId;
  }

  async handleMessage(message: string) {
    try {
      // Step 1: Moderate content
      const moderation = await this.moderateContent(message);
      if (!moderation.isSafe) {
        return {
          type: 'moderation_warning',
          message: 'This message contains inappropriate content.',
          issues: moderation.issues
        };
      }

      // Step 2: Process through orchestrator
      const result = await chatOrchestratorService.handleNewMessage({
        text: message,
        communityId: this.communityId,
        userId: this.userId,
        enableEventCreation: true,
        enableAdminAlerts: true,
        enableAIReply: true
      });

      // Step 3: Return appropriate response
      return result;
    } catch (error) {
      console.error('Chat bot error:', error);
      return {
        type: 'error',
        message: 'Sorry, I encountered an error processing your message.'
      };
    }
  }

  private async moderateContent(content: string) {
    return await aiService.moderateContent(content);
  }

  async getSuggestions(userProfile: any, recentMessages: string[]) {
    return await chatOrchestratorService.getMessageSuggestions(
      userProfile,
      recentMessages,
      'Community context'
    );
  }
}

// ============================================================================
// EXAMPLE 10: Usage in React Component
// ============================================================================

/*
// In your React component:
import { detectUserIntent, createEventFromMessage, processChatMessage } from './examples';

const MyChatComponent = () => {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  const handleSendMessage = async () => {
    const result = await processChatMessage(message, communityId, userId);
    setResult(result);
  };

  const handleIntentDetection = async () => {
    const intent = await detectUserIntent(message, communityId, userId);
    console.log('Intent:', intent);
  };

  return (
    <div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
      />
      <button onClick={handleSendMessage}>Send</button>
      <button onClick={handleIntentDetection}>Detect Intent</button>
      {result && <div>Result: {JSON.stringify(result)}</div>}
    </div>
  );
};
*/

// ============================================================================
// MIGRATION GUIDE: From Old to New
// ============================================================================

/*
OLD WAY (using monolithic googleAI.ts):
----------------------------------------
import { googleAI } from '../googleAI';

const result = await googleAI.analyzeMessage(message);
const intent = await googleAI.detectIntent(message);

NEW WAY (using modular services):
--------------------------------
import { intentDetectionService, aiService } from './modules';

const intent = await intentDetectionService.detectIntent(message, context);
const analysis = await aiService.analyzeMessage(message, context);
const event = await eventSchedulerService.createEventFromMessage(message, communityId, userId);
const result = await chatOrchestratorService.handleNewMessage({ text: message, communityId, userId });
*/ 