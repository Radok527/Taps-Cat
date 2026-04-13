import { useTamiStore } from '../store/useTamiStore'
import type { AnimationType } from '../types'

export function useAnimationState(): AnimationType {
  const hunger = useTamiStore((s) => s.hunger)
  const happy = useTamiStore((s) => s.happy)
  const currentAnimation = useTamiStore((s) => s.currentAnimation)
  const animationOverrideUntil = useTamiStore((s) => s.animationOverrideUntil)

  if (animationOverrideUntil > Date.now()) {
    return currentAnimation
  }
  if (hunger < 20) return 'sleeping'
  if (happy > 70) return 'happy'
  if (happy < 30) return 'curious'
  return 'idle'
}
