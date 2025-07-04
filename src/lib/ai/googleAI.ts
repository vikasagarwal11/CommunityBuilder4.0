import { supabase } from '../supabase';
import type { CommunityAIProfile } from '../types/community';

// API keys from environment variables
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Dummy log to confirm file update
console.log('This is the updated GoogleAI.ts file as of 07/03/2025');

export interface AIAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  keywords: string[];
  toxicity: number;
  actionItems: string[];
  confidence: number;
  language: string;
}

interface KeywordAnalysisResult {
  keywords: string[];
  relevance: number[];
  categories: string[];
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

export interface CommunityProfile {
  id: string;
  name: string;
  description: string;
  tags: string[];
  purpose: string;
  tone: 'casual' | 'supportive' | 'professional' | 'motivational';
  targetAudience: string[];
  commonTopics: string[];
  eventTypes: string[];
  createdAt: string;
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

class GoogleAI {
  private async fetchFromGoogleAI(endpoint: string, payload: any): Promise<any> {
    console.log(`Fetching from Google AI API: ${endpoint} with payload:`, JSON.stringify(payload));
    if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
      console.error('Google AI API key is not configured. Please set VITE_GOOGLE_AI_API_KEY in your .env file.');
      throw new Error('Google AI API key is not configured.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}?key=${GOOGLE_AI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google AI API error: ${response.status} - ${errorText}`);
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Google AI API response:`, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error calling Google AI API:', error);
      throw error;
    }
  }

  private async fetchFromXAI(prompt: string): Promise<any> {
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
      console.error('Error calling xAI API:', error);
      throw error;
    }
  }

  public async analyzeMessage(message: string, userPreferences?: any): Promise<any> {
    try {
      const { data: community } = await supabase
        .from('ai_community_profiles')
        .select('purpose, tone, common_topics, target_audience')
        .eq('community_id', userPreferences?.communityId)
        .single();

      const prompt = `Classify the intent of this message and provide details in JSON format:
Message: "${message}"

${userPreferences ? `User preferences: ${JSON.stringify(userPreferences)}` : ''}
${community ? `Community context: ${JSON.stringify({
  purpose: community.purpose,
  tone: community.tone,
  common_topics: community.common_topics,
  target_audience: community.target_audience
})}` : ''}

Required JSON structure:
{
  "intent_type": "event|feedback|question|announcement|other",
  "confidence": number,
  "details": {
    // For event: { title: string, description: string, date?: string, time?: string, location?: string, suggestedDuration?: number, suggestedCapacity?: number, tags?: string[], isOnline?: boolean, meetingUrl?: string }
    // For feedback: { sentiment: "positive|negative|neutral", topic: string }
    // For question: { topic: string, urgency: "high|medium|low" }
    // For announcement: { summary: string }
    // For other: { description: string }
  }
}

Ensure the response aligns with the community context and user preferences.`;

      // Try Google AI first
      let result = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', {
        contents: [{ parts: [{ text: prompt }] }],
      });
      let responseText = result.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in Google AI response');
      let analysisResult = JSON.parse(jsonMatch[0]);

      // Log to ai_interactions
      await this.saveInteraction(
        userPreferences?.userId || 'unknown',
        'analysis',
        message,
        analysisResult
      );

      // If confidence is low, validate with OpenAI and xAI
      if (analysisResult.confidence < 0.7) {
        const results = [analysisResult];
        try {
          const xAIResult = await this.fetchFromXAI(prompt);
          results.push({ ...xAIResult, source: 'xai' });
        } catch (xAIError) {
          console.warn('xAI fallback failed:', xAIError);
        }

        // Ensemble voting: choose the result with highest confidence
        analysisResult = results.reduce((best, curr) =>
          curr.confidence > best.confidence ? curr : best
        );

        // Log edge case if confidence remains low or intent is 'other'
        if (analysisResult.confidence < 0.7 || analysisResult.intent_type === 'other') {
          await this.logAIGeneration(
            userPreferences?.communityId || 'unknown',
            'intent_detection',
            'unrecognized',
            { message, results },
            analysisResult
          );
        }
      }

      // Trigger learning system updates
      if (analysisResult.intent_type === 'event') {
        try {
          const { learningSystem } = await import('./learningSystem');
          // Optionally, trigger user interest vector update
          if (userPreferences?.userId && userPreferences?.communityId) {
            await learningSystem.onUserJoinsCommunity(userPreferences.userId, userPreferences.communityId);
          }
        } catch (error) {
          console.warn('Failed to update learning system:', error);
        }
      } else if (analysisResult.intent_type === 'feedback' || analysisResult.intent_type === 'question') {
        try {
          const { learningSystem } = await import('./learningSystem');
          if (userPreferences?.userId && userPreferences?.communityId) {
            await learningSystem.onUserJoinsCommunity(userPreferences.userId, userPreferences.communityId);
          }
        } catch (error) {
          console.warn('Failed to update user interest vector:', error);
        }
      }

      return analysisResult;
    } catch (error) {
      console.error('Error analyzing message:', error);
      const fallbackResult = {
        intent_type: 'other',
        confidence: 0,
        details: { description: message },
      };
      await this.logAIGeneration(
        userPreferences?.communityId || 'unknown',
        'intent_detection',
        'error',
        { message, error: error.message },
        fallbackResult,
        error.message
      );
      return fallbackResult;
    }
  }

  public async analyzeImage(imageBase64: string): Promise<ImageAnalysisResult> {
    try {
      const payload = {
        contents: [
          {
            parts: [
              {
                text: `Analyze this image and provide a detailed description. 
              
IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or formatting. Do not include markdown code blocks or any other text.

Required JSON structure:
{
  "description": "A detailed description of the image",
  "tags": ["tag1", "tag2", "tag3"],
  "safetyCheck": {
    "isSafe": true,
    "issues": []
  },
  "objects": ["object1", "object2"],
  "text": "Any text visible in the image",
  "landmarks": ["landmark1", "landmark2"],
  "colors": [
    {"name": "Blue", "hex": "#4285F4"},
    {"name": "Red", "hex": "#EA4335"}
  ]
}`,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                },
              },
            ],
          },
        ],
      };

      const response = await this.fetchFromGoogleAI('models/gemini-1.5-pro:generateContent', payload);

      let responseText = response.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const analysisResult = JSON.parse(jsonMatch[0]);
      return analysisResult;
    } catch (error) {
      console.error('Error analyzing image:', error);
      return {
        description: 'Unable to analyze image',
        tags: ['unknown'],
        safetyCheck: {
          isSafe: true,
          issues: [],
        },
      };
    }
  }

  public async generateSuggestions(
    userProfile: any,
    recentMessages: string[],
    communityContext?: string
  ): Promise<AIMessageSuggestion[]> {
    try {
      const userInterests = [...(userProfile?.interests || []), ...(userProfile?.custom_interests || [])];

      const prompt = `Generate 4 personalized message suggestions for a fitness community chat.

User profile:
- Interests: ${userInterests.join(', ') || 'Not specified'}
- Experience level: ${userProfile?.experience_level || 'Not specified'}
- Goals: ${userProfile?.fitness_goals?.join(', ') || 'Not specified'}
- Preferences: ${JSON.stringify(userProfile?.preferences || {})}

Recent conversation context:
${recentMessages.slice(-5).join('\n')}

Community context:
${communityContext || 'General fitness community for mothers'}

IMPORTANT: Return ONLY a valid JSON array with no additional text, explanations, markdown formatting, or code blocks. Do not include any text before or after the JSON.

Required JSON structure:
[
  {
    "text": "Suggestion text here",
    "confidence": 0.9,
    "category": "question",
    "reasoning": "Why this suggestion is relevant"
  },
  {
    "text": "Another suggestion",
    "confidence": 0.8,
    "category": "encouragement",
    "reasoning": "Another reason"
  }
]

Categories must be one of: question, encouragement, advice, sharing
Make suggestions relevant, supportive, and tailored to the user's interests and conversation context.`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);

      let responseText = response.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in response');
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }

      const validSuggestions = suggestions.filter((s) => s.text && s.confidence && s.category && s.reasoning);
      return validSuggestions.length > 0 ? validSuggestions : this.getFallbackSuggestions();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  private getFallbackSuggestions(): AIMessageSuggestion[] {
    return [
      {
        text: "How's everyone's workout going today?",
        confidence: 0.8,
        category: 'question',
        reasoning: 'General fitness conversation starter',
      },
      {
        text: 'I just completed a 30-minute HIIT session. Anyone else working out today?',
        confidence: 0.7,
        category: 'sharing',
        reasoning: 'Sharing personal achievement to encourage others',
      },
      {
        text: "What's your favorite post-workout meal for energy recovery?",
        confidence: 0.7,
        category: 'question',
        reasoning: 'Nutrition is important for fitness',
      },
      {
        text: 'Looking for recommendations for a good beginner-friendly yoga routine!',
        confidence: 0.6,
        category: 'advice',
        reasoning: 'Seeking community advice',
      },
    ];
  }

  public async getMessageInsights(message: string, userContext?: any): Promise<string> {
    try {
      const prompt = `
        Analyze this message from a fitness community chat and provide helpful insights:
        "${message}"
        
        ${userContext ? `User context: ${JSON.stringify(userContext)}` : ''}
        
        Provide a brief, helpful insight about this message that would be valuable to the user.
        Focus on being supportive, educational, and motivational.
        Keep your response under 100 words and make it conversational.
      `;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);
      return response.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error('Error getting message insights:', error);
      return 'I noticed this message might be important. The community is here to support your fitness journey!';
    }
  }

