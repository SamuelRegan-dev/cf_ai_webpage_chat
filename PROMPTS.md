# PROMPTS.md

AI-assisted coding was used throughout this project via Claude. The following are representative prompts used during development.

## Architectural decisions

- "At an industry level, how does Cloudflare implement Workflows and how can I apply it to this project?"
- "Is it better practice to hold every DB value as a Durable Object or can I generate this in app.js to make life easier?"

## Platform understanding

- "Why is HTMLRewriter not suitable as a general text extraction solution for websites and what can I use instead that's still compatible with Workers?"
- "Why do Cloudflare Workflows not work in local dev? How else can I test them?"

## Debugging

- "[wrangler tail logs]; The pipeline is querying the vectors but it doesn't retrieve chunks until 5 minutes later."
- "Why is the LLM only talking about empty headers instead of the retrieved chunks?"

## Implementation

- "The embeddings are failing halfway through because im hitting the workers rate limits. Can you write me code to embed in sections? How can I embed multiple chunks at a time without overloading the Workers?"
- "I want you to create a clean frontend where the ingested websites are listed in a sidebar and a URL bar is available for ingesting URLs."