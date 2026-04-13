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
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
      if (res.challenge_success && res.image_url) {
        setChallengeSolved(res.image_url)
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (messagesLeft <= 0) {
    return (
      <div style={{ padding: '8px 12px 12px', color: '#718096', fontSize: 13, textAlign: 'center' }}>
        Komm morgen wieder! 🐱
      </div>
    )
  }

  return (
    <div style={{ padding: '0 12px 12px', display: 'flex', gap: 8 }}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Schreib Tami..."
        rows={2}
        style={{
          flex: 1,
          resize: 'none',
          background: '#2d3748',
          border: '1px solid #4a5568',
          borderRadius: 8,
          color: '#e0e0e0',
          fontSize: 13,
          padding: '6px 10px',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        style={{
          padding: '0 14px',
          background: disabled || !text.trim() ? '#4a5568' : '#5ab4e5',
          color: disabled || !text.trim() ? '#718096' : '#1a1a2e',
          border: 'none',
          borderRadius: 8,
          cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: 18,
          transition: 'background 0.2s',
        }}
      >
        ➤
      </button>
    </div>
  )
}
