import { createClient } from 'npm:@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { title, description, community_id } = await req.json();
    
    if (!title || !description || !community_id) {
      throw new Error('Missing required fields: title, description, or community_id');
    }

    // Get community profile for context
    const { data: communityProfile } = await supabase
      .from('ai_community_profiles')
      .select('event_types')
      .eq('community_id', community_id)
      .single();

    // Generate tags based on title and description
    const tags = await generateTags(title, description, communityProfile?.event_types || []);

    // Log successful operation
    await supabase.from('ai_generation_logs').insert({
      operation_type: 'event_tag_generation',
      status: 'success',
      community_id,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ tags }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Error in auto-tag-events function:', error);
    
    // Log error
    try {
      const data = await req.json();
      await supabase.from('ai_generation_logs').insert({
        operation_type: 'event_tag_generation',
        status: 'error',
        community_id: data.community_id,
        error_message: error.message,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Error logging failure:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
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

// Function to generate tags based on title and description
async function generateTags(title: string, description: string, communityEventTypes: string[]): Promise<string[]> {
  try {
    // Simple keyword extraction for common event types
    const keywords = [
      ...extractKeywords(title),
      ...extractKeywords(description)
    ];
    
    // Add community-specific event types if they match
    const matchingEventTypes = communityEventTypes.filter(type => 
      title.toLowerCase().includes(type.toLowerCase()) || 
      description.toLowerCase().includes(type.toLowerCase())
    );
    
    // Combine and deduplicate
    const allTags = [...new Set([...keywords, ...matchingEventTypes])];
    
    // Limit to 5 tags
    return allTags.slice(0, 5);
  } catch (error) {
    console.error('Error generating tags:', error);
    return [];
  }
}

// Simple keyword extraction function
function extractKeywords(text: string): string[] {
  const commonEventTypes = [
    'workshop', 'meetup', 'webinar', 'conference', 'training',
    'yoga', 'fitness', 'workout', 'exercise', 'running',
    'nutrition', 'diet', 'cooking', 'recipe', 'food',
    'meditation', 'mindfulness', 'wellness', 'health', 'self-care',
    'parenting', 'children', 'family', 'kids', 'baby',
    'postpartum', 'pregnancy', 'prenatal', 'birth', 'breastfeeding'
  ];
  
  const lowerText = text.toLowerCase();
  return commonEventTypes.filter(keyword => lowerText.includes(keyword));
}