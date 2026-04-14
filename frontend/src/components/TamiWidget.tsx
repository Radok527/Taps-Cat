import { useEffect, useState } from 'react'
import { api } from '../api'
import { useTamiStore } from '../store/useTamiStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { CatCanvas } from './CatCanvas'
import { ActionButtons } from './ActionButtons'
import { ChatBox } from './ChatBox'
import { GuestbookPanel } from './GuestbookPanel'
import { Leaderboard } from './Leaderboard'
import { ChallengeSuccess } from './ChallengeSuccess'

type Tab = 'guestbook' | 'leaderboard'

export function TamiWidget() {
  const setLiveState = useTamiStore((s) => s.setLiveState)
  const setMessagesLeft = useTamiStore((s) => s.setMessagesLeft)
  const [activeTab, setActiveTab] = useState<Tab>('guestbook')

  // Seed state from REST on mount
  useEffect(() => {
    api.getState().then((s) => {
      setLiveState({
        hunger: s.hunger,
        happy: s.happy,
        lastAction: s.last_action,
        visitorCount: s.visitor_count,
        dailyImagesLeft: s.images_left,
      })
      setMessagesLeft(s.messages_left)
    }).catch(() => {/* ignore */})
  }, [setLiveState, setMessagesLeft])

  // Iframe height auto-resize for portfolio embed
  useEffect(() => {
    const send = () =>
      window.parent.postMessage({ type: 'tami-resize', height: document.body.scrollHeight }, '*')
    const ro = new ResizeObserver(send)
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [])

  // Wire up WebSocket
  useWebSocket()

  return (
    <div style={{
      width: 580,
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      fontFamily: "'Courier New', Courier, monospace",
    }}>
      {/* Top row: cat panel (180px) | right panel (flex) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Left: cat + stats */}
        <CatCanvas />

        {/* Right: action buttons + chat */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ActionButtons />
          <ChatBox />
        </div>
      </div>

      {/* Bottom row: tabs */}
      <div>
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
        }}>
          {(['guestbook', 'leaderboard'] as Tab[]).map((tab) => {
            const active = activeTab === tab
            const label = tab === 'guestbook' ? '📖 Gästebuch' : '🏆 Hacker-Bestenliste'
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: "'Courier New', Courier, monospace",
                  fontWeight: active ? 700 : 400,
                  transition: 'color 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'guestbook' ? <GuestbookPanel /> : <Leaderboard />}
      </div>

      {/* Challenge overlay — absolute, covers entire widget */}
      <ChallengeSuccess />
    </div>
  )
}
