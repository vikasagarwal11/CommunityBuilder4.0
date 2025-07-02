import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));

serve(async (req) => {
  try {
    const { user_id, community_id, recommendation_type } = await req.json();
    const { data: profile } = await supabase
      .from('profiles')
      .select('interests, custom_interests, fitness_goals, experience_level, age_range, location')
      .eq('id', user_id)
      .single();
    const { data: rsvpTags } = await supabase
      .rpc('get_personalised_tags', { user_uuid: user_id, community_uuid: community_id });
    const { data: postTags } = await supabase
      .from('community_posts')
      .select('user_preferences')
      .eq('user_id', user_id)
      .eq('community_id', community_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const { data: messageTags } = await supabase
      .from('message_tags')
      .select('tag_type, notes')
      .eq('tagged_user_id', user_id)
      .eq('community_id', community_id);
    const { data: communityProfile } = await supabase
      .from('ai_community_profiles')
      .select('common_topics, event_types')
      .eq('community_id', community_id)
      .single();
    const input = [
      profile?.interests?.join(' '),
      profile?.custom_interests?.join(' '),
      profile?.fitness_goals?.join(' '),
      profile?.experience_level,
      profile?.age_range,
      profile?.location,
      rsvpTags?.map((r: any) => r.tag).join(' '),
      postTags?.map((p: any) => p.user_preferences?.tags?.join(' ')).join(' '),
      messageTags?.map((m: any) => `${m.tag_type} ${m.notes}`).join(' '),
      communityProfile?.common_topics?.join(' '),
      communityProfile?.event_types?.join(' '),
    ].filter(Boolean).join(' ');
    const openai = new OpenAIApi(new Configuration({ apiKey: Deno.env.get('OPENAI_API_KEY') }));
    const response = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Generate 5-10 personalized tags (each under 20 characters) for a user in a community with topics (${communityProfile?.common_topics?.join(', ')}): ${input}. Return JSON: {"suggested_tags": ["tag1", "tag2", ...]}`,
        },
      ],
    });
    const suggested_tags = JSON.parse(response.data.choices[0]?.message?.content || '{"suggested_tags": []}').suggested_tags || [];
    const recommendations = { suggested_tags, type: recommendation_type || 'all' };
    const { error } = await supabase
      .from('user_recommendations')
      .upsert({ user_id, community_id, recommendations, updated_at: new Date() });
    if (error) throw error;
    await supabase.from('ai_generation_logs').insert({
      operation_type: 'personalized_recommendations',
      status: 'success',
      community_id,
      created_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ recommendations }), { status: 200 });
  } catch (error) {
    await supabase.from('ai_generation_logs').insert({
      operation_type: 'personalized_recommendations',
      status: 'error',
      community_id: (await req.json()).community_id,
      created_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});