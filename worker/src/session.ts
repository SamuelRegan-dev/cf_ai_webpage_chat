import { DurableObject } from 'cloudflare:workers'

export class SessionDO extends DurableObject {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === '/touch') {
            const { sessionID } = await request.json() as { sessionID: string }
            await this.ctx.storage.put('sessionID', sessionID)
            return Response.json({ ok: true })
        }

        return new Response('Not found', { status: 404 })
    }

    async alarm(): Promise<void> {}
}