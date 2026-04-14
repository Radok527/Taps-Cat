import { useState } from 'react'
import { api } from '../api'
import { useTamiStore } from '../store/useTamiStore'
import type { AnimationType } from '../types'

interface ActionConfig {
  label: string
  anim: AnimationType
  call: () => Promise<unknown>
}

const ACTIONS: ActionConfig[] = [
  { label: '🍖 Füttern',    anim: 'eating',  call: () => api.feed() },
  { label: '🎮 Spielen',    anim: 'playing', call: () => api.play() },
  { label: '🐾 Streicheln', anim: 'happy',   call: () => api.pet()  },
]

export function ActionButtons() {
  const [loading, setLoading] = useState<string | null>(null)
  const setLiveState = useTamiStore((s) => s.setLiveState)
  const setAnimationOverride = useTamiStore((s) => s.setAnimationOverride)
  const dailyImagesLeft = useTamiStore((s) => s.dailyImagesLeft)
  const visitorCount = useTamiStore((s) => s.visitorCount)

  async function handleAction(action: ActionConfig) {
    if (loading) return
    setLoading(action.label)
    setAnimationOverride(action.anim, Date.now() + 2000)
    try {
      const res = await action.call() as { hunger: number; happy: number; last_action: string }
      setLiveState({
        hunger: res.hunger,
        happy: res.happy,
        lastAction: res.last_action,
        visitorCount,
        dailyImagesLeft,
      })
    } catch {
      // ignore
    } finally {
      setLoading(null)
    }
  }

  const anyLoading = loading !== null

  return (
    <div style={{
      display: 'flex',
      gap: 5,
      padding: '8px 10px',
      borderBottom: '1px solid var(--border)',
    }}>
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          disabled={anyLoading}
          onClick={() => handleAction(action)}
          style={{
            flex: 1,
            padding: '6px 4px',
            background: 'var(--bg-secondary)',
            border: `1px solid var(--border-hover)`,
            borderRadius: 6,
            color: anyLoading ? 'var(--text-hint)' : 'var(--text-primary)',
            cursor: anyLoading ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontFamily: "'Courier New', Courier, monospace",
            opacity: anyLoading ? 0.4 : 1,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!anyLoading) {
              const btn = e.currentTarget
              btn.style.borderColor = 'var(--accent)'
              btn.style.color = 'var(--accent)'
            }
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget
            btn.style.borderColor = 'var(--border-hover)'
            btn.style.color = anyLoading ? 'var(--text-hint)' : 'var(--text-primary)'
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
