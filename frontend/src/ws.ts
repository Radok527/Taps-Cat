import type { WsMessage } from './types'

type MessageHandler = (msg: WsMessage) => void
type ReconnectHandler = () => void

const MAX_BACKOFF_MS = 30_000
const PING_INTERVAL_MS = 20_000

export function createWebSocket(
  onMessage: MessageHandler,
  onReconnect: ReconnectHandler,
): () => void {
  let ws: WebSocket | null = null
  let backoff = 1_000
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let closed = false

  function connect() {
    if (closed) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${proto}://${location.host}/ws`)

    ws.onopen = () => {
      backoff = 1_000
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, PING_INTERVAL_MS)
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as WsMessage
        onMessage(data)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
      }
      if (!closed) {
        setTimeout(() => {
          onReconnect()
          connect()
        }, backoff)
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
      }
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  return () => {
    closed = true
    if (pingTimer) clearInterval(pingTimer)
    ws?.close()
  }
}
