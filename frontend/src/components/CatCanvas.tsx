import { useRef } from 'react'
import { CatSprite } from './CatSprite'
import { VisitorCount } from './VisitorCount'
import { StatsBar } from './StatsBar'
import { useMouseTracker } from '../hooks/useMouseTracker'
import { useAnimationState } from '../hooks/useAnimationState'

export function CatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const facingLeft = useMouseTracker(containerRef)
  const animation = useAnimationState()

  return (
    <div
      ref={containerRef}
      style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        position: 'relative',
        borderRight: '1px solid var(--border)',
      }}
    >
      <VisitorCount />
      <CatSprite animation={animation} facingLeft={facingLeft} />
      <StatsBar />
    </div>
  )
}
