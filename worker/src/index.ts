//hono app entry point (CRUD)
//handles endpoints for ingestions, chat logic and cleanup logic via hono
import { Hono } from 'hono'
import { handleIngest } from './ingest'
import { handleChat } from './chat'
export { IngestWorkflow } from './workflow'
export { SessionDO } from './session'

interface Env {
    DB: D1Database
    VECTORIZE: VectorizeIndex
    AI: Ai
    ASSETS: Fetcher
    INGEST_WORKFLOW: Workflow
    SESSION_DO: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
    await next()
    const response = new Response(c.res.body, c.res)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    c.res = response
})

app.options('*', () => new Response(null, { status: 204 }))

app.post('/ingest', async (c) => handleIngest(c, c.env))

app.post('/chat', async (c) => {
    const body = await c.req.json()
    if (body.sessionID) {
        const id = c.env.SESSION_DO.idFromName(body.sessionID)
        const stub = c.env.SESSION_DO.get(id)
        c.executionCtx.waitUntil(
            stub.fetch('https://do/touch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionID: body.sessionID })
            })
        )
    }
    return handleChat(c, c.env)
})

app.post('/session/delete', async (c) => {
    const { sessionID } = await c.req.json()
    if (!sessionID) return c.json({ error: 'sessionID required' }, { status: 400 })

    const id = c.env.SESSION_DO.idFromName(sessionID)
    const stub = c.env.SESSION_DO.get(id)
    await stub.fetch('https://do/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionID })
    })

    return c.json({ success: true })
})

app.get('/status/:workflowId', async (c) => {
    const instance = await c.env.INGEST_WORKFLOW.get(c.req.param('workflowId'))
    const status = await instance.status()
    return c.json({ status: status.status })
})

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app