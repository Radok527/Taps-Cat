import { useEffect, useRef } from 'react'
import { useTamiStore } from '../store/useTamiStore'

export function ChatMessages() {
  const chatHistory = useTamiStore((s) => s.chatHistory)
  const isChatLoading = useTamiStore((s) => s.isChatLoading)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isChatLoading])

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {chatHistory.length === 0 && (
        <div style={{ color: '#718096', fontSize: 13, textAlign: 'center', marginTop: 16 }}>
          Schreib Tami eine Nachricht! 🐱
        </div>
      )}
      {chatHistory.map((msg, i) => (
        <div
          key={i}
          style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            padding: '8px 12px',
            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: msg.role === 'user' ? '#5ab4e5' : '#2d3748',
            color: msg.role === 'user' ? '#1a1a2e' : '#e0e0e0',
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.content}
        </div>
      ))}
      {isChatLoading && (
        <div
          style={{
            alignSelf: 'flex-start',
            padding: '8px 12px',
            borderRadius: '16px 16px 16px 4px',
            background: '#2d3748',
            color: '#718096',
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          <span className="loading-dots">•••</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
