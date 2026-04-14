import { useTamiStore } from '../store/useTamiStore'

export function VisitorCount() {
  const visitorCount = useTamiStore((s) => s.visitorCount)

  return (
    <div style={{
      position: 'absolute',
      top: 6,
      right: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11,
      color: 'var(--accent)',
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--accent)',
        animation: 'pulse 2s ease-in-out infinite',
        flexShrink: 0,
      }} />
      {visitorCount} online
    </div>
  )
}
