import { createServer, type Server } from 'http'
import { HOOK_PORT } from './claudeHooks'
import { handleHookEvent, type HookEvent } from './claudeLive'

const MAX_BODY = 1024 * 1024

let server: Server | null = null

/**
 * Receives Claude Code hook events from our hook script. Listens on localhost
 * only, and rejects browser requests (they carry an Origin header), so a web
 * page can't post fake events.
 */
export function startHookServer(): void {
  server = createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/claude-event' || req.headers.origin) {
      res.writeHead(404).end()
      return
    }
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      body += chunk
      if (body.length > MAX_BODY) req.destroy()
    })
    req.on('end', () => {
      res.writeHead(204).end()
      try {
        const { event, terminalId } = JSON.parse(body) as {
          event?: HookEvent
          terminalId?: unknown
        }
        if (typeof event?.hook_event_name !== 'string') return
        handleHookEvent(event, typeof terminalId === 'number' ? terminalId : null)
      } catch {
        // ignore malformed events
      }
    })
  })

  server.on('error', (e: NodeJS.ErrnoException) => {
    // Another Lowtide (e.g. a test instance) already listens: run without live Claude status.
    console.error(`[lowtide] claude hook server unavailable on port ${HOOK_PORT}: ${e.code}`)
  })
  server.listen(HOOK_PORT, '127.0.0.1')
}

export function stopHookServer(): void {
  server?.close()
  server = null
}
