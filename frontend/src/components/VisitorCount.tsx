import { useTamiStore } from '../store/useTamiStore'

export function VisitorCount() {
  const visitorCount = useTamiStore((s) => s.visitorCount)

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      background: 'rgba(0,0,0,0.5)',
      color: '#e0e0e0',
      fontSize: 12,
      padding: '2px 8px',
      borderRadius: 12,
      backdropFilter: 'blur(4px)',
    }}>
      👥 {visitorCount}
    </div>
  )
}
