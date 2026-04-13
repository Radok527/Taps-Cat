import { useEffect, useRef, useState } from 'react'
import type { AnimationType } from '../types'

interface Props {
  animation: AnimationType
  facingAngle: number
}

const ANIM_CONFIG: Record<AnimationType, { color: string; label: string }> = {
  idle:     { color: '#e8a87c', label: '(=^･ω･^=)' },
  happy:    { color: '#f9d342', label: '(=^▽^=)' },
  eating:   { color: '#88c057', label: '(=^‥^=)' },
  playing:  { color: '#5ab4e5', label: '(=^●ω●^=)' },
  sleeping: { color: '#a78bfa', label: '(=^-ω-^=)zzz' },
  curious:  { color: '#f87171', label: '(=^･o･^=)?' },
}

const FRAMES = 4

export function CatSprite({ animation, facingAngle }: Props) {
  const [frame, setFrame] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES)
    }, 200)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const { color, label } = ANIM_CONFIG[animation]
  const flipX = Math.cos(facingAngle) < 0 ? -1 : 1
  const frameOffset = frame * 4 // px bounce per frame

  const bounce = animation === 'happy'
    ? [0, -6, -10, -6][frame]
    : animation === 'playing'
    ? [0, -4, 0, 4][frame]
    : animation === 'eating'
    ? [0, 2, 0, -2][frame]
    : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scaleX(${flipX}) translateY(${bounce + frameOffset * 0}px)`,
        transition: 'transform 0.1s ease',
        userSelect: 'none',
      }}
    >
      {/* Cat body — pixel-art placeholder rectangle */}
      <div
        style={{
          width: 80,
          height: 80,
          background: color,
          borderRadius: animation === 'sleeping' ? '50% 50% 40% 40%' : '40% 40% 35% 35%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: '#1a1a2e',
          boxShadow: `0 4px 12px ${color}66`,
          transform: `translateY(${bounce}px)`,
          transition: 'transform 0.1s ease, background 0.3s ease',
          position: 'relative',
        }}
      >
        {/* Ears */}
        <div style={{ position: 'absolute', top: -14, left: 10, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `16px solid ${color}` }} />
        <div style={{ position: 'absolute', top: -14, right: 10, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `16px solid ${color}` }} />
        {/* Face */}
        <span style={{ fontSize: 10, color: '#1a1a2e', fontFamily: 'monospace', whiteSpace: 'nowrap', transform: `scaleX(${flipX})` }}>
          {label}
        </span>
      </div>
    </div>
  )
}
