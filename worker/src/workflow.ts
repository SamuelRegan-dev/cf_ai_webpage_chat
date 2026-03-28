//cloudflares workflow for ingestion
/*
 * Ingest Workflow
 * Fetch URL, extract text via HTMLRewriter, chunk into segments
 * Embed chunks via Workers AI, store in D1, Vectorize
 * Each step is checkpointed — on failure, execution resumes from the last successful step
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers'
import { chunkText } from './lib/chunking'
import { embedChunks } from './lib/embeddings'
import { extractText } from './lib/extract'

interface Env {
    DB: D1Database
    VECTORIZE: VectorizeIndex
    AI: Ai
    INGEST_WORKFLOW: Workflow
}

export class IngestWorkflow extends WorkflowEntrypoint<Env, { url: string, sessionID: string }> {
    async run(event: WorkflowEvent<{ url: string, sessionID: string }>, step: WorkflowStep) {

        const { chunks, pageID } = await step.do('fetch and extract', async () => {
            const pageID = crypto.randomUUID()
            const response = await fetch(event.payload.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; cf-ai-webpage-chat/1.0)' }
            })
            const html = await response.text()
            const { text } = await extractText(event.payload.url, html)
            const chunks = chunkText(text).filter((c: string) => c.trim().length > 0).slice(0, 50)
            return { chunks, pageID }
        })

        await step.do('store in D1 and Vectorize', async () => {
            const existing = await this.env.DB.prepare(
                'SELECT id FROM pages WHERE url = ? AND session_id = ?'
            ).bind(event.payload.url, event.payload.sessionID).first()

            if (existing) return

            await this.env.DB.prepare('INSERT INTO pages (id, session_id, url) VALUES (?, ?, ?)')
                .bind(pageID, event.payload.sessionID, event.payload.url)
                .run()

            const embeddings = await embedChunks(chunks, this.env)

            await Promise.all(
                embeddings.map(async ({ chunk, vector }: { chunk: string, vector: number[] }) => {
                    const chunkId = crypto.randomUUID()
                    await this.env.DB.prepare(
                        'INSERT INTO chunks (id, page_id, chunk_text, vector_id) VALUES (?, ?, ?, ?)'
                    ).bind(chunkId, pageID, chunk, chunkId).run()
                    await this.env.VECTORIZE.upsert([{ id: chunkId, values: vector }])
                })
            )
        })
    }
}