  public async analyzeChatTrends(messages: any[], timeframe: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    try {
      const messageData = messages.map((msg) => ({
        content: msg.content,
        timestamp: msg.created_at,
      }));

      const prompt = `
        Analyze these chat messages from a fitness community and provide analytics:
        ${JSON.stringify(messageData)}
        
        Timeframe: ${timeframe}
        
        IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or formatting.
        
        Required JSON structure:
        {
          "topTopics": [{"topic": "string", "count": 5, "sentiment": "positive"}],
          "sentimentAnalysis": {"positive": 60, "neutral": 30, "negative": 10},
          "engagementMetrics": {"averageMessagesPerUser": 5, "peakActivityTime": "18:00-20:00"},
          "commonQuestions": ["string"],
          "actionableInsights": ["string"]
        }
      `;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);

      let responseText = response.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing chat trends:', error);
      return {
        topTopics: [
          { topic: 'workout', count: 15, sentiment: 'positive' },
          { topic: 'nutrition', count: 10, sentiment: 'neutral' },
          { topic: 'motivation', count: 8, sentiment: 'positive' },
        ],
        sentimentAnalysis: { positive: 60, neutral: 30, negative: 10 },
        engagementMetrics: { averageMessagesPerUser: 5, peakActivityTime: '18:00-20:00' },
        commonQuestions: ['How to find time for workouts?', 'What are good post-workout meals?'],
        actionableInsights: ['Users are interested in time-efficient workouts', 'Nutrition advice is frequently requested'],
      };
    }
  }

