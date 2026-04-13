import type { AnimationType } from '../types'

// Sprite mapping from actual filenames in src/assets/sprites/
// idle     → seated-on-belly-idle (explicit idle/resting pose)
// happy    → walk-4-frames_east   (active walking = cheerful)
// eating   → eating_east          (explicit eating)
// playing  → rotations_4dir       (multi-direction movement = playful)
// sleeping → seated-on-belly-idle (belly rest = sleeping, same pose as idle)
// curious  → angry_south          (alert/watchful expression)
const SPRITES: Record<AnimationType, string> = {
  idle:     new URL('../assets/sprites/a_wildcat_seated-on-belly-idle_south.gif', import.meta.url).href,
  happy:    new URL('../assets/sprites/a_wildcat_walk-4-frames_east.gif',         import.meta.url).href,
  eating:   new URL('../assets/sprites/a_wildcat_eating_east.gif',                import.meta.url).href,
  playing:  new URL('../assets/sprites/a_wildcat_rotations_4dir.gif',             import.meta.url).href,
  sleeping: new URL('../assets/sprites/a_wildcat_seated-on-belly-idle_south.gif', import.meta.url).href,
  curious:  new URL('../assets/sprites/a_wildcat_angry_south.gif',                import.meta.url).href,
}

interface CatSpriteProps {
  animation: AnimationType
  facingLeft: boolean
}

export function CatSprite({ animation, facingLeft }: CatSpriteProps) {
  return (
    <img
      src={SPRITES[animation]}
      alt={animation}
      style={{
        width: '96px',
        height: '96px',
        imageRendering: 'pixelated',
        transform: facingLeft ? 'scaleX(-1)' : 'none',
        display: 'block',
      }}
    />
  )
}
