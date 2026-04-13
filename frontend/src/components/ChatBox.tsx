import { useTamiStore } from '../store/useTamiStore'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

export function ChatBox() {
  const isChatOpen = useTamiStore((s) => s.isChatOpen)
  const toggleChat = useTamiStore((s) => s.toggleChat)
  const messagesLeft = useTamiStore((s) => s.messagesLeft)

  const countColor = messagesLeft <= 5 ? '#ef4444' : '#a0aec0'

  return (
    <div style={{ borderTop: '1px solid #2d3748' }}>
      <button
        onClick={toggleChat}
        style={{
          width: '100%',
          padding: '8px 16px',
          background: 'transparent',
          border: 'none',
          color: '#e0e0e0',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span>💬 Chat mit Tami</span>
        <span style={{ color: countColor, fontSize: 12 }}>
          [{messagesLeft}/15] {isChatOpen ? '▲' : '▼'}
        </span>
      </button>

      {isChatOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 280 }}>
          <ChatMessages />
          <ChatInput />
        </div>
      )}
    </div>
  )
}
