// Supabase Edge Function for processing user interactions and learning from them
// This builds individual user models to improve personalization

import { createClient } from 'npm:@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const googleAiKey = Deno.env.get('GOOGLE_AI_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google AI API endpoint
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  userId: string;
  communityId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get request payload
    const payload: RequestPayload = await req.json();
    const { userId, communityId } = payload;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Log the processing attempt
    await logProcessing(userId, 'user_learning', 'started', { userId, communityId });

    // Process user data
    const userInsights = await processUserData(userId, communityId);
    
    // Store the insights
    await storeUserInsights(userId, userInsights);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User learning processed successfully',
        insights: userInsights
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    console.error('Error in user-learning-processor function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process user learning',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});

// Process user data to extract insights
async function processUserData(userId: string, communityId?: string) {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  // Get user's messages
  const messagesQuery = supabase
    .from('community_posts')
    .select('content, created_at, community_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
    
  // Filter by community if provided
  if (communityId) {
    messagesQuery.eq('community_id', communityId);
  }
  
  const { data: messages } = await messagesQuery;
  
  // Get user's reactions
  const { data: reactions } = await supabase
    .from('message_reactions')
    .select('emoji, message_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
    
  // Get messages the user reacted to
  const messageIds = reactions?.map(r => r.message_id) || [];
  const { data: reactedMessages } = await supabase
    .from('community_posts')
    .select('id, content, user_id')
    .in('id', messageIds);
    
  // Get user's RSVPs
  const { data: rsvps } = await supabase
    .from('event_rsvps')
    .select(`
      status, 
      created_at,
      community_events(
        title,
        description,
        tags
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
    
  // Get user's AI interactions
  const { data: aiInteractions } = await supabase
    .from('ai_interactions')
    .select('interaction_type, content, feedback, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
    
  // Analyze the data using AI
  return await analyzeUserData({
    profile,
    messages: messages || [],
    reactions: reactions || [],
    reactedMessages: reactedMessages || [],
    rsvps: rsvps || [],
    aiInteractions: aiInteractions || []
  });
}

// Analyze user data with AI
async function analyzeUserData(userData: any) {
  try {
    // Prepare the data for analysis
    const userProfile = userData.profile;
    const messages = userData.messages;
    const reactions = userData.reactions;
    const rsvps = userData.rsvps;
    const aiInteractions = userData.aiInteractions;
    
    // Create a summary of the user's activity
    const messageSummary = messages.length > 0 
      ? `${messages.length} messages, most recent: "${messages[0].content.substring(0, 100)}..."`
      : "No messages";
      
    const reactionSummary = reactions.length > 0
      ? `${reactions.length} reactions, most common emoji: ${getMostCommonEmoji(reactions)}`
      : "No reactions";
      
    const rsvpSummary = rsvps.length > 0
      ? `${rsvps.length} event RSVPs, ${rsvps.filter(r => r.status === 'going').length} attending`
      : "No event RSVPs";
      
    const aiInteractionSummary = aiInteractions.length > 0
      ? `${aiInteractions.length} AI interactions, ${aiInteractions.filter(i => i.feedback === 'positive').length} positive feedback`
      : "No AI interactions";
    
    // Use AI to analyze the data
    const prompt = `
      Analyze this user's data and provide insights about their preferences, behavior, and communication style.
      
      User Profile:
      ${JSON.stringify(userProfile, null, 2)}
      
      Activity Summary:
      - ${messageSummary}
      - ${reactionSummary}
      - ${rsvpSummary}
      - ${aiInteractionSummary}
      
      Message Sample:
      ${messages.slice(0, 5).map(m => `- "${m.content.substring(0, 100)}..."`).join('\n')}
      
      RSVP Sample:
      ${rsvps.slice(0, 5).map(r => `- ${r.status} to "${r.community_events?.title || 'Unknown event'}"`).join('\n')}
      
      Based on this data, provide insights about:
      1. Communication style and tone
      2. Interests and preferences
      3. Engagement patterns
      4. Content they respond well to
      5. Personalization recommendations
      
      IMPORTANT: Return ONLY a valid JSON object with no additional text or formatting.
      
      Required JSON structure:
      {
        "communicationStyle": {
          "tone": "string",
          "formality": "casual|formal",
          "verbosity": "concise|moderate|verbose"
        },
        "interests": ["string"],
        "engagementPatterns": {
          "activeTimeOfDay": "morning|afternoon|evening",
          "responseRate": "low|medium|high",
          "preferredContentTypes": ["string"]
        },
        "contentPreferences": {
          "topics": ["string"],
          "formats": ["string"]
        },
        "personalizationRecommendations": ["string"]
      }
    `;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    const response = await fetch(`${API_BASE_URL}/models/gemini-2.0-flash:generateContent?key=${googleAiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Clean the response text and extract JSON
    let responseText = data.candidates[0].content.parts[0].text.trim();
    responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error analyzing user data:', error);
    
    // Return default insights if analysis fails
    return {
      communicationStyle: {
        tone: "neutral",
        formality: "casual",
        verbosity: "moderate"
      },
      interests: userProfile?.interests || ["general"],
      engagementPatterns: {
        activeTimeOfDay: "varies",
        responseRate: "medium",
        preferredContentTypes: ["text"]
      },
      contentPreferences: {
        topics: userProfile?.interests || ["general"],
        formats: ["posts", "events"]
      },
      personalizationRecommendations: [
        "Provide general content based on profile interests",
        "Monitor engagement to refine recommendations"
      ]
    };
  }
}

// Get the most common emoji from reactions
function getMostCommonEmoji(reactions: any[]) {
  const emojiCounts: Record<string, number> = {};
  
  reactions.forEach(reaction => {
    emojiCounts[reaction.emoji] = (emojiCounts[reaction.emoji] || 0) + 1;
  });
  
  let mostCommonEmoji = '';
  let highestCount = 0;
  
  Object.entries(emojiCounts).forEach(([emoji, count]) => {
    if (count > highestCount) {
      mostCommonEmoji = emoji;
      highestCount = count;
    }
  });
  
  return mostCommonEmoji;
}

// Store user insights in the database
async function storeUserInsights(userId: string, insights: any) {
  try {
    // Check if user already has insights
    const { data: existingInsights } = await supabase
      .from('user_ai_insights')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (existingInsights) {
      // Update existing insights
      await supabase
        .from('user_ai_insights')
        .update({
          insights,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInsights.id);
    } else {
      // Create new insights
      await supabase
        .from('user_ai_insights')
        .insert({
          user_id: userId,
          insights,
          created_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error storing user insights:', error);
    throw error;
  }
}

// Log processing attempts
async function logProcessing(
  userId: string,
  operationType: string,
  status: 'started' | 'success' | 'error',
  inputData: any,
  outputData?: any,
  errorMessage?: string
) {
  try {
    await supabase
      .from('ai_generation_logs')
      .insert({
        created_by: userId,
        operation_type: operationType,
        status,
        error_message: errorMessage,
        input_data: inputData,
        output_data: outputData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging processing:', error);
  }
}