  public async generateCommunityProfileSuggestions(
    name: string,
    description: string,
    tags: string[]
  ): Promise<CommunityAIProfile> {
    console.log(`Generating community profile suggestions for name: ${name}, description: ${description}, tags: ${tags.join(', ')}`);
    try {
      if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
        console.warn('Google AI API key not configured, creating default profile');
        return await this.createDefaultProfileSuggestion(name, description, tags);
      }

      const sentimentAnalysis = await this.analyzeMessage(description);
      console.log('Sentiment analysis result:', JSON.stringify(sentimentAnalysis));
      const keywordAnalysis = await this.analyzeKeywords(description);
      console.log('Keyword analysis result:', JSON.stringify(keywordAnalysis));

      const profileData = await this._generateCommunityProfileData(name, description, tags, keywordAnalysis, sentimentAnalysis.sentiment);

      const communityProfile: CommunityAIProfile = {
        community_id: '',
        purpose: profileData.purpose,
        tone: profileData.tone,
        target_audience: profileData.targetAudience,
        common_topics: profileData.commonTopics,
        event_types: profileData.eventTypes,
        recommended_event_frequency: profileData.recommendedEventFrequency || 'monthly',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      console.log('Generated community profile:', JSON.stringify(communityProfile));
      return communityProfile;
    } catch (error) {
      console.error('Error generating community profile suggestions:', error);
      try {
        return await this.createDefaultProfileSuggestion(name, description, tags);
      } catch (fallbackError) {
        console.error('Error creating default profile suggestion:', fallbackError);
        const defaultProfile: CommunityAIProfile = {
          community_id: '',
          purpose: 'Supporting members in their journey',
          tone: 'supportive',
          target_audience: ['Community Members'],
          common_topics: tags.length > 0 ? tags : ['General Discussion'],
          event_types: ['Meetups', 'Discussions', 'Workshops'],
          recommended_event_frequency: 'monthly',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        return defaultProfile;
      }
    }
  }

  public async generateAndLogCommunityProfile(
    communityId: string,
    name: string,
    description: string,
    tags: string[]
  ): Promise<CommunityAIProfile> {
    console.log(
      `Generating and logging community profile for communityId: ${communityId}, name: ${name}, description: ${description}, tags: ${tags.join(', ')}`
    );
    try {
      if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY === 'your_google_ai_api_key_here') {
        console.warn('Google AI API key not configured, creating default profile');
        return await this.createDefaultProfile(communityId, name, description, tags);
      }

      const sentimentAnalysis = await this.analyzeMessage(description);
      console.log('Sentiment analysis result:', JSON.stringify(sentimentAnalysis));
      const keywordAnalysis = await this.analyzeKeywords(description);
      console.log('Keyword analysis result:', JSON.stringify(keywordAnalysis));

      await this.logAIGeneration(communityId, 'generate_profile', 'started', {
        name,
        description,
        tags,
        keywordAnalysis,
        sentiment: sentimentAnalysis.sentiment,
      });

      const profileData = await this._generateCommunityProfileData(name, description, tags, keywordAnalysis, sentimentAnalysis.sentiment);

      const communityProfile: CommunityAIProfile = {
        community_id: communityId,
        purpose: profileData.purpose,
        tone: profileData.tone,
        target_audience: profileData.targetAudience,
        common_topics: profileData.commonTopics,
        event_types: profileData.eventTypes,
        recommended_event_frequency: profileData.recommendedEventFrequency || 'monthly',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      await this.logAIGeneration(communityId, 'generate_profile', 'success', {
        name,
        description,
        tags,
        keywordAnalysis,
        sentiment: sentimentAnalysis.sentiment,
      }, communityProfile);

      console.log('Successfully generated and logged community profile:', JSON.stringify(communityProfile));
      return communityProfile;
    } catch (error) {
      console.error('Error generating community profile:', error);
      await this.logAIGeneration(communityId, 'generate_profile', 'error', {
        name,
        description,
        tags,
        error: error.message,
      }, null, error.message);
      try {
        return await this.createDefaultProfile(communityId, name, description, tags);
      } catch (fallbackError) {
        console.error('Error creating default profile:', fallbackError);
        const defaultProfile: CommunityAIProfile = {
          community_id: communityId,
          purpose: 'Supporting members in their journey',
          tone: 'supportive',
          target_audience: ['Community Members'],
          common_topics: tags.length > 0 ? tags : ['General Discussion'],
          event_types: ['Meetups', 'Discussions', 'Workshops'],
          recommended_event_frequency: 'monthly',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        return defaultProfile;
      }
    }
  }

  private async _generateCommunityProfileData(
    name: string,
    description: string,
    tags: string[],
    keywordAnalysis: KeywordAnalysisResult,
    sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
  ): Promise<any> {
    console.log(`Generating profile data for name: ${name}, description: ${description}, sentiment: ${sentiment}, tags: ${tags.join(', ')}`);
    const prompt = `
      Generate an AI-powered community profile for a community with the following information:

      Name (optional input): ${name || 'Not provided'}
      Description: ${description}
      Tags: ${tags.join(', ')}

      Extracted Keywords: ${keywordAnalysis.keywords.join(', ')}
      Keyword Categories: ${keywordAnalysis.categories.join(', ')}
      Sentiment: ${sentiment}

      Based on this information, create a comprehensive community profile that includes:
      1. A unique, concise community name (if not provided, generate one based on keywords and description, avoiding direct use of input text)
      2. A rephrased and polished description that summarizes the community's purpose and audience, avoiding direct copying of the input
      3. The community's purpose
      4. The tone of the community (casual, supportive, professional, motivational), influenced by the sentiment
      5. Target audience
      6. Common topics of discussion
      7. Types of events that would be appropriate
      8. Recommended event frequency (e.g., weekly, biweekly, monthly)

      IMPORTANT: Return ONLY a valid JSON object with no additional text or formatting.

      Required JSON structure:
      {
        "name": "string",
        "description": "string",
        "purpose": "string",
        "tone": "casual",
        "targetAudience": ["string"],
        "commonTopics": ["string"],
        "eventTypes": ["string"],
        "recommendedEventFrequency": "weekly|biweekly|monthly"
      }

      For tone, only use one of these values: casual, supportive, professional, motivational
      For recommendedEventFrequency, only use one of these values: weekly, biweekly, monthly

      IMPORTANT: Focus on the extracted keywords and their categories to ensure the profile reflects the community's focus. Prioritize keywords with higher relevance scores. The name must be unique and not a direct derivative of the input. The description must be a creative rephrasing, not a verbatim copy.
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);

    let responseText = response.candidates[0].content.parts[0].text.trim();
    responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON found in response');
      throw new Error('No valid JSON found in response');
    }

    const profileData = JSON.parse(jsonMatch[0]);
    const validTones = ['casual', 'supportive', 'professional', 'motivational'];
    const validFrequencies = ['weekly', 'biweekly', 'monthly'];
    if (!validTones.includes(profileData.tone)) {
      profileData.tone = sentiment === 'positive' ? 'motivational' : 'supportive';
    }
    if (!validFrequencies.includes(profileData.recommendedEventFrequency)) {
      profileData.recommendedEventFrequency = 'monthly';
    }

    console.log('Generated profile data:', JSON.stringify(profileData));
    return profileData;
  }

  public async generateCommunityProfile(
    communityId: string,
    name: string,
    description: string,
    tags: string[]
  ): Promise<CommunityAIProfile> {
    if (communityId && communityId.length === 36 && communityId.includes('-')) {
      return this.generateAndLogCommunityProfile(communityId, name, description, tags);
    } else {
      return this.generateCommunityProfileSuggestions(name, description, tags);
    }
  }

  private async createDefaultProfileSuggestion(
    name: string,
    description: string,
    tags: string[]
  ): Promise<CommunityAIProfile> {
    const defaultProfile: CommunityAIProfile = {
      community_id: '',
      purpose: `A community for people interested in ${name.toLowerCase()}`,
      tone: 'supportive',
      target_audience: ['Community members', 'Enthusiasts'],
      common_topics: tags.length > 0 ? tags : ['General discussion'],
      event_types: ['Meetups', 'Discussions', 'Workshops'],
      recommended_event_frequency: 'monthly',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    return defaultProfile;
  }

  private async createDefaultProfile(
    communityId: string,
    name: string,
    description: string,
    tags: string[]
  ): Promise<CommunityAIProfile> {
    const defaultProfile: CommunityAIProfile = {
      community_id: communityId,
      purpose: `A community for people interested in ${name.toLowerCase()}`,
      tone: 'supportive',
      target_audience: ['Community members', 'Enthusiasts'],
      common_topics: tags.length > 0 ? tags : ['General discussion'],
      event_types: ['Meetups', 'Discussions', 'Workshops'],
      recommended_event_frequency: 'monthly',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    await this.logAIGeneration(communityId, 'create_default_profile', 'success', {
      name,
      description,
      tags,
    }, defaultProfile);

    return defaultProfile;
  }

  private async logAIGeneration(
    communityId: string,
    operationType: string,
    status: 'started' | 'success' | 'error' | 'unrecognized',
    inputData: any,
    outputData?: any,
    errorMessage?: string
  ): Promise<void> {
    console.log(
      `Attempting to log AI generation: communityId=${communityId}, operationType=${operationType}, status=${status}, inputData=`,
      JSON.stringify(inputData)
    );
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User authentication check:', user ? `Authenticated as ${user.id}` : 'Not authenticated');
      if (!user) {
        console.warn('Cannot log AI generation: user not authenticated');
        return;
      }

      const logData = {
        community_id: communityId || null,
        operation_type: operationType,
        status,
        error_message: errorMessage,
        input_data: inputData,
        output_data: outputData,
        created_at: new Date().toISOString(),
        created_by: user.id,
      };
      console.log('Log data to insert:', JSON.stringify(logData));

      const { error } = await supabase.from('ai_generation_logs').insert(logData);
      if (error) {
        console.error('Supabase insert error:', error.message);
      } else {
        console.log('Log successfully inserted into ai_generation_logs');
      }
    } catch (error) {
      console.error('Error logging AI generation:', error);
    }
  }

  public async getCommunityProfile(communityId: string): Promise<CommunityProfile | null> {
    try {
      const { data: community } = await supabase
        .from('communities')
        .select('name, description, tags')
        .eq('id', communityId)
        .single();

      if (!community) return null;

      const { data: profile } = await supabase
        .from('ai_community_profiles')
        .select(`
          id,
          community_id,
          purpose,
          tone,
          target_audience,
          common_topics,
          event_types,
          is_active,
          created_at,
          knowledge_transfer_enabled,
          anonymized_insights
        `)
        .eq('community_id', communityId)
        .maybeSingle();

      if (!profile) {
        const newProfile = await this.generateAndLogCommunityProfile(
          communityId,
          community.name,
          community.description,
          community.tags || []
        );

        try {
          await supabase
            .from('ai_community_profiles')
            .insert({
              community_id: newProfile.community_id,
              purpose: newProfile.purpose,
              tone: newProfile.tone,
              target_audience: newProfile.target_audience,
              common_topics: newProfile.common_topics,
              event_types: newProfile.event_types,
              recommended_event_frequency: newProfile.recommended_event_frequency,
              is_active: true,
              created_at: new Date().toISOString(),
            });
        } catch (error) {
          console.error('Error saving new community profile:', error);
        }

        return newProfile;
      }

      const communityProfile: CommunityAIProfile = {
        id: profile.id,
        community_id: profile.community_id,
        purpose: profile.purpose,
        tone: profile.tone,
        target_audience: profile.target_audience || [],
        common_topics: profile.common_topics || [],
        event_types: profile.event_types || [],
        recommended_event_frequency: 'monthly',
        is_active: profile.is_active,
        knowledge_transfer_enabled: profile.knowledge_transfer_enabled,
        anonymized_insights: profile.anonymized_insights,
        created_at: profile.created_at,
      };

      return communityProfile;
    } catch (error) {
      console.error('Error getting community profile:', error);
      await this.logAIGeneration(communityId, 'get_profile', 'error', { communityId }, null, error.message);
      return null;
    }
  }

  public async analyzeKeywords(text: string): Promise<KeywordAnalysisResult> {
    try {
      const prompt = `
        Analyze the following text and extract the most relevant keywords, their relevance scores (0-1), 
        and categorize them into topics.
        
        Text to analyze: "${text}"
        
        IMPORTANT: Return ONLY a valid JSON object with no additional text or formatting.
        
        Required JSON structure:
        {
          "keywords": ["keyword1", "keyword2", ...],
          "relevance": [0.9, 0.8, ...],
          "categories": ["category1", "category2", ...]
        }
        
        Extract at least 5 keywords and categorize them appropriately.
      `;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);

      let responseText = response.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analyzing keywords:', error);
      return {
        keywords: [],
        relevance: [],
        categories: [],
      };
    }
  }

  public async saveInteraction(
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
          result: JSON.stringify(result),
          feedback,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving AI interaction:', error);
    }
  }

  public async moderateContent(content: string): Promise<{
    isSafe: boolean;
    issues: string[];
    score: number;
  }> {
    try {
      const prompt = `
        Moderate this content for a fitness community chat:
        "${content}"
        
        Check for:
        1. Inappropriate language
        2. Harmful advice
        3. Misinformation about health/fitness
        4. Spam or promotional content
        5. Personal attacks
        
        IMPORTANT: Return ONLY a valid JSON object with no additional text or formatting.
        
        Required JSON structure:
        {
          "isSafe": true,
          "issues": ["issue1", "issue2"],
          "score": 0.9
        }
        
        Score should be 0-1 where 1 is completely safe.
      `;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);

      let responseText = response.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error moderating content:', error);
      return {
        isSafe: true,
        issues: [],
        score: 1.0,
      };
    }
  }

  public async saveProfileFeedback(
    communityId: string,
    userId: string,
    fieldName: string,
    originalValue: string,
    editedValue: string,
    feedback: 'positive' | 'negative'
  ): Promise<void> {
    try {
      await supabase
        .from('ai_profile_feedback')
        .insert({
          community_id: communityId,
          field_name: fieldName,
          original_value: originalValue,
          edited_value: editedValue,
          feedback,
          created_by: userId,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving profile feedback:', error);
    }
  }

  public async generateEventRecommendations(communityId: string): Promise<any[]> {
    try {
      const profile = await this.getCommunityProfile(communityId);
      if (!profile) throw new Error('Community profile not found');

      const prompt = `
        Generate 3 event recommendations for a community with the following profile:
        
        Community name: ${profile.name}
        Purpose: ${profile.purpose}
        Target audience: ${profile.targetAudience?.join(', ') || ''}
        Common topics: ${profile.commonTopics?.join(', ') || ''}
        Preferred event types: ${profile.eventTypes?.join(', ') || ''}
        
        IMPORTANT: Return ONLY a valid JSON array with no additional text or formatting.
        
        Required JSON structure:
        [
          {
            "title": "string",
            "description": "string",
            "duration": 60,
            "participantLimit": 20,
            "difficulty": "beginner",
            "tags": ["string"],
            "equipment": ["string"]
          }
        ]
      `;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);

      let responseText = response.candidates[0].content.parts[0].text.trim();
      responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generating event recommendations:', error);
      try {
        await this.logAIGeneration(communityId, 'generate_event_recommendations', 'error', {
          communityId,
        }, null, error.message);
      } catch (logError) {
        console.error('Error logging event recommendation failure:', logError);
      }
      return [
        {
          title: 'Community Meetup',
          description: 'A casual gathering for community members to meet and connect.',
          duration: 60,
          participantLimit: 20,
          difficulty: 'beginner',
          tags: ['social', 'networking', 'community'],
          equipment: ['none'],
        },
        {
          title: 'Discussion Forum',
          description: 'An organized discussion on topics relevant to our community.',
          duration: 90,
          participantLimit: 15,
          difficulty: 'intermediate',
          tags: ['discussion', 'learning', 'sharing'],
          equipment: ['notebook', 'pen'],
        },
        {
          title: 'Workshop Session',
          description: 'A hands-on workshop to learn new skills together.',
          duration: 120,
          participantLimit: 25,
          difficulty: 'beginner',
          tags: ['workshop', 'skills', 'learning'],
          equipment: ['varies by topic'],
        },
      ];
    }
  }

  public async generateEventFromPrompt(prompt: string, context?: any): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const aiPrompt = `
Based on the following description, generate an event object with fields:
- title
- description
- location
- startDate (YYYY-MM-DD, absolutely resolved; e.g., if prompt says "next sunday", resolve to the actual date based on today: ${today})
- startTime (24h HH:mm, e.g., "14:30", or empty string if not specified)
- endDate (YYYY-MM-DD, resolved or empty string)
- endTime (24h HH:mm, or empty string)
- capacity (number or null)
- participantLimit (number or null, same as capacity)
- isOnline (boolean)
- meetingUrl (string or empty)
- isRecurring (boolean)
- recurrencePattern (daily|weekly|monthly)
- tags (array of strings)

IMPORTANT:
- All date and time fields must be absolute, not relative. E.g., "next sunday" → "2025-07-06".
- If time is not specified in the description, set startTime/endTime to an empty string.
- If a field is not mentioned, use empty string, null, or reasonable default.
- For participant limit/capacity, use any number mentioned or null.
- Return ONLY a valid JSON object with no extra text or formatting.

Description: "${prompt}"
${context && context.communityId ? `CommunityId: ${context.communityId}` : ''}
`;

    const payload = {
      contents: [{ parts: [{ text: aiPrompt }] }],
    };

    const response = await this.fetchFromGoogleAI('models/gemini-2.0-flash:generateContent', payload);

    let responseText = response.candidates[0].content.parts[0].text.trim();
    responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    const aiEvent = JSON.parse(jsonMatch[0]);

    // Fallbacks for missing values, and always map participantLimit to capacity
    if (!aiEvent.capacity && aiEvent.participantLimit) {
      aiEvent.capacity = aiEvent.participantLimit;
    }
    if (aiEvent.capacity === undefined) aiEvent.capacity = null;
    if (!aiEvent.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(aiEvent.startDate)) aiEvent.startDate = '';
    if (!aiEvent.startTime || !/^\d{2}:\d{2}$/.test(aiEvent.startTime)) aiEvent.startTime = '';
    if (!aiEvent.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(aiEvent.endDate)) aiEvent.endDate = '';
    if (!aiEvent.endTime || !/^\d{2}:\d{2}$/.test(aiEvent.endTime)) aiEvent.endTime = '';
    if (!Array.isArray(aiEvent.tags)) aiEvent.tags = [];
    return aiEvent;
  }
}

export const googleAI = new GoogleAI();

// Update fetchOpenAIIntent to call the new Supabase Edge Function
async function fetchOpenAIIntent(prompt: string): Promise<any> {
  // Adjust the URL to your deployed Supabase Edge Function if needed
  const response = await fetch('/functions/v1/openai-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error('Failed to fetch OpenAI intent');
  const data = await response.json();
  return data.result;
}