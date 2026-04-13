import { useState } from 'react'
import { api } from '../api'
import { useTamiStore } from '../store/useTamiStore'
import type { AnimationType } from '../types'

interface ActionConfig {
  label: string
  emoji: string
  anim: AnimationType
  call: () => Promise<unknown>
}

const ACTIONS: ActionConfig[] = [
  { label: 'Füttern', emoji: '🍖', anim: 'eating', call: () => api.feed() },
  { label: 'Spielen', emoji: '🎾', anim: 'playing', call: () => api.play() },
  { label: 'Streicheln', emoji: '🤗', anim: 'happy', call: () => api.pet() },
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

  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', justifyContent: 'center' }}>
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          disabled={loading !== null}
          onClick={() => handleAction(action)}
          style={{
            flex: 1,
            padding: '8px 4px',
            background: loading === action.label ? '#4a5568' : '#2d3748',
            color: loading !== null ? '#718096' : '#e0e0e0',
            border: '1px solid #4a5568',
            borderRadius: 8,
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
        >
          {action.emoji} {action.label}
        </button>
      ))}
    </div>
  )
}
