import { useState, useEffect, useRef } from 'react'

export function useMouseTracker(containerRef: React.RefObject<HTMLElement | null>) {
  const [angle, setAngle] = useState(0)
  const centerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function updateCenter() {
      const rect = el!.getBoundingClientRect()
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    }

    function handleMove(e: MouseEvent | Touch) {
      const dx = e.clientX - centerRef.current.x
      const dy = e.clientY - centerRef.current.y
      setAngle(Math.atan2(dy, dx))
    }

    function onMouseMove(e: MouseEvent) {
      handleMove(e)
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) handleMove(e.touches[0])
    }

    updateCenter()
    window.addEventListener('resize', updateCenter)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    return () => {
      window.removeEventListener('resize', updateCenter)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [containerRef])

  return angle
}
