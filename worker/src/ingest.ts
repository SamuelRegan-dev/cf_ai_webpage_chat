/*
 * Ingest Route Handler
 * Validate url/sessionID
 * Trigger IngestWorkflow as a background job
 */

export async function handleIngest(c: any, env: any) {
    console.log("ingest hit")
    const { url, sessionID } = await c.req.json()
    console.log("url:", url, "sessionID:", sessionID)

    if (!sessionID) return c.json({ error: 'Unauthorized' }, { status: 401 })
    if (!url) return c.json({ error: 'url is required' }, { status: 400 })

    const id = env.SESSION_DO.idFromName(sessionID)
    const stub = env.SESSION_DO.get(id)
    await stub.fetch('https://do/touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionID })
    })

    const instance = await env.INGEST_WORKFLOW.create({ params: { url, sessionID } })
    return c.json({ success: true, workflowId: instance.id })
}