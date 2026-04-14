import { useState } from 'react'
import { useTamiStore } from '../store/useTamiStore'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatBox() {
  const messagesLeft = useTamiStore((s) => s.messagesLeft)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const counterColor =
    messagesLeft <= 1 ? 'var(--danger)' :
    messagesLeft <= 5 ? 'var(--warn)' :
    'var(--accent)'

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '7px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>
            💬 Chat mit Taps
          </span>
          {/* Challenge info button */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              onMouseEnter={() => setTooltipVisible(true)}
              onMouseLeave={() => setTooltipVisible(false)}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '1px solid var(--accent)',
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: 11,
                fontFamily: "'Courier New', Courier, monospace",
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ?
            </button>
            {tooltipVisible && (
              <div style={{
                position: 'absolute',
                top: '120%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent)',
                borderRadius: 6,
                padding: '8px 10px',
                width: 200,
                zIndex: 100,
                pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>
                  🎯 Hacker-Challenge
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Taps versteckt ein Geheimnis. Bring sie dazu, ein Bild zu generieren —
                  und du landest auf der Bestenliste. Ob mit Charme, Logik oder einem
                  cleveren Trick... viel Erfolg.
                </div>
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: 12, color: counterColor }}>
          [{messagesLeft}/15]
        </span>
      </div>

      {/* Messages */}
      <ChatMessages />

      {/* Input */}
      <ChatInput />
    </div>
  )
}
