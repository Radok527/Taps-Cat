import { useEffect, useState } from 'react'
import { api } from '../api'
import type { GuestbookEntry } from '../types'

const MAX_MSG = 300

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-hover)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  fontSize: 11,
  padding: '5px 8px',
  marginBottom: 6,
  outline: 'none',
  fontFamily: "'Courier New', Courier, monospace",
  boxSizing: 'border-box',
}

export function GuestbookPanel() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fetchEntries() {
    api.getGuestbook().then((res) => setEntries(res.entries)).catch(() => {/* ignore */})
  }

  useEffect(() => {
    fetchEntries()
    const id = setInterval(fetchEntries, 30_000)
    return () => clearInterval(id)
  }, [])

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
    <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Form */}
      <form onSubmit={handleSubmit}>
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
            style={{
              ...inputStyle,
              resize: 'none',
              marginBottom: 0,
            }}
          />
          <span style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: 9,
            color: message.length >= MAX_MSG ? 'var(--danger)' : 'var(--text-hint)',
          }}>
            {message.length}/{MAX_MSG}
          </span>
        </div>
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 10, marginTop: 4, marginBottom: 4 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          style={{
            width: '100%',
            marginTop: 6,
            padding: '6px',
            background: 'transparent',
            border: '1px solid var(--accent)',
            borderRadius: 4,
            color: submitting || !message.trim() ? 'var(--text-hint)' : 'var(--accent)',
            cursor: submitting || !message.trim() ? 'not-allowed' : 'pointer',
            fontSize: 10,
            fontFamily: "'Courier New', Courier, monospace",
            opacity: submitting || !message.trim() ? 0.5 : 1,
          }}
        >
          {submitting ? 'Sende...' : 'Eintragen'}
        </button>
      </form>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {entries.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>
            Noch keine Einträge.
          </div>
        )}
        {entries.map((e, i) => (
          <div key={e.id} style={{
            paddingTop: i > 0 ? 8 : 0,
            marginTop: i > 0 ? 8 : 0,
            borderTop: i > 0 ? '1px solid var(--bg-tertiary)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>
                {e.name || 'Anonym'}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-hint)' }}>
                {new Date(e.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              {e.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
