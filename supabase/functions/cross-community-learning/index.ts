// Supabase Edge Function for cross-community learning
// This analyzes patterns across communities to improve recommendations

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
    // Get all active communities with AI profiles
    const { data: communities } = await supabase
      .from('communities')
      .select(`
        id,
        name,
        description,
        tags,
        ai_community_profiles(*)
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('ai_community_profiles', 'is', null);
      
    if (!communities || communities.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No communities with AI profiles found' }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    // Find similar communities based on profiles
    const similarityClusters = await findSimilarCommunities(communities);
    
    // Generate cross-community insights
    const insights = await generateCrossCommunityInsights(communities, similarityClusters);
    
    // Store the insights
    await storeCrossCommunityInsights(insights);

    return new Response(
      JSON.stringify({ 
        success: true, 
        communitiesAnalyzed: communities.length,
        clusters: similarityClusters.length,
        insights
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
    console.error('Error in cross-community-learning function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process cross-community learning',
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

// Find similar communities based on profiles
async function findSimilarCommunities(communities: any[]) {
  // Group communities by common topics
  const topicClusters: Record<string, any[]> = {};
  
  communities.forEach(community => {
    const profile = community.ai_community_profiles[0];
    if (!profile || !profile.common_topics) return;
    
    profile.common_topics.forEach((topic: string) => {
      if (!topicClusters[topic]) {
        topicClusters[topic] = [];
      }
      topicClusters[topic].push(community);
    });
  });
  
  // Group communities by tone
  const toneClusters: Record<string, any[]> = {};
  
  communities.forEach(community => {
    const profile = community.ai_community_profiles[0];
    if (!profile || !profile.tone) return;
    
    const tone = profile.tone;
    if (!toneClusters[tone]) {
      toneClusters[tone] = [];
    }
    toneClusters[tone].push(community);
  });
  
  // Group communities by target audience
  const audienceClusters: Record<string, any[]> = {};
  
  communities.forEach(community => {
    const profile = community.ai_community_profiles[0];
    if (!profile || !profile.target_audience) return;
    
    profile.target_audience.forEach((audience: string) => {
      if (!audienceClusters[audience]) {
        audienceClusters[audience] = [];
      }
      audienceClusters[audience].push(community);
    });
  });
  
  // Combine clusters
  const clusters = [
    ...Object.entries(topicClusters).map(([topic, communities]) => ({
      type: 'topic',
      name: topic,
      communities: communities.map(c => c.id),
      size: communities.length
    })),
    ...Object.entries(toneClusters).map(([tone, communities]) => ({
      type: 'tone',
      name: tone,
      communities: communities.map(c => c.id),
      size: communities.length
    })),
    ...Object.entries(audienceClusters).map(([audience, communities]) => ({
      type: 'audience',
      name: audience,
      communities: communities.map(c => c.id),
      size: communities.length
    }))
  ];
  
  // Sort by size (largest first)
  return clusters.sort((a, b) => b.size - a.size);
}

// Generate cross-community insights
async function generateCrossCommunityInsights(communities: any[], clusters: any[]) {
  try {
    // Prepare data for analysis
    const communityProfiles = communities.map(community => {
      const profile = community.ai_community_profiles[0];
      return {
        id: community.id,
        name: community.name,
        purpose: profile?.purpose,
        tone: profile?.tone,
        targetAudience: profile?.target_audience,
        commonTopics: profile?.common_topics,
        eventTypes: profile?.event_types
      };
    });
    
    // Get top clusters
    const topClusters = clusters.slice(0, 10);
    
    // Use AI to generate insights
    const prompt = `
      Analyze these community profiles and clusters to identify patterns and insights:
      
      Community Profiles:
      ${JSON.stringify(communityProfiles.slice(0, 20), null, 2)}
      
      Community Clusters:
      ${JSON.stringify(topClusters, null, 2)}
      
      Based on this data, provide insights about:
      1. Common patterns across communities
      2. Successful community characteristics
      3. Content types that work well across similar communities
      4. Recommendations for cross-community events or initiatives
      5. Opportunities for knowledge sharing between communities
      
      IMPORTANT: Return ONLY a valid JSON object with no additional text or formatting.
      
      Required JSON structure:
      {
        "patterns": [
          {
            "name": "string",
            "description": "string",
            "prevalence": "high|medium|low"
          }
        ],
        "successFactors": [
          {
            "factor": "string",
            "description": "string",
            "communities": ["string"]
          }
        ],
        "contentRecommendations": [
          {
            "type": "string",
            "description": "string",
            "targetClusters": ["string"]
          }
        ],
        "crossCommunityOpportunities": [
          {
            "name": "string",
            "description": "string",
            "participatingClusters": ["string"]
          }
        ],
        "knowledgeSharingRecommendations": [
          {
            "source": "string",
            "target": "string",
            "topic": "string",
            "approach": "string"
          }
        ]
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
    console.error('Error generating cross-community insights:', error);
    
    // Return default insights if analysis fails
    return {
      patterns: [
        {
          name: "Topic-based communities",
          description: "Communities organized around specific topics tend to have higher engagement",
          prevalence: "high"
        }
      ],
      successFactors: [
        {
          factor: "Clear purpose",
          description: "Communities with clearly defined purposes show higher member retention",
          communities: []
        }
      ],
      contentRecommendations: [
        {
          type: "Discussion prompts",
          description: "Regular discussion prompts increase member participation",
          targetClusters: []
        }
      ],
      crossCommunityOpportunities: [
        {
          name: "Joint events",
          description: "Communities with overlapping interests could benefit from joint events",
          participatingClusters: []
        }
      ],
      knowledgeSharingRecommendations: [
        {
          source: "Established communities",
          target: "Newer communities",
          topic: "Engagement strategies",
          approach: "Mentorship program"
        }
      ]
    };
  }
}

