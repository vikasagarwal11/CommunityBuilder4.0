import { supabase } from '../../supabase';

export interface DetectedIntent {
  intent: 'create_event' | 'schedule_poll' | 'admin_alert' | 'general_chat';
  confidence: number;
  entities: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    suggestedDuration?: number;
    suggestedCapacity?: number;
    tags?: string[];
    isOnline?: boolean;
    meetingUrl?: string;
  };
  context?: {
    communityId?: string;
    userId?: string;
  };
}

class IntentDetectionService {
  private async callGemini(prompt: string): Promise<any> {
    const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

    if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
      throw new Error('Google AI API key is not configured.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      let responseText = data.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in Google AI response');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      throw error;
    }
  }

  private async callXAI(prompt: string): Promise<any> {
    const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;

    if (!XAI_API_KEY) {
      throw new Error('xAI API key is not configured.');
    }

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-3',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`xAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      let responseText = data.choices[0].message.content.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No valid JSON found in xAI response');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error calling xAI:', error);
      throw error;
    }
  }

  public async detectIntent(message: string, context?: { communityId?: string; userId?: string }): Promise<DetectedIntent> {
    try {
      // Get community context if available
      let communityContext = '';
      if (context?.communityId) {
        const { data: community } = await supabase
          .from('communities')
          .select('name, description, tags')
          .eq('id', context.communityId)
          .single();
        
        if (community) {
          communityContext = `Community: ${community.name}
Description: ${community.description}
Tags: ${community.tags?.join(', ') || 'None'}`;
        }
      }

      const prompt = `Analyze this message and detect the user's intent. Return ONLY valid JSON.

Message: "${message}"

${communityContext ? `Context:\n${communityContext}\n` : ''}

Detect if the user wants to:
1. create_event - User wants to schedule/organize an event, meeting, or activity
2. schedule_poll - User wants to create a poll or survey
3. admin_alert - User needs admin attention or has a concern
4. general_chat - Regular conversation, questions, or general discussion

For event intents, extract these details:
- title: Event name or type
- description: What the event is about
- date: Date in YYYY-MM-DD format (extract from relative terms like "tomorrow", "next Friday", "this weekend")
- time: Time in HH:MM format (24-hour)
- location: Where the event will be held
- suggestedDuration: Duration in minutes
- suggestedCapacity: Number of participants
- tags: Relevant categories or tags
- isOnline: Boolean for online events
- meetingUrl: Meeting link if mentioned

Return JSON with this structure:
{
  "intent": "create_event|schedule_poll|admin_alert|general_chat",
  "confidence": 0.0-1.0,
  "entities": {
    "title": "string?",
    "description": "string?",
    "date": "YYYY-MM-DD?",
    "time": "HH:MM?",
    "location": "string?",
    "suggestedDuration": "number?",
    "suggestedCapacity": "number?",
    "tags": ["string"]?,
    "isOnline": "boolean?",
    "meetingUrl": "string?"
  }
}`;

      // Try Gemini first
      let result = await this.callGemini(prompt);
      
      // If confidence is low or intent is unclear, try xAI
      if (result.confidence < 0.6 || result.intent === 'general_chat') {
        try {
          const xAIResult = await this.callXAI(prompt);
          // Use xAI result if it has higher confidence
          if (xAIResult.confidence > result.confidence) {
            result = xAIResult;
          }
        } catch (xAIError) {
          console.warn('xAI fallback failed:', xAIError);
        }
      }

      // Validate and normalize the result
      const validatedResult: DetectedIntent = {
        intent: result.intent || 'general_chat',
        confidence: Math.min(Math.max(result.confidence || 0, 0), 1),
        entities: {
          title: result.entities?.title,
          description: result.entities?.description,
          date: result.entities?.date,
          time: result.entities?.time,
          location: result.entities?.location,
          suggestedDuration: result.entities?.suggestedDuration,
          suggestedCapacity: result.entities?.suggestedCapacity,
          tags: Array.isArray(result.entities?.tags) ? result.entities.tags : [],
          isOnline: Boolean(result.entities?.isOnline),
          meetingUrl: result.entities?.meetingUrl,
        },
        context
      };

      // Log the interaction
      await this.logIntentDetection(message, validatedResult, context);

      return validatedResult;
    } catch (error) {
      console.error('Intent detection failed:', error);
      return {
        intent: 'general_chat',
        confidence: 0,
        entities: {},
        context
      };
    }
  }

  private async logIntentDetection(message: string, result: DetectedIntent, context?: { communityId?: string; userId?: string }): Promise<void> {
    try {
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: context?.userId || 'unknown',
          community_id: context?.communityId,
          interaction_type: 'intent_detection',
          input_content: message,
          output_content: JSON.stringify(result),
          model_used: 'gemini-xai-sequential',
          confidence_score: result.confidence,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log intent detection:', error);
    }
  }

  public async extractEventDetailsFromPrompt(prompt: string, context?: { communityId?: string }): Promise<DetectedIntent['entities']> {
    try {
      const result = await this.detectIntent(prompt, context);
      return result.entities;
    } catch (error) {
      console.error('Failed to extract event details:', error);
      return {};
    }
  }
}

export const intentDetectionService = new IntentDetectionService(); 