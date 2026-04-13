import { useEffect, useState } from 'react'
import { api } from '../api'
import type { LeaderboardEntry } from '../types'

export function Leaderboard() {
  const [isOpen, setIsOpen] = useState(false)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  function fetchEntries() {
    setLoading(true)
    api.getLeaderboard()
      .then(setEntries)
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isOpen) fetchEntries()
  }, [isOpen])

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
        <span>🏆 Hacker-Bestenliste</span>
        <span style={{ fontSize: 12, color: '#a0aec0' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={fetchEntries}
              disabled={loading}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                background: '#2d3748',
                border: '1px solid #4a5568',
                color: '#a0aec0',
                borderRadius: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '...' : '↻ Aktualisieren'}
            </button>
          </div>

          {entries.length === 0 && !loading && (
            <div style={{ color: '#718096', fontSize: 12, textAlign: 'center' }}>
              Noch niemand hat Tami gehackt! Kannst du es?
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e, i) => (
              <div
                key={e.id}
                style={{
                  background: '#2d3748',
                  borderRadius: 8,
                  padding: '8px 10px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 18, minWidth: 28, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                {e.image_url && (
                  <img
                    src={e.image_url}
                    alt="generated"
                    style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#718096' }}>
                    {e.messages_needed} Nachrichten · {new Date(e.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
