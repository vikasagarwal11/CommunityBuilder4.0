// Supabase Edge Function to generate AI profiles for communities
// This runs as a background job to avoid blocking the UI

import { createClient } from 'npm:@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const googleAiKey = Deno.env.get('GOOGLE_AI_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google AI API endpoint
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface RequestPayload {
  communityId: string;
}

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

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
    const { communityId } = payload;

    if (!communityId) {
      return new Response(
        JSON.stringify({ error: 'Community ID is required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Log the generation attempt
    await logAIGeneration(communityId, 'generate_profile', 'started', { communityId });

    // Get community data
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('name, description, tags')
      .eq('id', communityId)
      .single();

    if (communityError) {
      throw new Error(`Error fetching community: ${communityError.message}`);
    }

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('community_posts')
      .select('content')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const messageContent = recentMessages?.map(m => m.content).join('\n') || '';
    
    // Generate AI profile
    const profile = await generateCommunityProfile(
      communityId,
      community.name,
      community.description,
      community.tags || [],
      messageContent
    );

    // Save the profile to the database
    await saveCommunityProfile(communityId, profile);

    // Log successful generation
    await logAIGeneration(communityId, 'generate_profile', 'success', 
      { communityId, name: community.name }, 
      profile
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'AI profile generated successfully',
        profile 
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
    console.error('Error in generate-ai-profile function:', error);
    
    // Try to create a default profile on error
    try {
      const { communityId } = await req.json();
      if (communityId) {
        const { data: community } = await supabase
          .from('communities')
          .select('name, description, tags')
          .eq('id', communityId)
          .single();
          
        if (community) {
          const defaultProfile = createDefaultProfile(
            communityId,
            community.name,
            community.description,
            community.tags || []
          );
          
          await saveCommunityProfile(communityId, defaultProfile);
          
          await logAIGeneration(communityId, 'create_default_profile', 'success', 
            { communityId, name: community.name }, 
            defaultProfile
          );
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Default AI profile created due to error',
              profile: defaultProfile,
              wasDefault: true
            }),
            { 
              status: 200, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            }
          );
        }
      }
    } catch (fallbackError) {
      console.error('Error creating default profile:', fallbackError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate AI profile',
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

// Generate AI profile using Google AI API
async function generateCommunityProfile(
  communityId: string,
  name: string,
  description: string,
  tags: string[],
  messageContent: string
): Promise<any> {
  const prompt = `
    Generate an AI-powered community profile for a community with the following information:
    
    Name: ${name}
    Description: ${description}
    Tags: ${tags.join(', ')}
    
    Recent community messages:
    ${messageContent}
    
    Based on this information, create a comprehensive community profile that includes:
    1. The community's purpose
    2. The tone of the community (casual, supportive, professional, motivational)
    3. Target audience
    4. Common topics of discussion
    5. Types of events that would be appropriate
    
    IMPORTANT: Return ONLY a valid JSON object with no additional text or formatting.
    
    Required JSON structure:
    {
      "purpose": "string",
      "tone": "casual",
      "targetAudience": ["string"],
      "commonTopics": ["string"],
      "eventTypes": ["string"]
    }
    
    For tone, only use one of these values: casual, supportive, professional, motivational
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
    const errorText = await response.text();
    throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Clean the response text and extract JSON
  let responseText = data.candidates[0].content.parts[0].text.trim();
  responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }

  const profileData = JSON.parse(jsonMatch[0]);
  
  // Validate the tone value
  const validTones = ['casual', 'supportive', 'professional', 'motivational'];
  if (!validTones.includes(profileData.tone)) {
    profileData.tone = 'supportive'; // Default to supportive if invalid
  }
  
  return {
    purpose: profileData.purpose,
    tone: profileData.tone,
    targetAudience: profileData.targetAudience,
    commonTopics: profileData.commonTopics,
    eventTypes: profileData.eventTypes,
    createdAt: new Date().toISOString()
  };
}

// Create a default profile when AI generation fails
function createDefaultProfile(
  communityId: string,
  name: string,
  description: string,
  tags: string[]
): any {
  return {
    purpose: `A community for people interested in ${name.toLowerCase()}`,
    tone: 'supportive',
    targetAudience: ['Community members', 'Enthusiasts'],
    commonTopics: tags.length > 0 ? tags : ['General discussion'],
    eventTypes: ['Meetups', 'Discussions', 'Workshops'],
    createdAt: new Date().toISOString()
  };
}

// Save community profile to the database
async function saveCommunityProfile(communityId: string, profile: any): Promise<void> {
  // Check if a profile already exists
  const { data: existingProfile } = await supabase
    .from('ai_community_profiles')
    .select('id')
    .eq('community_id', communityId)
    .maybeSingle();
  
  if (existingProfile) {
    // Update existing profile
    await supabase
      .from('ai_community_profiles')
      .update({
        purpose: profile.purpose,
        tone: profile.tone,
        target_audience: profile.targetAudience,
        common_topics: profile.commonTopics,
        event_types: profile.eventTypes,
        updated_at: new Date().toISOString()
      })
      .eq('community_id', communityId);
  } else {
    // Create new profile
    await supabase
      .from('ai_community_profiles')
      .insert({
        community_id: communityId,
        purpose: profile.purpose,
        tone: profile.tone,
        target_audience: profile.targetAudience,
        common_topics: profile.commonTopics,
        event_types: profile.eventTypes,
        created_at: profile.createdAt
      });
  }
}

// Log AI generation attempts for auditing and debugging
async function logAIGeneration(
  communityId: string,
  operationType: string,
  status: 'started' | 'success' | 'error',
  inputData: any,
  outputData?: any,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase
      .from('ai_generation_logs')
      .insert({
        community_id: communityId,
        operation_type: operationType,
        status,
        error_message: errorMessage,
        input_data: inputData,
        output_data: outputData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging AI generation:', error);
  }
}