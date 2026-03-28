export async function extractText(url: string, html: string): Promise<{ text: string, warning?: string }> {
    const chunks: string[] = [];
    let warning: string | undefined;

    const getSelectors = (_url: string): string | null => {
        if (_url.includes('wikipedia.org')) {
            return '#mw-content-text p, #mw-content-text h2, #mw-content-text h3';
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
        warning = 'Only Wikipedia pages are fully supported. Extraction may be incomplete or inaccurate.';
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