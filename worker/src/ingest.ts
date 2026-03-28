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
    const html = await response.text();
    const { text, warning } = await extractText(url, html);

    const chunks = chunkText(text).filter(chunk => chunk.trim().length > 0);
    const embeddings = await embedChunks(chunks, env);

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


    return c.json({ success: true, chunksStored: chunks.length, warning });
}

async function extractText(url: string, html: string): Promise<{ text: string, warning?: string }> {
    const chunks: string[] = [];
    let warning: string | undefined;

    const getSelectors = (url: string): string | null => {
        if (url.includes('wikipedia.org')) {
            return '#mw-content-text p, #mw-content-text h2, #mw-content-text h3, #mw-content-text li';
        }
        if (url.includes('github.com')) {
            return 'article p, .markdown-body p, .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body li, .markdown-body td';
        }
        if (url.includes('developers.cloudflare.com') || url.includes('docs.')) {
            return 'article p, .content p, main p, h1, h2, h3, li';
        }
        return null;
    };

    const selectors = getSelectors(url);

    if (selectors) {
        await new HTMLRewriter()
            .on(selectors, {
                text(text) {
                    if (text.text.trim()) chunks.push(text.text.trim());
                }
            })
            .transform(new Response(html))
            .text();
    } else {
        warning = 'This page type is not fully supported. Extraction may be incomplete or inaccurate.';
        await new HTMLRewriter()
            .on('p, h1, h2, h3, h4, h5, h6, li', {
                text(text) {
                    if (text.text.trim()) chunks.push(text.text.trim());
                }
            })
            .transform(new Response(html))
            .text();
    }

    return { text: chunks.join(' '), warning };
}
