/*
 * RAG Pipeline
 * Orchestrates the full retrieval-augmented generation flow
 * 1. Embed the user prompt into a vector
 * 2. Search Vectorize for the 20 most semantically similar chunks
 * 3. Fetch matching chunk text from D1
 * 4. Construct an augmented prompt with retrieved context
 * 5. Call Workers AI and return the response
 */

export async function runRAGPipeline(userPrompt: string, sessionID: string, env: any): Promise<string> {
    console.log("1. starting RAG pipeline")
    const vector = await embedQuery(userPrompt, env);
    console.log("2. embedded query, vector length:", vector?.length)
    const chunkIds = await searchChunks(vector, sessionID, env);
    console.log("3. found chunkIds:", chunkIds)
    const chunks = await fetchChunkText(chunkIds, env);
    console.log("4. fetched chunks:", chunks?.length)
    console.log("chunk content:", chunks)
    const prompt = buildPrompt(userPrompt, chunks);
    console.log("5. built prompt")
    const response = await callLLM(prompt, env);
    console.log("6. got LLM response")
    return response;
}

async function embedQuery(userPrompt: string, env: any): Promise<number[]> {
    const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: userPrompt });
    return result.data[0];
}

async function searchChunks(vector: number[], sessionID: string, env: any): Promise<string[]> {
    const results = await env.VECTORIZE.query(vector, { topK: 3 });
    return results.matches.map((match: any) => match.id);
}

async function fetchChunkText(chunkIds: string[], env: any): Promise<string[]> {
    const placeholders = chunkIds.map(() => '?').join(',');
    const result = await env.DB.prepare(
        `SELECT chunk_text FROM chunks WHERE id IN (${placeholders})`
    ).bind(...chunkIds).all();

    return result.results.map((row: any) => row.chunk_text);
}

function buildPrompt(userPrompt: string, chunks: string[]): string {
    const context = chunks.join('\n\n');
    return `You are a helpful assistant. Use the context below to answer the question.

Context:
${context}

Question: ${userPrompt}`;
}

async function callLLM(prompt: string, env: any): Promise<string> {
    const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [{ role: 'user', content: prompt }]
    });
    return result.response ?? '';
}