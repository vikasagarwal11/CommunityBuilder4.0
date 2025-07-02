import { createClient } from 'npm:@supabase/supabase-js';
import { OpenAI } from 'npm:openai@4.57.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    const { user_id, community_id } = body;

    if (!user_id || !community_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or community_id" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("interests, custom_interests, fitness_goals, experience_level, age_range, location")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      await supabase.from("ai_generation_logs").insert({
        operation_type: "user_vector_generation",
        status: "error",
        error_message: profileError?.message || "Profile not found",
        input_data: {
          user_id,
          community_id
        },
        created_by: user_id
      });
      
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("tags")
      .eq("id", community_id)
      .single();

    if (communityError || !community) {
      await supabase.from("ai_generation_logs").insert({
        operation_type: "user_vector_generation",
        status: "error",
        error_message: communityError?.message || "Community not found",
        input_data: {
          user_id,
          community_id
        },
        created_by: user_id
      });
      
      return new Response(
        JSON.stringify({ error: "Community not found" }),
        { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    let embedding = new Array(1536).fill(0);
    
    if (openaiApiKey) {
      try {
        const openai = new OpenAI({
          apiKey: openaiApiKey
        });
        
        const inputText = [
          ...(profile.interests || []),
          ...(profile.custom_interests || []),
          ...(profile.fitness_goals || []),
          profile.experience_level || "",
          profile.age_range || "",
          profile.location || "",
          ...(community.tags || [])
        ].join(" ");
        
        const response = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: inputText
        });
        
        embedding = response.data[0].embedding;
      } catch (openaiError) {
        await supabase.from("ai_generation_logs").insert({
          operation_type: "user_vector_generation",
          status: "error",
          error_message: openaiError.message,
          input_data: {
            user_id,
            community_id
          },
          created_by: user_id
        });
      }
    } else {
      await supabase.from("ai_generation_logs").insert({
        operation_type: "user_vector_generation",
        status: "error",
        error_message: "No OpenAI API key",
        input_data: {
          user_id,
          community_id
        },
        created_by: user_id
      });
    }

    const { error: upsertError } = await supabase
      .from("user_interest_vectors")
      .upsert(
        {
          user_id,
          community_id,
          embedding,
          updated_at: new Date().toISOString()
        },
        { onConflict: ["user_id", "community_id"] }
      );

    if (upsertError) {
      await supabase.from("ai_generation_logs").insert({
        operation_type: "user_vector_generation",
        status: "error",
        error_message: upsertError.message,
        input_data: {
          user_id,
          community_id
        },
        created_by: user_id
      });
      
      return new Response(
        JSON.stringify({ error: "Failed to save embedding" }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    await supabase.from("ai_generation_logs").insert({
      operation_type: "user_vector_generation",
      status: "success",
      input_data: {
        user_id,
        community_id
      },
      output_data: {
        embedding: embedding.slice(0, 10)
      },
      created_by: user_id
    });

    return new Response(
      JSON.stringify({ success: true, embedding: embedding.slice(0, 10) }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    await supabase.from("ai_generation_logs").insert({
      operation_type: "user_vector_generation",
      status: "error",
      error_message: error.message,
      input_data: {
        user_id: "unknown",
        community_id: "unknown"
      },
      created_by: "system"
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  }
});