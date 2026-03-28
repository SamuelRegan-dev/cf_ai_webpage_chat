/*
* Chunk Embedder
* Takes an array of text chunks and returns each paired with its embedding vector
* Uses Workers AI batch embedding to embed all chunks in a single API call
*/
export async function embedChunks(chunks: string[], env: any): Promise<{ chunk: string, vector: number[] }[]> {
    const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: chunks });
    return chunks.map((chunk, i) => ({ chunk, vector: result.data[i] }));
}

export async function embedText(text: string, env: any): Promise<number[]> {
    const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text });
    return result.data[0];
}