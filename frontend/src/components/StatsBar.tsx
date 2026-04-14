import { useTamiStore } from '../store/useTamiStore'

function barColor(value: number): string {
  if (value < 20) return 'var(--danger)'
  if (value < 50) return 'var(--warn)'
  return 'var(--accent)'
}

interface BarProps {
  label: string
  value: number
}

function Bar({ label, value }: BarProps) {
  const color = barColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 48, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: 5,
        background: 'var(--bg-tertiary)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.5s ease, background 0.3s ease',
        }} />
      </div>
      <span style={{
        width: 24,
        fontSize: 12,
        color,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {Math.round(value)}
      </span>
    </div>
  )
}

export function StatsBar() {
  const hunger = useTamiStore((s) => s.hunger)
  const happy  = useTamiStore((s) => s.happy)

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Bar label="🍖 Hunger" value={hunger} />
      <Bar label="😸 Mood"   value={happy}  />
    </div>
  )
}
