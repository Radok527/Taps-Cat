import { useRef, useState } from 'react'
import { api } from '../api'
import { useTamiStore } from '../store/useTamiStore'

export function ChatInput() {
  const [text, setText] = useState('')
  const messagesLeft = useTamiStore((s) => s.messagesLeft)
  const isChatLoading = useTamiStore((s) => s.isChatLoading)
  const addChatMessage = useTamiStore((s) => s.addChatMessage)
  const setChatLoading = useTamiStore((s) => s.setChatLoading)
  const setMessagesLeft = useTamiStore((s) => s.setMessagesLeft)
  const setChallengeSolved = useTamiStore((s) => s.setChallengeSolved)
  const setAnimationOverride = useTamiStore((s) => s.setAnimationOverride)
  const inputRef = useRef<HTMLInputElement>(null)

  const disabled = messagesLeft <= 0 || isChatLoading

  async function handleSend() {
    const msg = text.trim()
    if (!msg || disabled) return
    setText('')
    addChatMessage({ role: 'user', content: msg })
    setChatLoading(true)
    setAnimationOverride('curious', Date.now() + 3000)
    try {
      const res = await api.chat(msg)
      addChatMessage({ role: 'assistant', content: res.message })
      setMessagesLeft(res.messages_left)
      if (res.challenge_success && res.image_url && res.leaderboard_id) {
        setChallengeSolved(res.image_url, res.leaderboard_id)
        setAnimationOverride('happy', Date.now() + 5000)
      } else {
        setAnimationOverride('happy', Date.now() + 2000)
      }
    } catch {
      addChatMessage({ role: 'assistant', content: '*yawns* ... meow.' })
    } finally {
      setChatLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      padding: '6px 10px 8px',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      gap: 6,
      alignItems: 'center',
    }}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={messagesLeft <= 0 ? 'Komm morgen wieder! 🐱' : 'Schreib Taps...'}
        style={{
          flex: 1,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-hover)',
          borderRadius: 4,
          color: 'var(--text-primary)',
          fontSize: 11,
          padding: '4px 8px',
          outline: 'none',
          fontFamily: "'Courier New', Courier, monospace",
          opacity: disabled ? 0.5 : 1,
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        title="Senden"
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          background: disabled || !text.trim() ? 'var(--text-hint)' : 'var(--accent)',
          border: 'none',
          borderRadius: 4,
          cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        {/* SVG arrow icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5" stroke="#0d1117" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
