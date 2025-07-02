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

function generateSimpleRecommendations() {
  return {
    eventRecommendations: [
      {
        type: "meetup",
        title: "Community meetup",
        confidence: 0.7,
        description: "Join the next community gathering to meet other members"
      }
    ],
    contentRecommendations: [
      {
        type: "discussion",
        title: "Share your experience",
        confidence: 0.7,
        description: "Share your thoughts or experiences related to the community's main topics"
      }
    ],
    connectionRecommendations: [
      {
        type: "active members",
        confidence: 0.7,
        description: "Connect with active members who share your interests"
      }
    ],
    engagementRecommendations: [
      {
        type: "regular participation",
        confidence: 0.7,
        description: "Try to participate in discussions at least once a week"
      }
    ]
  };
}

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
    const { userId, communityId, recommendationType } = body;

    if (!userId || !communityId) {
      return new Response(
        JSON.stringify({ error: "Missing userId or communityId" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );
    }

    let recommendations;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (openaiApiKey) {
      try {
        const openai = new OpenAI({
          apiKey: openaiApiKey
        });
        
        const { data: userVector } = await supabase
          .from("user_interest_vectors")
          .select("embedding")
          .eq("user_id", userId)
          .eq("community_id", communityId)
          .single();

        if (!userVector) {
          recommendations = generateSimpleRecommendations();
        } else {
          const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "Generate personalized community recommendations based on user interests."
              },
              {
                role: "user",
                content: `User embedding: ${JSON.stringify(userVector.embedding.slice(0, 10))}`
              }
            ]
          });
          
          recommendations = JSON.parse(response.choices[0].message.content);
        }
      } catch (openaiError) {
        recommendations = generateSimpleRecommendations();
        
        await supabase.from("ai_generation_logs").insert({
          operation_type: "personalized_recommendations",
          status: "error",
          error_message: openaiError.message,
          input_data: {
            userId,
            communityId,
            recommendationType
          },
          created_by: userId
        });
      }
    } else {
      recommendations = generateSimpleRecommendations();
      
      await supabase.from("ai_generation_logs").insert({
        operation_type: "personalized_recommendations",
        status: "error",
        error_message: "No OpenAI API key",
        input_data: {
          userId,
          communityId,
          recommendationType
        },
        created_by: userId
      });
    }

    const { error: upsertError } = await supabase
      .from("user_recommendations")
      .upsert(
        {
          user_id: userId,
          community_id: communityId,
          recommendations,
          updated_at: new Date().toISOString()
        },
        { onConflict: ["user_id", "community_id"] }
      );

    if (upsertError) {
      await supabase.from("ai_generation_logs").insert({
        operation_type: "personalized_recommendations",
        status: "error",
        error_message: upsertError.message,
        input_data: {
          userId,
          communityId,
          recommendationType
        },
        created_by: userId
      });
      
      return new Response(
        JSON.stringify({ error: "Failed to save recommendations" }),
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
      operation_type: "personalized_recommendations",
      status: "success",
      input_data: {
        userId,
        communityId,
        recommendationType
      },
      output_data: recommendations,
      created_by: userId
    });

    return new Response(
      JSON.stringify({ success: true, recommendations }),
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
      operation_type: "personalized_recommendations",
      status: "error",
      error_message: error.message,
      input_data: {
        userId: "unknown",
        communityId: "unknown",
        recommendationType: "unknown"
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