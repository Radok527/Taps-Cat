import { useState, useEffect, useRef } from 'react'

/**
 * Tracks mouse/touch position relative to the cat canvas element.
 * Returns facingLeft = true when cursor is to the left of the container's center.
 */
export function useMouseTracker(containerRef: React.RefObject<HTMLElement | null>): boolean {
  const [facingLeft, setFacingLeft] = useState(false)
  const centerXRef = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function updateCenter() {
      const rect = el!.getBoundingClientRect()
      centerXRef.current = rect.left + rect.width / 2
    }

    function handleMove(clientX: number) {
      setFacingLeft(clientX < centerXRef.current)
    }

    function onMouseMove(e: MouseEvent) {
      handleMove(e.clientX)
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX)
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

  return facingLeft
}
