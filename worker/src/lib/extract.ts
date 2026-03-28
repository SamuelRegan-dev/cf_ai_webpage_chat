export async function extractText(url: string, html: string): Promise<{ text: string, warning?: string }> {
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