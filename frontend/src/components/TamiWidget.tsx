import { useEffect } from 'react'
import { api } from '../api'
import { useTamiStore } from '../store/useTamiStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { CatCanvas } from './CatCanvas'
import { StatsBar } from './StatsBar'
import { ActionButtons } from './ActionButtons'
import { ChatBox } from './ChatBox'
import { GuestbookPanel } from './GuestbookPanel'
import { Leaderboard } from './Leaderboard'
import { ChallengeSuccess } from './ChallengeSuccess'

export function TamiWidget() {
  const setLiveState = useTamiStore((s) => s.setLiveState)
  const setMessagesLeft = useTamiStore((s) => s.setMessagesLeft)

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

  // Wire up WebSocket
  useWebSocket()

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
        background: '#16213e',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CatCanvas />
      <StatsBar />
      <ActionButtons />
      <ChatBox />
      <GuestbookPanel />
      <Leaderboard />
      <ChallengeSuccess />
    </div>
  )
}
