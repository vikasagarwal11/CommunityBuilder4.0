import { supabase } from '../supabase';

// API keys from environment variables
const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const COHERE_API_KEY = import.meta.env.VITE_COHERE_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// API endpoints
const XAI_ENDPOINT = 'https://api.x.ai/v1/chat/completions';
const GEMINI_ENDPOINT = 'https://api.google.ai/generative/v1/models/gemini-1.5-pro:generateContent';
const COHERE_ENDPOINT = 'https://api.cohere.ai/classify';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  model: string;
  confidence: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  suggestions?: string[];
  audioUrl?: string;
}

export interface MoodSyncOptions {
  enabled: boolean;
  adaptToSentiment: boolean;
  personalityType?: 'empathetic' | 'motivational' | 'analytical' | 'supportive';
}

export interface MemoryEchoOptions {
  enabled: boolean;
  depth: number; // How many past conversations to include
  includeUserProfile: boolean;
}

export interface HoloVoiceOptions {
  enabled: boolean;
  voice: 'feminine' | 'masculine' | 'neutral';
  emotionIntensity: number; // 0-1
  speed: number; // 0.5-2.0
}

export interface MultiModelChatOptions {
  preferredModel?: 'xai' | 'gemini' | 'groq';
  moodSync?: MoodSyncOptions;
  memoryEcho?: MemoryEchoOptions;
  holoVoice?: HoloVoiceOptions;
  moderationEnabled?: boolean;
  streamResponse?: boolean;
  maxTokens?: number;
  temperature?: number;
}

// Default options
const defaultOptions: MultiModelChatOptions = {
  preferredModel: 'xai',
  moodSync: {
    enabled: true,
    adaptToSentiment: true,
    personalityType: 'supportive'
  },
  memoryEcho: {
    enabled: true,
    depth: 5,
    includeUserProfile: true
  },
  holoVoice: {
    enabled: false,
    voice: 'feminine',
    emotionIntensity: 0.7,
    speed: 1.0
  },
  moderationEnabled: true,
  streamResponse: false,
  maxTokens: 1024,
  temperature: 0.7
};

class MultiModelChat {
  private userId: string | null = null;
  private options: MultiModelChatOptions;
  private conversationHistory: ChatMessage[] = [];
  private userProfile: any = null;
  private detectedMood: 'positive' | 'negative' | 'neutral' = 'neutral';
  private communityContext: string | null = null;

  constructor(options: Partial<MultiModelChatOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Initialize the chat with user information
   */
  public async initialize(userId: string, communityId?: string): Promise<void> {
    this.userId = userId;
    
    // Fetch user profile for personalization
    if (this.options.memoryEcho?.includeUserProfile) {
      await this.fetchUserProfile();
    }
    
    // Fetch community context if provided
    if (communityId) {
      await this.fetchCommunityContext(communityId);
    }
    
    // Fetch conversation history
    if (this.options.memoryEcho?.enabled) {
      await this.fetchConversationHistory();
    }
  }

  /**
   * Send a message and get a response
   */
  public async sendMessage(message: string, options?: Partial<MultiModelChatOptions>): Promise<ChatResponse> {
    // Update options if provided
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: message });
    
    // Check content moderation if enabled and API key is available
    if (this.options.moderationEnabled && COHERE_API_KEY) {
      const moderationResult = await this.moderateContent(message);
      if (!moderationResult.isSafe) {
        return {
          message: "I'm sorry, but I can't respond to that message as it appears to contain inappropriate content. Please ensure your message follows community guidelines.",
          model: "moderation",
          confidence: 1.0,
          sentiment: 'neutral'
        };
      }
    }
    
    // Detect sentiment for MoodSync if API key is available
    if (this.options.moodSync?.enabled && COHERE_API_KEY) {
      this.detectedMood = await this.detectSentiment(message);
    }
    
    // Choose the appropriate model based on message content and preferences
    const model = this.selectModel(message);
    
    // Generate response using the selected model
    let response: ChatResponse;
    
