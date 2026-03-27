//fetch/chunk/embed for the RAG after querying the http link
/*
* Extract API Route
* 1. Fetch URL from router (index.ts)
* 2. Parse text from webpage
* 3. Split text into chunks
* 4. Embed each chunk
* 5. Store chunks and embeddings into D1 chunks table
*/
import {embedChunks} from "./lib/embeddings";
import {chunkText} from "./lib/chunking";

export async function handleIngest(c: any, env: any) {
    console.log("ingest hit")
    const { url, sessionID } = await c.req.json()
    console.log("url:", url, "sessionID:", sessionID)
    const pageID = crypto.randomUUID()
    if (!sessionID) return c.json({ error: 'Unauthorized' }, { status: 401 });


    if (!url || !sessionID) {
        return c.json({ error: 'url and pageID are required' }, { status: 400 });
    }

    const response = await fetch(url);
    const text = await response.text()

    const chunks = chunkText(text);
    const embeddings = await embedChunks(chunks, env)

    await env.DB.prepare('INSERT INTO pages (id, session_id, url) VALUES (?, ?, ?)')
        .bind(pageID, sessionID, url)
        .run()

    await Promise.all(
        embeddings.map(async ({ chunk, vector }) => {
            const chunkId = crypto.randomUUID()
            await env.DB.prepare('INSERT INTO chunks (id, page_id, chunk_text, vector_id) VALUES (?, ?, ?, ?)')
                .bind(chunkId, pageID, chunk, chunkId)
                .run()
            await env.VECTORIZE.upsert([{ id: chunkId, values: vector }])
        })
    )


    return c.json({ success: true, chunksStored: chunks.length });
}
