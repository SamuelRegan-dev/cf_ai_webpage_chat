//hono app entry point (CRUD)
//handles endpoints for ingestions, chat logic and cleanup logic via hono
import { Hono } from 'hono'
import { handleIngest } from './ingest'
import { handleChat } from './chat'
export { IngestWorkflow } from './workflow'

interface Env {
    DB: D1Database
    VECTORIZE: VectorizeIndex
    AI: Ai
    ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
    await next();
    c.res.headers.set('Access-Control-Allow-Origin', 'https://cf-ai-webpage-chat.pages.dev');
    c.res.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
});

app.options('*', (c) => new Response(null, { status: 204 }));

app.post("/chat", async (c) => {
    return handleChat(c, c.env)
})

app.delete("/session", async(c)=> {
    return c.json({success:true})
})

app.post("/ingest", async(c) => {
    return handleIngest(c, c.env)
})

app.get("*", async (c) => {
    console.log("ASSETS binding:", c.env.ASSETS)
    return c.env.ASSETS.fetch(c.req.raw)
})

export default app