    switch (model) {
      case 'xai':
        if (XAI_API_KEY) {
          response = await this.generateXAIResponse(message);
        } else {
          response = this.getFallbackResponse('xai', 'XAI API key not configured');
        }
        break;
      case 'gemini':
        if (GOOGLE_AI_API_KEY) {
          response = await this.generateGeminiResponse(message);
        } else {
          response = this.getFallbackResponse('gemini', 'Gemini API key not configured');
        }
        break;
      case 'groq':
        if (GROQ_API_KEY) {
          response = await this.generateGroqResponse(message);
        } else {
          response = this.getFallbackResponse('groq', 'Groq API key not configured');
        }
        break;
      default:
        response = this.getFallbackResponse('default', 'No API keys configured');
    }
    
    // Add assistant response to history
    this.conversationHistory.push({ role: 'assistant', content: response.message });
    
    // Generate voice if HoloVoice is enabled
    if (this.options.holoVoice?.enabled) {
      response.audioUrl = await this.generateVoiceResponse(response.message);
    }
    
    // Save interaction to database for future improvement
    await this.saveInteraction(message, response);
    
    return response;
  }

  /**
   * Select the most appropriate model based on message content and preferences
   */
  private selectModel(message: string): 'xai' | 'gemini' | 'groq' {
    // Check which API keys are available
    const availableModels: ('xai' | 'gemini' | 'groq')[] = [];
    if (XAI_API_KEY) availableModels.push('xai');
    if (GOOGLE_AI_API_KEY) availableModels.push('gemini');
    if (GROQ_API_KEY) availableModels.push('groq');
    
    // If no API keys are available, return preferred model (will fallback gracefully)
    if (availableModels.length === 0) {
      return this.options.preferredModel || 'xai';
    }
    
    // If user has a preferred model and it's available, use that
    if (this.options.preferredModel && availableModels.includes(this.options.preferredModel)) {
      return this.options.preferredModel;
    }
    
    // Check message length - use Gemini for longer messages if available
    if (message.length > 500 && availableModels.includes('gemini')) {
      return 'gemini';
    }
    
    // Check for image URLs - use Gemini for multimodal if available
    const hasImageUrl = /https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i.test(message);
    if (hasImageUrl && availableModels.includes('gemini')) {
      return 'gemini';
    }
    
    // Check for code - use Groq for code-related questions if available
    const codePatterns = [
      /```[\s\S]*```/,
      /<[a-z][\s\S]*>/i,
      /function\s*\(/,
      /const\s+|let\s+|var\s+/,
      /import\s+|export\s+/,
      /class\s+\w+/
    ];
    
    if (codePatterns.some(pattern => pattern.test(message)) && availableModels.includes('groq')) {
      return 'groq';
    }
    
    // Check for roleplay or creative content - use XAI if available
    const roleplayPatterns = [
      /pretend\s+/i,
      /role\s*play/i,
      /imagine\s+/i,
      /you\s+are\s+/i
    ];
    
    if (roleplayPatterns.some(pattern => pattern.test(message)) && availableModels.includes('xai')) {
      return 'xai';
    }
    
    // Return the first available model
    return availableModels[0];
  }

  /**
   * Generate a response using XAI (Grok)
   */
  private async generateXAIResponse(message: string): Promise<ChatResponse> {
    try {
      // Prepare conversation history
      const messages: ChatMessage[] = [];
      
      // Add system message with context and MoodSync personality
      messages.push({
        role: 'system',
        content: this.buildSystemPrompt()
      });
      
      // Add conversation history for context
      if (this.options.memoryEcho?.enabled) {
        // Only include the last N messages based on depth
        const depth = this.options.memoryEcho.depth || 5;
        const historyToInclude = this.conversationHistory.slice(-depth * 2);
        messages.push(...historyToInclude);
      } else {
        // Just include the current message
        messages.push({ role: 'user', content: message });
      }
      
      // Call XAI API
      const response = await fetch(XAI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-3',
          messages,
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature
        })
      });
      
      if (!response.ok) {
        throw new Error(`XAI API error: ${response.status} - ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Generate suggestions based on the response
      const suggestions = await this.generateSuggestions(data.choices[0].message.content);
      
      return {
        message: data.choices[0].message.content,
        model: 'xai-grok',
        confidence: 0.9,
        sentiment: this.detectedMood,
        suggestions
      };
    } catch (error) {
      console.error('Error generating XAI response:', error);
      return this.getFallbackResponse('xai', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate a response using Google's Gemini 1.5 Pro
   */
  private async generateGeminiResponse(message: string): Promise<ChatResponse> {
    try {
      // Extract image URLs if present
      const imageUrls = this.extractImageUrls(message);
      const textContent = this.removeImageUrls(message);
      
      // Prepare the prompt with context
      const prompt = this.buildSystemPrompt() + '\n\n' + textContent;
      
      // Prepare the request payload
      const payload: any = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      };
      
      // Add images if present
      if (imageUrls.length > 0) {
        for (const url of imageUrls) {
          payload.contents[0].parts.push({
            inline_data: {
              mime_type: this.getMimeTypeFromUrl(url),
              data: await this.fetchImageAsBase64(url)
            }
          });
        }
      }
      
      // Call Gemini API
      const response = await fetch(`${GEMINI_ENDPOINT}?key=${GOOGLE_AI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`);
      }
      
      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Generate suggestions based on the response
      const suggestions = await this.generateSuggestions(responseText);
      
      return {
        message: responseText,
        model: 'gemini-1.5-pro',
        confidence: 0.95,
        sentiment: this.detectedMood,
        suggestions
      };
    } catch (error) {
      console.error('Error generating Gemini response:', error);
      return this.getFallbackResponse('gemini', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate a response using Groq (Mistral)
   */
  private async generateGroqResponse(message: string): Promise<ChatResponse> {
    try {
      // Prepare conversation history
      const messages: ChatMessage[] = [];
      
      // Add system message with context
      messages.push({
        role: 'system',
        content: this.buildSystemPrompt()
      });
      
      // Add conversation history for context
      if (this.options.memoryEcho?.enabled) {
        // Only include the last N messages based on depth
        const depth = this.options.memoryEcho.depth || 5;
        const historyToInclude = this.conversationHistory.slice(-depth * 2);
        messages.push(...historyToInclude);
      } else {
        // Just include the current message
        messages.push({ role: 'user', content: message });
      }
      
      // Call Groq API
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages,
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature
        })
      });
      
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} - ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Generate suggestions based on the response
      const suggestions = await this.generateSuggestions(data.choices[0].message.content);
      
      return {
        message: data.choices[0].message.content,
        model: 'groq-mistral',
        confidence: 0.85,
        sentiment: this.detectedMood,
        suggestions
      };
    } catch (error) {
      console.error('Error generating Groq response:', error);
      return this.getFallbackResponse('groq', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Moderate content using Cohere's classification API
   */
 private async moderateContent(content: string): Promise<{
  isSafe: boolean;
  issues: string[];
  score: number;
}> {
  // Check if API key is available
  if (!COHERE_API_KEY) {
    console.warn('Cohere API key not configured, skipping content moderation');
    return { isSafe: true, issues: [], score: 1.0 };
  }

  try {
    const response = await fetch(COHERE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: '0701f716-3eb9-4942-89e2-01283c8ed7bc-ft', // Replace with trained model ID
        inputs: [content]
      })
    });
    if (!response.ok) {
      console.error(`Cohere API error: ${response.status} - ${await response.text()}`);
      return { isSafe: true, issues: [], score: 1.0 };
    }
    const data = await response.json();
    const isSafe = data.classifications[0].prediction === 'safe';
    return {
      isSafe,
      issues: isSafe ? [] : ['Potentially inappropriate content'],
      score: isSafe ? 1.0 : 0.0
    };
  } catch (error) {
    console.error('Error moderating content:', error);
    return { isSafe: true, issues: [], score: 1.0 };
  }
}

private async detectSentiment(content: string): Promise<'positive' | 'negative' | 'neutral'> {
  // Check if API key is available
  if (!COHERE_API_KEY) {
    console.warn('Cohere API key not configured, skipping sentiment detection');
    return 'neutral';
  }

  try {
    const response = await fetch(COHERE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COHERE_API_KEY}`
      },
      body: JSON.stringify({
        model: '0701f716-3eb9-4942-89e2-01283c8ed7bc-ft', // Replace with trained model ID
        inputs: [content]
      })
    });
    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status} - ${await response.text()}`);
    }
    const data = await response.json();
    return data.classifications[0].prediction as 'positive' | 'negative' | 'neutral';
  } catch (error) {
    console.error('Error detecting sentiment:', error);
    return 'neutral';
  }
}

  /**
   * Generate voice response using XAI's voice capabilities
   */
  private async generateVoiceResponse(text: string): Promise<string> {
    try {
      // This is a placeholder for the actual voice generation
      // In a real implementation, this would call the XAI API to generate voice
      
      // For now, return a mock audio URL
      return `https://api.x.ai/v1/audio/${Date.now()}.mp3`;
    } catch (error) {
      console.error('Error generating voice response:', error);
      return '';
    }
  }

  /**
   * Generate message suggestions based on the conversation
   */
  private async generateSuggestions(responseText: string): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In a real implementation, this would use a more sophisticated approach
      
      // Extract potential questions from the response
      const questions = responseText.match(/\?/g);
      const hasQuestions = questions && questions.length > 0;
      
      // Generate suggestions based on the response
      const suggestions: string[] = [];
      
      if (hasQuestions) {
        suggestions.push("That's a great question!");
        suggestions.push("I've been wondering about that too.");
      }
      
      // Add some generic positive responses
      suggestions.push("Thanks for sharing!");
      suggestions.push("I appreciate your perspective.");
      
      // Add some topic-specific responses
      if (responseText.toLowerCase().includes('workout')) {
        suggestions.push("What's your favorite workout?");
        suggestions.push("I've been trying to exercise more regularly too.");
      }
      
      if (responseText.toLowerCase().includes('nutrition') || responseText.toLowerCase().includes('diet')) {
        suggestions.push("Nutrition is so important for fitness!");
        suggestions.push("What's your go-to healthy meal?");
      }
      
      // Randomly select up to 4 suggestions
      return suggestions
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [
        "Thanks for sharing!",
        "That's interesting!",
        "I appreciate your perspective.",
        "Tell me more about that."
      ];
    }
  }

  /**
   * Build system prompt based on user profile, community context, and detected mood
   */
  private buildSystemPrompt(): string {
    let systemPrompt = "You are an AI assistant for a fitness community app called MomFit, designed specifically for mothers. ";
    
    // Add MoodSync personality based on detected mood
    if (this.options.moodSync?.enabled) {
      systemPrompt += this.getMoodSyncPrompt();
    }
    
    // Add user profile context
    if (this.userProfile && this.options.memoryEcho?.includeUserProfile) {
      systemPrompt += this.getUserProfilePrompt();
    }
    
    // Add community context
    if (this.communityContext) {
      systemPrompt += `\n\nCommunity Context: ${this.communityContext}`;
    }
    
    // Add general guidelines
    systemPrompt += "\n\nGuidelines:\n";
    systemPrompt += "- Provide supportive, encouraging responses\n";
    systemPrompt += "- Focus on safe, effective fitness advice for mothers\n";
    systemPrompt += "- Be conversational and friendly\n";
    systemPrompt += "- Keep responses concise and to the point\n";
    systemPrompt += "- If asked about sensitive health issues, encourage consulting with healthcare providers\n";
    
    return systemPrompt;
  }

  /**
   * Get MoodSync prompt based on detected mood
   */
  private getMoodSyncPrompt(): string {
    const personalityType = this.options.moodSync?.personalityType || 'supportive';
    
    let prompt = "\n\nPersonality: ";
    
    switch (personalityType) {
      case 'empathetic':
        prompt += "You are empathetic and understanding. ";
        break;
      case 'motivational':
        prompt += "You are motivational and energetic. ";
        break;
      case 'analytical':
        prompt += "You are analytical and informative. ";
        break;
      case 'supportive':
      default:
        prompt += "You are supportive and encouraging. ";
    }
    
    // Adapt to user's detected mood if enabled
    if (this.options.moodSync?.adaptToSentiment) {
      prompt += "\n\nUser's current mood: ";
      
      switch (this.detectedMood) {
        case 'positive':
          prompt += "The user seems to be in a positive mood. Match their energy and enthusiasm.";
          break;
        case 'negative':
          prompt += "The user seems to be in a negative mood. Be extra supportive and encouraging without being overly cheerful.";
          break;
        case 'neutral':
        default:
          prompt += "The user's mood is neutral. Maintain a balanced, supportive tone.";
      }
    }
    
    return prompt;
  }

  /**
   * Get user profile prompt
   */
  private getUserProfilePrompt(): string {
    let prompt = "\n\nUser Profile:";
    
    if (this.userProfile.fitness_goals && this.userProfile.fitness_goals.length > 0) {
      prompt += `\n- Fitness Goals: ${this.userProfile.fitness_goals.join(', ')}`;
    }
    
    if (this.userProfile.interests && this.userProfile.interests.length > 0) {
      prompt += `\n- Interests: ${this.userProfile.interests.join(', ')}`;
    }
    
    if (this.userProfile.experience_level) {
      prompt += `\n- Experience Level: ${this.userProfile.experience_level}`;
    }
    
    return prompt;
  }

  /**
   * Fetch user profile from database
   */
  private async fetchUserProfile(): Promise<void> {
    if (!this.userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('fitness_goals, interests, custom_interests, experience_level')
        .eq('id', this.userId)
        .single();
        
      if (error) throw error;
      this.userProfile = data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  /**
   * Fetch community context from database
   */
  private async fetchCommunityContext(communityId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('name, description, tags')
        .eq('id', communityId)
        .single();
        
      if (error) throw error;
      
      this.communityContext = `Community: ${data.name}. Description: ${data.description}. Tags: ${data.tags?.join(', ') || 'None'}.`;
    } catch (error) {
      console.error('Error fetching community context:', error);
    }
  }

  /**
   * Fetch conversation history from database
   */
  private async fetchConversationHistory(): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Get the user's recent messages
      const { data: userMessages, error: userError } = await supabase
        .from('community_posts')
        .select('content, created_at')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(this.options.memoryEcho?.depth || 5);
        
      if (userError) throw userError;
      
      // Convert to chat messages
      this.conversationHistory = userMessages?.map(msg => ({
        role: 'user',
        content: msg.content
      })) || [];
      
      // Add some mock assistant responses for context
      // In a real implementation, you would fetch actual assistant responses
      this.conversationHistory = this.conversationHistory.flatMap(msg => [
        msg,
        {
          role: 'assistant',
          content: `This is a mock response to: "${msg.content}"`
        }
      ]);
    } catch (error) {
      console.error('Error fetching conversation history:', error);
    }
  }

  /**
   * Save interaction to database for future improvement
   */
  private async saveInteraction(message: string, response: ChatResponse): Promise<void> {
    if (!this.userId) return;
    
    try {
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: this.userId,
          interaction_type: 'chat',
          content: message,
          result: {
            model: response.model,
            message: response.message,
            sentiment: response.sentiment
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving interaction:', error);
    }
  }

  /**
   * Get fallback response when API calls fail
   */
  private getFallbackResponse(model: string, reason?: string): ChatResponse {
    let message = "I'm sorry, but I'm having trouble connecting to my knowledge base right now. ";
    
    if (reason?.includes('API key')) {
      message = "I'm currently unable to access my AI capabilities due to configuration issues. ";
    }
    
    message += "However, I'm here to help with your fitness journey! Feel free to share your thoughts, ask questions about workouts, nutrition, or connect with other community members.";
    
    return {
      message,
      model: `${model}-fallback`,
      confidence: 0.5,
      sentiment: 'neutral',
      suggestions: [
        "Tell me about your fitness goals",
        "What's your favorite type of workout?",
        "How can I support your wellness journey?",
        "Would you like to connect with other community members?"
      ]
    };
  }

  /**
   * Extract image URLs from message
   */
  private extractImageUrls(message: string): string[] {
    const urlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/gi;
    return message.match(urlRegex) || [];
  }

  /**
   * Remove image URLs from message
   */
  private removeImageUrls(message: string): string {
    const urlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/gi;
    return message.replace(urlRegex, '[Image]');
  }

  /**
   * Get MIME type from URL
   */
  private getMimeTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      default: return 'image/jpeg';
    }
  }

  /**
   * Fetch image and convert to base64
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching image:', error);
      throw error;
    }
  }
}

export const multiModelChat = new MultiModelChat();