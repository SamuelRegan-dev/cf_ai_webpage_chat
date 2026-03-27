//Receives the parsed text as a string
// Splits it into chunks where every 500 characters with some overlap so context isn't lost at the edges
// Returns an array of strings where each string is one chunk

export const chunkText = (text: string, chunkSize = 500): string[] => {
    const sentences = text.split(/(?<=[.?!])\s+/);
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
        if ((current + sentence).length > chunkSize) {
            if (current) chunks.push(current.trim());
            current = sentence;
        } else {
            current += ' ' + sentence;
        }
    }

    if (current) chunks.push(current.trim());
    return chunks;
};