// Store cross-community insights
async function storeCrossCommunityInsights(insights: any) {
  try {
    await supabase
      .from('ai_cross_community_insights')
      .insert({
        insights,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error storing cross-community insights:', error);
    throw error;
  }
}

// Analyze user data with AI
async function analyzeUserData(userData: any) {
  try {
    // Check if knowledge transfer is enabled
    const { data: enabledProfiles } = await supabase
      .from('ai_community_profiles')
      .select('community_id')
      .eq('knowledge_transfer_enabled', true)
      .eq('is_active', true);
      
    if (!enabledProfiles || enabledProfiles.length === 0) {
      console.log('No communities with knowledge transfer enabled');
      return null;
    }
    
    // Prepare the data for analysis
    const userProfile = userData.profile;
    const messages = userData.messages;
    
    // Save the community profile to the database
    await saveCommunityProfile(communityProfile);
    
    // If knowledge transfer is enabled, anonymize and store insights
    if (communityProfile.knowledge_transfer_enabled) {
      const anonymizedInsights = await anonymizeInsights(communityProfile, similarityClusters);
      
      // Update the profile with anonymized insights
      await supabase
        .from('ai_community_profiles')
        .update({
          anonymized_insights: anonymizedInsights
        })
        .eq('community_id', communityProfile.id);
    }
    
    // Log successful generation
    await logAIGeneration(communityId, 'generate_profile', 'success', {
      name,
    });
  }
}

// Anonymize insights for knowledge transfer
async function anonymizeInsights(communityProfile: any, similarityClusters: any[]) {
  try {
    // Create anonymized insights that can be shared with other communities
    return {
      popularTopics: communityProfile.common_topics || [],
      successfulEvents: communityProfile.event_types || [],
      engagementTips: [
        "Regular discussion prompts increase member participation",
        "Welcoming new members personally improves retention",
        "Sharing relevant resources keeps the community engaged"
      ],
      // Add cluster information without identifying details
      relatedClusters: similarityClusters.map(cluster => ({
        type: cluster.type,
        name: cluster.name,
        size: cluster.size
      }))
    };
  } catch (error) {
    console.error('Error anonymizing insights:', error);
    return null;
  }
}