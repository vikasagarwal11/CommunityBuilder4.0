import { createClient } from 'npm:@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openAiKey = Deno.env.get('OPENAI_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { event_id, title, description, community_id } = await req.json();
    
    if (!event_id || !title || !community_id) {
      throw new Error('Missing required fields: event_id, title, or community_id');
    }

    // Get community profile for context
    const { data: communityProfile } = await supabase
      .from('ai_community_profiles')
      .select('event_types, common_topics')
      .eq('community_id', community_id)
      .single();

    // Generate embedding using OpenAI API
    const embedding = await generateEmbedding(
      title, 
      description || '', 
      communityProfile?.event_types || [],
      communityProfile?.common_topics || []
    );

    // Store the embedding
    const { error } = await supabase
      .from('event_embeddings')
      .insert({ 
        event_id, 
        embedding 
      });

    if (error) throw error;

    // Log successful operation
    await supabase.from('ai_generation_logs').insert({
      operation_type: 'event_embedding_generation',
      status: 'success',
      community_id,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ event_id, success: true }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Error in generate-event-embedding function:', error);
    
    // Log error
    try {
      const data = await req.json();
      await supabase.from('ai_generation_logs').insert({
        operation_type: 'event_embedding_generation',
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

// Function to generate embeddings using OpenAI API
async function generateEmbedding(
  title: string, 
  description: string, 
  eventTypes: string[],
  commonTopics: string[]
): Promise<number[]> {
  try {
    // Combine text for embedding
    const text = `${title} ${description} ${eventTypes.join(' ')} ${commonTopics.join(' ')}`;
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}