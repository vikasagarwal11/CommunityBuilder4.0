// Supabase Edge Function for scheduled community profile updates
// This runs on a schedule to keep AI profiles fresh and improve learning

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

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get communities that need profile updates
    // Prioritize:
    // 1. Communities with no profile
    // 2. Communities with profiles older than 7 days
    // 3. Communities with high activity since last update
    const communitiesToUpdate = await getCommunitiesForUpdate();
    
    console.log(`Found ${communitiesToUpdate.length} communities to update`);
    
    // Process each community (limit to 10 per run to avoid timeouts)
    const results = [];
    for (const community of communitiesToUpdate.slice(0, 10)) {
      try {
        const result = await processCommunitySafely(community);
        results.push(result);
      } catch (error) {
        console.error(`Error processing community ${community.id}:`, error);
        results.push({
          communityId: community.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
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
    console.error('Error in scheduled-profile-updates function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process scheduled updates',
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

// Get communities that need profile updates
async function getCommunitiesForUpdate() {
  // First, get communities with no AI profile
  const { data: communitiesWithoutProfile } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      description,
      tags,
      created_at
    `)
    .eq('is_active', true)
    .is('deleted_at', null)
    .not('id', 'in', (
      supabase
        .from('ai_community_profiles')
        .select('community_id')
    ))
    .limit(5);

  // Next, get communities with outdated profiles (older than 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: communitiesWithOldProfiles } = await supabase
    .from('ai_community_profiles')
    .select(`
      community_id,
      updated_at,
      communities!inner(
        id,
        name,
        description,
        tags,
        created_at
      )
    `)
    .lt('updated_at', sevenDaysAgo.toISOString())
    .limit(5);

  // Finally, get communities with high activity since last profile update
  const { data: highActivityCommunities } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      description,
      tags,
      created_at,
      ai_community_profiles!inner(updated_at)
    `)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);
    
  // Combine and deduplicate
  const allCommunities = [
    ...(communitiesWithoutProfile || []),
    ...(communitiesWithOldProfiles?.map(item => item.communities) || []),
    ...(highActivityCommunities || [])
  ];
  
  // Deduplicate by ID
  const uniqueCommunities = Array.from(
    new Map(allCommunities.map(item => [item.id, item])).values()
  );
  
  return uniqueCommunities;
}

// Process a single community with error handling
async function processCommunitySafely(community: any) {
  try {
    // Log the update attempt
    await logAIGeneration(community.id, 'scheduled_profile_update', 'started', {
      communityId: community.id,
      name: community.name
    });
    
    // Get recent activity data for better context
    const activityData = await getCommunityActivity(community.id);
    
    // Generate updated profile
    const profile = await generateEnhancedCommunityProfile(
      community.id,
      community.name,
      community.description,
      community.tags || [],
      activityData
    );
    
    // Save the profile
    await saveCommunityProfile(community.id, profile);
    
    // Log successful update
    await logAIGeneration(community.id, 'scheduled_profile_update', 'success', 
      { communityId: community.id, name: community.name }, 
      profile
    );
    
    return {
      communityId: community.id,
      status: 'success',
      profile
    };
  } catch (error) {
    // Log the error
    await logAIGeneration(community.id, 'scheduled_profile_update', 'error', 
      { communityId: community.id, name: community.name },
      null,
      error.message
    );
    
    // Try to create/update with default profile
    try {
      const defaultProfile = createDefaultProfile(
        community.id,
        community.name,
        community.description,
        community.tags || []
      );
      
      await saveCommunityProfile(community.id, defaultProfile);
      
      return {
        communityId: community.id,
        status: 'fallback',
        profile: defaultProfile
      };
    } catch (fallbackError) {
      throw new Error(`Failed to update profile and fallback failed: ${fallbackError.message}`);
    }
  }
}

// Get community activity data for better context
async function getCommunityActivity(communityId: string) {
  // Get recent messages
  const { data: recentMessages } = await supabase
    .from('community_posts')
    .select('content, created_at, user_id')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(50);
    
  // Get recent events
  const { data: recentEvents } = await supabase
    .from('community_events')
    .select('title, description, tags')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  // Get member count
  const { count: memberCount } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId);
    
  // Get active members (posted in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: activeMembers } = await supabase
    .from('community_posts')
    .select('user_id')
    .eq('community_id', communityId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .limit(1000);
    
  const uniqueActiveMembers = new Set(activeMembers?.map(m => m.user_id) || []);
  
  return {
    messageCount: recentMessages?.length || 0,
    messages: recentMessages || [],
    events: recentEvents || [],
    memberCount: memberCount || 0,
    activeMembers: uniqueActiveMembers.size,
    activityRatio: memberCount ? uniqueActiveMembers.size / memberCount : 0
  };
}

// Generate enhanced community profile with activity data
async function generateEnhancedCommunityProfile(
  communityId: string,
  name: string,
  description: string,
  tags: string[],
  activityData: any
): Promise<any> {
  const prompt = `
    Generate an AI-powered community profile for a community with the following information:
    
    Name: ${name}
    Description: ${description}
    Tags: ${tags.join(', ')}
    
    Community Activity Data:
    - Total Members: ${activityData.memberCount}
    - Active Members: ${activityData.activeMembers}
    - Activity Ratio: ${(activityData.activityRatio * 100).toFixed(1)}%
    - Recent Messages: ${activityData.messageCount}
    - Recent Events: ${activityData.events.length}
    
    Recent Message Topics:
    ${activityData.messages.slice(0, 10).map(m => `- ${m.content.substring(0, 100)}...`).join('\n')}
    
    Recent Event Topics:
    ${activityData.events.map(e => `- ${e.title}: ${e.description?.substring(0, 100) || 'No description'}`).join('\n')}
    
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