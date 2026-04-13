import { useEffect, useState } from 'react'
import { api } from '../api'
import type { LeaderboardEntry } from '../types'

export function Leaderboard() {
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
    fetchEntries()
  }, [])

  return (
    <div style={{ padding: '10px 12px 12px' }}>
      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={fetchEntries}
          disabled={loading}
          style={{
            fontSize: 9,
            padding: '3px 7px',
            background: 'transparent',
            border: '1px solid var(--border-hover)',
            color: 'var(--text-secondary)',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Courier New', Courier, monospace",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '...' : '↻ Aktualisieren'}
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 && !loading && (
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: 10,
          textAlign: 'center',
          padding: '12px 0',
        }}>
          Noch niemand hat Taps gehackt! Kannst du es?
        </div>
      )}

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map((e, i) => (
          <div key={e.id} style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '6px 8px',
            background: 'var(--bg-secondary)',
            borderRadius: 4,
            border: '1px solid var(--border)',
          }}>
            {/* Rank */}
            <div style={{ fontSize: 12, minWidth: 22, textAlign: 'center', flexShrink: 0 }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>

            {/* Thumbnail */}
            {e.image_url && (
              <img
                src={`/images/${e.image_url.replace(/^.*\//, '')}`}
                alt="generated"
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'cover',
                  borderRadius: 4,
                  flexShrink: 0,
                  border: '1px solid var(--border-hover)',
                }}
              />
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10,
                color: 'var(--text-primary)',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {e.name || 'Anonym'}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-hint)', marginTop: 1 }}>
                {new Date(e.created_at).toLocaleDateString('de-DE')}
              </div>
            </div>

            {/* Messages badge */}
            <div style={{
              fontSize: 9,
              padding: '2px 5px',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              borderRadius: 3,
              flexShrink: 0,
            }}>
              {e.messages_needed} msg
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
