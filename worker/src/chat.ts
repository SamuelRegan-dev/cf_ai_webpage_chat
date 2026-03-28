//this is where the rag query occurs as well as the LLM calls
/*
 * Chat Route Handler
 * 1. Parse userPrompt and sessionID from request
 * 2. Run RAG pipeline
 * 3. Return LLM response to frontend
 */

import { runRAGPipeline } from './lib/rag';

export async function handleChat(c: any, env: any): Promise<Response> {
    const { userPrompt, sessionID } = await c.req.json();

    if (!sessionID) return c.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userPrompt) return c.json({ error: 'userPrompt is required' }, { status: 400 });

    const response = await runRAGPipeline(userPrompt, sessionID, env);

    return c.json({ response });
}