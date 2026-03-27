//hono app entry point (CRUD)
//handles endpoints for ingestions, chat logic and cleanup logic via hono
import { Hono } from 'hono'
import { handleIngest } from './ingest'
export { IngestWorkflow } from './workflow'

interface Env {
    DB: D1Database
    VECTORIZE: VectorizeIndex
    AI: Ai
    ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()
app.post("/chat", async(c)=> {
    return c.json({response: 'placeholder'})
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