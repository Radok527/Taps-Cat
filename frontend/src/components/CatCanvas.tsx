import { useRef } from 'react'
import { CatSprite } from './CatSprite'
import { VisitorCount } from './VisitorCount'
import { useMouseTracker } from '../hooks/useMouseTracker'
import { useAnimationState } from '../hooks/useAnimationState'

export function CatCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const angle = useMouseTracker(containerRef)
  const animation = useAnimationState()

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <CatSprite animation={animation} facingAngle={angle} />
      <VisitorCount />
    </div>
  )
}
