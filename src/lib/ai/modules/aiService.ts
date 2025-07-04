import { supabase } from '../../supabase';

// API keys from environment variables
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface AIAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  keywords: string[];
  toxicity: number;
  actionItems: string[];
  confidence: number;
  language: string;
}

export interface ImageAnalysisResult {
  description: string;
  tags: string[];
  safetyCheck: {
    isSafe: boolean;
    issues?: string[];
  };
  objects?: string[];
  text?: string;
  landmarks?: string[];
  colors?: Array<{ name: string; hex: string }>;
}

export interface AIMessageSuggestion {
  text: string;
  confidence: number;
  category: string;
  reasoning: string;
}

export interface AIPersonalization {
  userInterests: string[];
  userExperienceLevel: string;
  userGoals: string[];
  recentTopics: string[];
}

class AIService {
  private async fetchFromGoogleAI(endpoint: string, payload: any): Promise<any> {
    if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
      throw new Error('Google AI API key is not configured.');
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  private async fetchFromOpenAI(prompt: string, system?: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private async fetchFromXAI(prompt: string): Promise<any> {
    if (!XAI_API_KEY) {
      throw new Error('xAI API key is not configured.');
    }

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
  }

  public async analyzeMessage(message: string, userPreferences?: any): Promise<any> {
    try {
      const { data: community } = await supabase
        .from('ai_community_profiles')
        .select('purpose, tone, common_topics, target_audience')
        .eq('community_id', userPreferences?.communityId)
        .single();

      const prompt = `Analyze this message and provide insights in JSON format:
Message: "${message}"

${userPreferences ? `User preferences: ${JSON.stringify(userPreferences)}` : ''}
${community ? `Community context: ${JSON.stringify({
  purpose: community.purpose,
  tone: community.tone,
  common_topics: community.common_topics,
  target_audience: community.target_audience
})}` : ''}

Return analysis in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "topics": ["topic1", "topic2"],
  "keywords": ["keyword1", "keyword2"],
  "toxicity": 0.0-1.0,
  "actionItems": ["action1", "action2"],
  "confidence": 0.0-1.0,
  "language": "en"
}`;

      const result = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', {
        contents: [{ parts: [{ text: prompt }] }],
      });

      let responseText = result.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in Google AI response');
      
      const analysisResult = JSON.parse(jsonMatch[0]);

      // Log interaction
      await this.saveInteraction(
        userPreferences?.userId || 'unknown',
        'analysis',
        message,
        analysisResult
      );

      return analysisResult;
    } catch (error) {
      console.error('Error analyzing message:', error);
      return {
        sentiment: 'neutral',
        topics: [],
        keywords: [],
        toxicity: 0,
        actionItems: [],
        confidence: 0,
        language: 'en'
      };
    }
  }

  public async analyzeImage(imageBase64: string): Promise<ImageAnalysisResult> {
    try {
      const result = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', {
        contents: [{
          parts: [
            { text: 'Analyze this image and provide details in JSON format:' },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }],
      });

      let responseText = result.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in image analysis response');
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing image:', error);
      return {
        description: 'Image analysis failed',
        tags: [],
        safetyCheck: { isSafe: true }
      };
    }
  }

  public async generateSuggestions(
    userProfile: any,
    recentMessages: string[],
    communityContext?: string
  ): Promise<AIMessageSuggestion[]> {
    try {
      const prompt = `Generate message suggestions based on:
User profile: ${JSON.stringify(userProfile)}
Recent messages: ${recentMessages.join(', ')}
Community context: ${communityContext || 'General community'}

Return suggestions in JSON format:
[
  {
    "text": "suggestion text",
    "confidence": 0.0-1.0,
    "category": "motivation|question|event|general",
    "reasoning": "why this suggestion is relevant"
  }
]`;

      const result = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', {
        contents: [{ parts: [{ text: prompt }] }],
      });

      let responseText = result.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return this.getFallbackSuggestions();
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  private getFallbackSuggestions(): AIMessageSuggestion[] {
    return [
      {
        text: "How's everyone doing today?",
        confidence: 0.8,
        category: 'general',
        reasoning: 'Friendly conversation starter'
      },
      {
        text: "Anyone up for a workout session?",
        confidence: 0.7,
        category: 'event',
        reasoning: 'Community fitness activity'
      },
      {
        text: "Great job everyone! Keep up the motivation! 💪",
        confidence: 0.9,
        category: 'motivation',
        reasoning: 'Positive encouragement'
      }
    ];
  }

  public async getMessageInsights(message: string, userContext?: any): Promise<string> {
    try {
      const prompt = `Provide a brief insight about this message: "${message}"
${userContext ? `User context: ${JSON.stringify(userContext)}` : ''}

Keep it concise and helpful.`;

      return await this.fetchFromOpenAI(prompt, 'You are a helpful AI assistant providing insights about community messages.');
    } catch (error) {
      console.error('Error getting message insights:', error);
      return 'Message analyzed successfully.';
    }
  }

  public async moderateContent(content: string): Promise<{
    isSafe: boolean;
    issues: string[];
    score: number;
  }> {
    try {
      const prompt = `Moderate this content for safety and appropriateness:
"${content}"

Return analysis in JSON format:
{
  "isSafe": true/false,
  "issues": ["issue1", "issue2"],
  "score": 0.0-1.0
}`;

      const result = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', {
        contents: [{ parts: [{ text: prompt }] }],
      });

      let responseText = result.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in moderation response');
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error moderating content:', error);
      return {
        isSafe: true,
        issues: [],
        score: 0.1
      };
    }
  }

  public async generateChatReply(message: string, context?: string): Promise<string> {
    try {
      const systemPrompt = `You are "Community AI", a cheerful assistant inside a fitness / hobby community.
Answer concisely, add emojis when appropriate, be friendly and supportive.
${context ? `Context: ${context}` : ''}`;

      return await this.fetchFromOpenAI(message, systemPrompt);
    } catch (error) {
      console.error('Error generating chat reply:', error);
      return 'Thanks for your message! I\'m here to help. 😊';
    }
  }

  private async saveInteraction(
    userId: string,
    interactionType: 'analysis' | 'suggestion' | 'insight',
    content: string,
    result: any,
    feedback?: 'positive' | 'negative'
  ): Promise<void> {
    try {
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: userId,
          interaction_type: interactionType,
          content,
          result,
          feedback,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving AI interaction:', error);
    }
  }

  public async getMultiModelResponse(
    prompt: string,
    models: ('google' | 'openai' | 'xai')[] = ['google', 'openai']
  ): Promise<{ model: string; response: any; confidence: number }[]> {
    const responses: { model: string; response: any; confidence: number }[] = [];

    for (const model of models) {
      try {
        let response: any;
        switch (model) {
          case 'google':
            const googleResult = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', {
              contents: [{ parts: [{ text: prompt }] }],
            });
            response = googleResult.candidates[0].content.parts[0].text.trim();
            break;
          case 'openai':
            response = await this.fetchFromOpenAI(prompt);
            break;
          case 'xai':
            response = await this.fetchFromXAI(prompt);
            break;
        }
        responses.push({ model, response, confidence: 0.8 });
      } catch (error) {
        console.error(`Error with ${model} model:`, error);
      }
    }

    return responses;
  }
}

export const aiService = new AIService(); 