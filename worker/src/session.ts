import { DurableObject } from 'cloudflare:workers'

interface Env {
    DB: D1Database
    VECTORIZE: VectorizeIndex
}

export class SessionDO extends DurableObject<Env> {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)

        if (url.pathname === '/touch') {
            const { sessionID } = await request.json() as { sessionID: string }
            await this.ctx.storage.put('sessionID', sessionID)
            await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000)
            return Response.json({ ok: true })
        }

        if (url.pathname === '/delete') {
            const { sessionID } = await request.json() as { sessionID: string }
            await this.cleanup(sessionID)
            return Response.json({ ok: true })
        }

        return new Response('Not found', { status: 404 })
    }

    async alarm(): Promise<void> {
        await this.cleanup()
    }

    private async cleanup(sessionID?: string): Promise<void> {
        const id = sessionID ?? await this.ctx.storage.get<string>('sessionID')
        console.log("cleanup called, sessionID:", id)
        if (!id) return

        const result = await this.env.DB.prepare(
            'SELECT c.id FROM chunks c JOIN pages p ON c.page_id = p.id WHERE p.session_id = ?'
        ).bind(id).all()

        const chunkIds = result.results.map((r: any) => r.id)
        if (chunkIds.length > 0) {
            await this.env.VECTORIZE.deleteByIds(chunkIds)
        }
        await this.env.DB.prepare('PRAGMA foreign_keys = ON').run()

        await this.env.DB.prepare('DELETE FROM pages WHERE session_id = ?')
            .bind(id).run()

        await this.ctx.storage.deleteAll()
    }
}