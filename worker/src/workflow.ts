//cloudflares workflow for ingestion
// fetch the URL and chunk the text
// embed chunks and store in D1 and Vectorize
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers'
import { chunkText } from './lib/chunking'
import { embedText } from './lib/embeddings'

interface Env {
    DB: D1Database
    VECTORIZE: VectorizeIndex
    AI: Ai
}

export class IngestWorkflow extends WorkflowEntrypoint<Env> {
    async run(event: WorkflowEvent<{ url: string, sessionID: string }>, step: WorkflowStep) {
        const pageID = crypto.randomUUID()
        const text = await step.do('fetch and chunk', async () => {
            const response = await fetch(event.payload.url)
            const html = await response.text()
            return chunkText(html)
        })

        await step.do('embed and store', async () => {
            await this.env.DB.prepare('INSERT INTO pages (id, session_id, url) VALUES (?, ?, ?)')
                .bind(pageID, event.payload.sessionID, event.payload.url)
                .run()

            await Promise.all(
                text.map(async (chunk: any) => {
                    const chunkId = crypto.randomUUID()
                    const vector = await embedText(chunk, this.env)
                    await this.env.DB.prepare('INSERT INTO chunks (id, page_id, chunk_text, vector_id) VALUES (?, ?, ?, ?)')
                        .bind(chunkId, pageID, chunk, chunkId)
                        .run()
                    await this.env.VECTORIZE.upsert([{ id: chunkId, values: vector }])
                })
            )
        })
    }
}