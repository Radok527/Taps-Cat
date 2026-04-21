import { useEffect } from 'react'
import { createWebSocket } from '../ws'
import { useTamiStore } from '../store/useTamiStore'
import { api } from '../api'
import type { WsMessage } from '../types'

export function useWebSocket() {
  const setLiveState = useTamiStore((s) => s.setLiveState)
  const setMessagesLeft = useTamiStore((s) => s.setMessagesLeft)

  useEffect(() => {
    function onMessage(msg: WsMessage) {
      setLiveState({
        hunger: msg.hunger,
        happy: msg.happy,
        lastAction: msg.last_action,
        visitorCount: msg.visitor_count,
        dailyImagesLeft: msg.daily_images_left,
        maintenanceMode: msg.maintenance_mode,
      })
    }

    function onReconnect() {
      api.getState().then((s) => {
        setLiveState({
          hunger: s.hunger,
          happy: s.happy,
          lastAction: s.last_action,
          visitorCount: s.visitor_count,
          dailyImagesLeft: s.images_left,
          maintenanceMode: s.maintenance_mode,
        })
        setMessagesLeft(s.messages_left)
      }).catch(() => {/* ignore */})
    }

    const cleanup = createWebSocket(onMessage, onReconnect)
    return cleanup
  }, [setLiveState, setMessagesLeft])
}
