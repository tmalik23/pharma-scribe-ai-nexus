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

    // Simple rate limiting using request count (in production, use Redis or similar)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Block common scrapers/bots
    const botPatterns = /bot|crawl|spider|scrape|wget|curl|python|headless|phantom|selenium/i;
    if (botPatterns.test(userAgent)) {
        return new Response(JSON.stringify({ error: 'Automated access not permitted' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const { messages } = await req.json();
        const userMessage = messages[messages.length - 1].content;

        // Initialize Clients
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('VITE_OPENAI_API_KEY');
        if (!openaiApiKey) throw new Error('OPENAI_API_KEY is not set');

        const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('VITE_DEEPSEEK_API_KEY');
        if (!deepseekApiKey) throw new Error('DEEPSEEK_API_KEY is not set');

        const openai = new OpenAI({ apiKey: openaiApiKey });

        // Get database stats
        const { count: paperCount } = await supabase.from('papers').select('*', { count: 'exact', head: true });
        const { count: chunkCount } = await supabase.from('paper_chunks').select('*', { count: 'exact', head: true });

        // Tool execution function
        async function executeTool(toolName: string, args: any): Promise<string> {
            console.log(`Executing: ${toolName}`, args);

            switch (toolName) {
                case 'search_papers': {
                    const embeddingResponse = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: args.query || args.topic || userMessage,
                    });
                    const embedding = embeddingResponse.data[0].embedding;

                    const { data, error } = await supabase.rpc('match_papers', {
                        query_embedding: embedding,
                        match_threshold: 0.1,
                        match_count: args.limit || 5,
                    });

                    if (error) return `Error: ${error.message}`;
                    if (!data?.length) return "No papers found matching this query.";

                    return data.map((p: any, i: number) =>
                        `• **"${p.title}"** (${p.pub_year || '?'}) [📄 Open](paper:${p.id})\n  ${p.summary || p.findings || 'No summary'}`
                    ).join('\n\n');
                }

                case 'search_content':
                case 'search_paper_content': {
                    const embeddingResponse = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: args.query || userMessage,
                    });
                    const embedding = embeddingResponse.data[0].embedding;

                    const { data, error } = await supabase.rpc('match_chunks', {
                        query_embedding: embedding,
                        match_threshold: 0.1,
                        match_count: args.limit || 5,
                    });

                    if (error) return `Error: ${error.message}`;
                    if (!data?.length) return "No matching content found in paper texts.";

                    return data.map((c: any, i: number) =>
                        `From **"${c.paper_title}"** (${c.pub_year || '?'}) [📄 Open](paper:${c.paper_id}):\n> "${c.chunk_content.substring(0, 200)}..."`
                    ).join('\n\n');
                }

                case 'count_papers': {
                    let query = supabase.from('papers').select('*', { count: 'exact', head: true });

                    if (args.year) query = query.eq('pub_year', args.year);
                    if (args.year_min) query = query.gte('pub_year', args.year_min);
                    if (args.year_max) query = query.lte('pub_year', args.year_max);
                    if (args.entity || args.topic) query = query.contains('entities', [args.entity || args.topic]);

                    const { count, error } = await query;
                    if (error) return `Error: ${error.message}`;

                    let desc = "Total papers in database";
                    if (args.year) desc = `Papers from ${args.year}`;
                    else if (args.year_min || args.year_max) desc = `Papers from ${args.year_min || '?'} to ${args.year_max || 'present'}`;
                    if (args.entity || args.topic) desc += ` about "${args.entity || args.topic}"`;

                    return `${desc}: ${count}`;
                }

                case 'list_topics':
                case 'get_topics': {
                    const { data, error } = await supabase.rpc('get_entity_stats');
                    if (error) return `Error: ${error.message}`;

                    const topics = (data || []).slice(0, args.limit || 10);
                    return `Top ${topics.length} research topics:\n` +
                        topics.map((t: any, i: number) => `${i + 1}. ${t.entity} (${t.paper_count} papers)`).join('\n');
                }

                case 'analyze_trends':
                case 'get_trends': {
                    const { data, error } = await supabase.rpc('analyze_topic_trend', {
                        topic_name: args.topic || args.entity || 'DNA'
                    });

                    if (error) return `Error: ${error.message}`;
                    if (!data?.length) return `No trend data found for "${args.topic}"`;

                    return `Research trend for "${args.topic}":\n\n` +
                        data.map((d: any) => `${d.year}: ${d.paper_count} papers`).join('\n');
                }

                case 'find_gaps':
                case 'research_gaps': {
                    const { data, error } = await supabase.rpc('find_research_gaps', {
                        min_papers: 1,
                        max_papers: 5
                    });

                    if (error) return `Error: ${error.message}`;
                    if (!data?.length) return "No research gaps found.";

                    return `Understudied topics:\n\n` +
                        data.slice(0, 10).map((g: any, i: number) => `${i + 1}. "${g.entity}" - only ${g.paper_count} paper(s)`).join('\n');
                }

                case 'random_explore':
                case 'discover':
                case 'random_exploration': {
                    const { data, error } = await supabase.rpc('random_exploration', {
                        sample_count: args.count || 5
                    });

                    if (error) return `Error: ${error.message}`;
                    if (!data?.length) return "No papers available.";

                    return `Random papers:\n\n` +
                        data.map((p: any) =>
                            `• **"${p.title}"** (${p.pub_year || '?'}) [📄 Open](paper:${p.id})\n  ${p.summary?.substring(0, 150) || 'No summary'}...`
                        ).join('\n\n');
                }

                case 'find_connections':
                case 'discover_connections': {
                    const { data, error } = await supabase.rpc('discover_hidden_connections', {
                        sample_size: 50
                    });

                    if (error) return `Error: ${error.message}`;
                    if (!data?.length) return "No hidden connections found. Try again for different results.";

                    return `**Connections via shared topics:**\n\n` +
                        data.slice(0, 5).map((c: any, i: number) =>
                            `${i + 1}. Topic: **${c.shared_entity}**\n` +
                            `   • [📄 ${c.paper_a_title?.substring(0, 50)}...](paper:${c.paper_a_id}) (${c.paper_a_year || '?'})\n` +
                            `   • [📄 ${c.paper_b_title?.substring(0, 50)}...](paper:${c.paper_b_id}) (${c.paper_b_year || '?'})`
                        ).join('\n\n');
                }

                case 'database_stats':
                case 'overview': {
                    // Get comprehensive stats
                    const { data: topics } = await supabase.rpc('get_entity_stats');
                    const topTopics = (topics || []).slice(0, 5).map((t: any) => `${t.entity} (${t.paper_count})`).join(', ');

                    // Get year range
                    const { data: yearData } = await supabase
                        .from('papers')
                        .select('pub_year')
                        .not('pub_year', 'is', null)
                        .order('pub_year', { ascending: true })
                        .limit(1);
                    const minYear = yearData?.[0]?.pub_year || 'unknown';

                    const { data: maxYearData } = await supabase
                        .from('papers')
                        .select('pub_year')
                        .not('pub_year', 'is', null)
                        .order('pub_year', { ascending: false })
                        .limit(1);
                    const maxYear = maxYearData?.[0]?.pub_year || 'unknown';

                    // Get decade breakdown
                    const { data: decadeData } = await supabase.rpc('get_papers_by_decade');
                    const decadeBreakdown = (decadeData || []).map((d: any) => `${d.decade}s: ${d.count}`).join(', ');

                    return `## DATABASE OVERVIEW

**Total Papers:** ${paperCount} research papers
**Text Chunks:** ${chunkCount} searchable text segments
**Publication Years:** ${minYear} to ${maxYear}

**Papers by Decade:** ${decadeBreakdown || 'N/A'}

**Top Research Topics:**
${(topics || []).slice(0, 10).map((t: any, i: number) => `${i + 1}. ${t.entity} (${t.paper_count} papers)`).join('\n')}`;
                }

                default:
                    return `Unknown tool: ${toolName}. Available: search_papers, search_content, count_papers, list_topics, analyze_trends, find_gaps, random_explore, find_connections, database_stats`;
            }
        }

        // Analyze user intent and gather relevant data FIRST
        let context = "";
        const lowerQuery = userMessage.toLowerCase();

        // Auto-execute relevant tools based on query
        if (lowerQuery.includes('overview') || lowerQuery.includes('database') || lowerQuery.includes('how many papers')) {
            context += await executeTool('database_stats', {}) + "\n\n";
        }

        if (lowerQuery.includes('topic') || lowerQuery.includes('research area') || lowerQuery.includes('what are')) {
            context += await executeTool('list_topics', { limit: 10 }) + "\n\n";
        }

        if (lowerQuery.includes('trend') || lowerQuery.includes('evolve') || lowerQuery.includes('over time') || lowerQuery.includes('over the years')) {
            // Extract topic from query
            const topicMatch = lowerQuery.match(/(?:trend|evolution|evolve|research)\s+(?:for|of|on|in)?\s*(\w+)/i);
            const topic = topicMatch ? topicMatch[1] : 'DNA';
            context += await executeTool('analyze_trends', { topic }) + "\n\n";
        }

        if (lowerQuery.includes('gap') || lowerQuery.includes('understudied') || lowerQuery.includes('missing') || lowerQuery.includes('unexplored')) {
            context += await executeTool('find_gaps', {}) + "\n\n";
        }

        if (lowerQuery.includes('connection') || lowerQuery.includes('connect') || lowerQuery.includes('link') || lowerQuery.includes('hidden')) {
            context += await executeTool('find_connections', {}) + "\n\n";
        }

        if (lowerQuery.includes('surprise') || lowerQuery.includes('insight') || lowerQuery.includes('interesting') || lowerQuery.includes('random') || lowerQuery.includes('explore')) {
            context += await executeTool('random_explore', { count: 5 }) + "\n\n";
        }

        // Always do a semantic search for specific queries
        if (context === "" || lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('papers about') || lowerQuery.includes('research on')) {
            context += "SEMANTIC SEARCH RESULTS:\n" + await executeTool('search_papers', { query: userMessage, limit: 5 }) + "\n\n";
            context += "FULL TEXT SEARCH:\n" + await executeTool('search_content', { query: userMessage, limit: 3 }) + "\n\n";
        }

        // Build the final prompt - CONCISE VERSION
        const systemPrompt = `You are a Research Oracle for ${paperCount} scientific papers (${chunkCount} text segments).

## DATA PROVIDED:
${context}

## RESPONSE RULES - BE CONCISE!

1. **Keep it short** - Max 3-5 bullet points per insight
2. **Cross-paper connections**: When asked for "connections" or "insights", COMPARE different papers:
   - "Paper A (2005) studied X, while Paper B (2018) found Y. Together this suggests Z."
3. **Use bullet points** - Not long paragraphs
4. **Cite papers** - Include [View Paper] links when available
5. **No filler** - Skip "let me explain" or "here's what I found"

## FORMAT EXAMPLES:

Good insight (CONCISE):
- **Paper A** found X connects to **Paper B**'s finding on Y
- This suggests a potential link between [mechanism] and [outcome]

Bad (TOO VERBOSE):
"Based on my analysis of the database, I have discovered several interesting connections. Let me walk you through them in detail..."

## WHEN ASKED "SURPRISE ME" or "INSIGHTS":
- Pick 2-3 papers from the random sample
- Find ONE unexpected connection between them
- State it in 2-3 sentences MAX

## WHEN DATA IS MISSING:
Say: "No papers on [topic] in this database." Stop there.`;

        // Stream the final response
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                stream: true,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek API Error: ${response.status} - ${errText}`);
        }

        return new Response(response.body, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
