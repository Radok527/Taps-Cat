import { useEffect, useRef } from 'react'
import { useTamiStore } from '../store/useTamiStore'

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// Simple timestamp: just use current time when msg is shown
export function ChatMessages() {
  const chatHistory = useTamiStore((s) => s.chatHistory)
  const isChatLoading = useTamiStore((s) => s.isChatLoading)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatHistory, isChatLoading])

  return (
    <div ref={containerRef} style={{
      maxHeight: 130,
      overflowY: 'auto',
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {chatHistory.length === 0 && (
        <div style={{ color: 'var(--text-hint)', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
          Schreib Taps eine Nachricht!
        </div>
      )}
      {chatHistory.map((msg, i) => {
        if (msg.role === 'system') {
          return (
            <div key={i} style={{
              fontSize: 11,
              color: 'var(--warn, #f59e0b)',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 4,
              padding: '4px 8px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}>
              {msg.content}
            </div>
          )
        }
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              <span style={{
                fontSize: 12,
                color: msg.role === 'assistant' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: 700,
              }}>
                {msg.role === 'assistant' ? 'Taps' : 'du'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>
                {formatTime(new Date().toISOString())}
              </span>
            </div>
            <div style={{
              fontSize: 12,
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              maxWidth: '85%',
            }}>
              {msg.content}
            </div>
          </div>
        )
      })}
      {isChatLoading && (
        <div style={{ display: 'flex', gap: 4, padding: '2px 0', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>Taps</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--text-secondary)',
                animation: `dotFade 1.4s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
