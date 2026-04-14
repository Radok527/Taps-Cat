import type { AnimationType } from '../types'

// Sprite mapping from actual filenames in src/assets/sprites/
// idle     → seated-on-belly-idle (explicit idle/resting pose)
// happy    → walk-4-frames_east   (active walking = cheerful)
// eating   → eating_east          (explicit eating)
// playing  → walk-4-frames_east   (fallback: no rotation GIF available)
// sleeping → seated-on-belly-idle (belly rest = sleeping, same pose as idle)
// curious  → seated-on-belly-idle (fallback: no angry GIF available)
const SPRITES: Record<AnimationType, string> = {
  idle:     new URL('../assets/sprites/Fur_Short-haired_coat_with_a_brownish-gray_base_co_seated-on-belly-idle_south.gif', import.meta.url).href,
  happy:    new URL('../assets/sprites/Fur_Short-haired_coat_with_a_brownish-gray_base_co_walk-4-frames_east.gif',         import.meta.url).href,
  eating:   new URL('../assets/sprites/Fur_Short-haired_coat_with_a_brownish-gray_base_co_eating_east.gif',                import.meta.url).href,
  playing:  new URL('../assets/sprites/Fur_Short-haired_coat_with_a_brownish-gray_base_co_walk-4-frames_east.gif',         import.meta.url).href,
  sleeping: new URL('../assets/sprites/Fur_Short-haired_coat_with_a_brownish-gray_base_co_seated-on-belly-idle_south.gif', import.meta.url).href,
  curious:  new URL('../assets/sprites/Fur_Short-haired_coat_with_a_brownish-gray_base_co_seated-on-belly-idle_south.gif', import.meta.url).href,
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
