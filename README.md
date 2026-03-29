# cf-ai-webpage-chat

A RAG-powered chat application that lets you have a conversation with any webpage. Built entirely on Cloudflare's developer platform.

## Live demo

[https://cf-ai-webpage-chat.pages.dev](https://cf-ai-webpage-chat.pages.dev)

## What it does

Paste a URL, the app fetches and indexes the page content, and you can then ask questions about it. Responses are grounded in the actual page content via retrieval-augmented generation rather than the LLM's training data.

## Architecture

Every component runs on Cloudflare:

- **Workers** — HTTP request handling via Hono
- **Workflows** — durable async ingest pipeline; fetches the URL, extracts text via HTMLRewriter, embeds chunks, and stores them. Each step is checkpointed so failures resume from the last successful step rather than restarting
- **Durable Objects** — session lifecycle management. Each session gets a DO instance that tracks activity via a `/touch` call on every ingest and chat request
- **Workers AI** — `@cf/baai/bge-base-en-v1.5` for embeddings, `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for generation
- **Vectorize** — vector index for semantic similarity search across ingested chunks
- **D1** — stores page metadata and chunk text, queried after Vectorize returns matching IDs
- **Pages** — serves the frontend

### RAG pipeline

1. User submits a URL — Workflow is triggered and returns a `workflowId` immediately
2. Frontend polls `/status/:workflowId` every 2 seconds until the Workflow completes
3. Workflow fetches the page, extracts text using HTMLRewriter, chunks it, batch-embeds via Workers AI, and stores in D1 and Vectorize
4. On chat, the user prompt is embedded and queried against Vectorize for the top 3 most semantically similar chunks
5. Matching chunk text is fetched from D1 and injected into the LLM prompt as context

### HTML extraction

HTMLRewriter is used for content extraction. Wikipedia is the only fully supported page type, using `#mw-content-text p, h2, h3` to target the article body and exclude navigation, references, and footer content.

For all other page types a generic fallback extracts `p, h1-h6, li` elements and surfaces a warning to the user that extraction may be incomplete or inaccurate.

HTMLRewriter is a streaming parser that does not build a DOM tree — a fundamental constraint of the Workers runtime. This makes it fast and memory-efficient but limits general-purpose extraction quality compared to DOM-based solutions like Readability. A production implementation would offload parsing to a dedicated service for unsupported page types.

## Setup

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Node.js 18+

### Deploy

1. Clone the repo:
```bash
git clone https://github.com/SamuelRegan-dev/cf_ai_webpage_chat
cd cf_ai_webpage_chat
```

2. Install dependencies:
```bash
cd worker
npm install
```

3. Create D1 database:
```bash
wrangler d1 create webpage-chat-db
```

Update the `database_id` in `wrangler.toml` with the ID returned.

4. Run D1 migrations:
```bash
wrangler d1 execute webpage-chat-db --remote --file=./schema.sql
```

5. Create Vectorize index:
```bash
wrangler vectorize create webpage-embeddings --dimensions=768 --metric=cosine
```

6. Deploy the Worker:
```bash
wrangler deploy
```

7. Deploy the frontend via [Cloudflare Pages](https://dash.cloudflare.com), connecting the GitHub repo with build output directory set to `frontend`.

8. Update `BASE_URL` in `frontend/app.js` with your Worker URL.

## Known limitations

- **Vectorize eventual consistency** — on newly created indexes, vectors may take additional time to become queryable after upsert. This is a platform-level behaviour inherent to Vectorize's consistency model, not a bug in the application
- **HTML extraction scope** — only Wikipedia pages are fully supported. All other page types fall back to generic extraction with reduced accuracy. 
- **HTMLRewriter is a streaming parser that does not build a DOM tree** — a fundamental constraint of the Workers runtime by design. Workers prioritise speed and memory efficiency by never constructing a DOM, which makes truly general-purpose extraction impossible without shipping a DOM implementation like linkedom as a dependency. The industry-standard content extraction algorithm, Readability, requires a full DOM tree to perform its structural scoring. Rather than introduce a heavy dependency that works against the Workers execution model, extraction scope was deliberately limited to Wikipedia, where the page structure is well-known and stable enough to target directly with HTMLRewriter selectors.
- **Context window** — ingestion is capped at 50 chunks per page to stay within the LLM's context budget. Long pages will have their later sections excluded