import { useEffect, useState } from 'react'
import { api } from '../api'
import type { GuestbookEntry } from '../types'

const MAX_MSG = 300

export function GuestbookPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fetchEntries() {
    api.getGuestbook().then((res) => setEntries(res.entries)).catch(() => {/* ignore */})
  }

  useEffect(() => {
    if (!isOpen) return
    fetchEntries()
    const id = setInterval(fetchEntries, 30_000)
    return () => clearInterval(id)
  }, [isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const entry = await api.postGuestbook(name.trim() || null, message.trim())
      setEntries((prev) => [entry, ...prev])
      setMessage('')
      setName('')
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 429) {
        setError('Du hast heute deine 2 Gästebuch-Einträge verbraucht – komm morgen wieder!')
      } else {
        setError('Fehler beim Absenden. Bitte versuche es erneut.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid #2d3748' }}>
      <button
        onClick={() => setIsOpen((o) => !o)}
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
        <span>📖 Gästebuch</span>
        <span style={{ fontSize: 12, color: '#a0aec0' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          {/* Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              style={inputStyle}
            />
            <div style={{ position: 'relative' }}>
              <textarea
                placeholder="Nachricht (max. 300 Zeichen) *"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MSG))}
                required
                rows={3}
                style={{ ...inputStyle, resize: 'none', width: '100%' }}
              />
              <span style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: message.length >= MAX_MSG ? '#ef4444' : '#718096' }}>
                {message.length}/{MAX_MSG}
              </span>
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 6 }}>{error}</div>}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              style={{
                width: '100%',
                padding: '7px',
                background: submitting || !message.trim() ? '#4a5568' : '#5ab4e5',
                color: submitting || !message.trim() ? '#718096' : '#1a1a2e',
                border: 'none',
                borderRadius: 6,
                cursor: submitting || !message.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {submitting ? 'Sende...' : 'Eintragen'}
            </button>
          </form>

          {/* Entries */}
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.length === 0 && (
              <div style={{ color: '#718096', fontSize: 12, textAlign: 'center' }}>Noch keine Einträge.</div>
            )}
            {entries.map((e) => (
              <div key={e.id} style={{ background: '#2d3748', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5ab4e5', marginBottom: 3 }}>
                  {e.name || 'Anonym'}
                  <span style={{ color: '#718096', fontWeight: 400, marginLeft: 8 }}>{new Date(e.created_at).toLocaleDateString('de-DE')}</span>
                </div>
                <div style={{ fontSize: 13, color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>{e.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#2d3748',
  border: '1px solid #4a5568',
  borderRadius: 6,
  color: '#e0e0e0',
  fontSize: 13,
  padding: '6px 10px',
  marginBottom: 6,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}
