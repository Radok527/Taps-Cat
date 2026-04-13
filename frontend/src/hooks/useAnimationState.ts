import { useTamiStore } from '../store/useTamiStore'
import type { AnimationType } from '../types'

const LAST_ACTION_WINDOW_MS = 5000

export function useAnimationState(): AnimationType {
  const hunger = useTamiStore((s) => s.hunger)
  const happy = useTamiStore((s) => s.happy)
  const lastAction = useTamiStore((s) => s.lastAction)
  const lastActionAt = useTamiStore((s) => s.lastActionAt)
  const animationOverride = useTamiStore((s) => s.animationOverride)
  const animationOverrideUntil = useTamiStore((s) => s.animationOverrideUntil)

  if (animationOverrideUntil > Date.now() && animationOverride !== null) {
    return animationOverride
  }

  if (hunger < 20 || happy < 20) return 'sleeping'

  const actionRecent = Date.now() - lastActionAt < LAST_ACTION_WINDOW_MS
  if (actionRecent) {
    if (lastAction === 'feed')  return 'eating'
    if (lastAction === 'play')  return 'playing'
    if (lastAction === 'pet')   return 'happy'
    if (lastAction === 'chat')  return 'curious'
  }

  return 'idle'
}
