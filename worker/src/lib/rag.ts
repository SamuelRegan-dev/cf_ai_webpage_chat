/*
* RAG Pipeline
* Orchestrates the full retrieval-augmented generation flow
* 1. Embed the user prompt into a vector
* 2. Search pgvector for the 20 most semantically similar chunks
* 3. Construct an augmented prompt with retrieved context
* 4. Call the LLM and return the response
*/
