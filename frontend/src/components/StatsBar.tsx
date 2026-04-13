import { useTamiStore } from '../store/useTamiStore'

function barColor(value: number): string {
  if (value < 20) return '#ef4444'
  if (value < 30) return '#f97316'
  return '#22c55e'
}

interface BarProps {
  label: string
  value: number
  emoji: string
}

function Bar({ label, value, emoji }: BarProps) {
  const color = barColor(value)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#a0aec0' }}>
        <span>{emoji} {label}</span>
        <span style={{ color }}>{Math.round(value)}%</span>
      </div>
      <div style={{ height: 8, background: '#2d3748', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.5s ease, background 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

export function StatsBar() {
  const hunger = useTamiStore((s) => s.hunger)
  const happy = useTamiStore((s) => s.happy)

  return (
    <div style={{ padding: '0 16px 8px' }}>
      <Bar label="Hunger" value={hunger} emoji="🍖" />
      <Bar label="Stimmung" value={happy} emoji="😸" />
    </div>
  )
}
