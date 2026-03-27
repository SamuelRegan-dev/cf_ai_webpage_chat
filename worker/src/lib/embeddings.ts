/*
* Chunk Embedder
* Takes an array of text chunks and returns each paired with its embedding vector
* Runs all embedding requests concurrently for performance
* Used during ingestion to populate the embeddings table
*/
export async function embedText(text: string, env: any): Promise<number[]> {
    const { data } = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text })
    return data[0]
}

export async function embedChunks(chunks: string[], env: any): Promise<{ chunk: string, vector: number[] }[]> {
   return await Promise.all(
        chunks.map(async (chunk) => {
            const vector = await embedText(chunk, env);
            return {chunk, vector};
        })
    );
}
