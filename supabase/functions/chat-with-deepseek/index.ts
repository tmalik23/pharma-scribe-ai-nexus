import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenAI } from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { messages } = await req.json();
        const userMessage = messages[messages.length - 1].content;

        // 1. Rate Limiting (Simple IP-based for now)
        // In a real app, use the authenticated user ID from auth.users
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        // TODO: Implement proper rate limiting using a counter in DB or Redis
        // For now, we'll skip the actual blocking to get the feature working first.

        // 2. Initialize Clients
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) throw new Error('OPENAI_API_KEY is not set');
        const openai = new OpenAI({ apiKey: openaiApiKey });

        const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
        if (!deepseekApiKey) throw new Error('DEEPSEEK_API_KEY is not set');

        // 3. Generate Embedding for User Query
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: userMessage,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 4. Search Relevant Papers
        const { data: documents, error: searchError } = await supabase.rpc('match_papers', {
            query_embedding: embedding,
            match_threshold: 0.5, // Adjust based on needs
            match_count: 5,
        });

        if (searchError) throw searchError;

        // 5. Construct Context
        let context = "You are an AI research assistant for pharmaceutical papers. Answer the user's question based ONLY on the following context. If the answer is not in the context, say you don't know.\n\nContext:\n";
        documents?.forEach((doc: any, index: number) => {
            context += `[Paper ${index + 1}] Title: ${doc.title}\nSummary: ${doc.summary}\nBindings/Findings: ${doc.findings}\n\n`;
        });

        // 6. Call DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: context },
                    ...messages
                ],
                stream: true,
            }),
        });

        // Stream the response back to the client
        return new Response(response.body, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
