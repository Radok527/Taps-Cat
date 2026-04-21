export function MaintenanceOverlay() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(13, 17, 23, 0.45)',
      overflow: 'hidden',
      zIndex: 10,
    }}>
      {/* Absperrband oben */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '-5%',
        right: '-5%',
        height: 28,
        background: 'repeating-linear-gradient(90deg, #f5c400 0, #f5c400 50px, #111 50px, #111 70px)',
        transform: 'rotate(-3deg)',
        opacity: 0.92,
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }} />
      {/* Absperrband unten */}
      <div style={{
        position: 'absolute',
        top: '58%',
        left: '-5%',
        right: '-5%',
        height: 28,
        background: 'repeating-linear-gradient(90deg, #f5c400 0, #f5c400 50px, #111 50px, #111 70px)',
        transform: 'rotate(2.5deg)',
        opacity: 0.92,
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }} />
      {/* Schild */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg-primary)',
        border: '2px solid #f5c400',
        borderRadius: 5,
        padding: '5px 12px',
        textAlign: 'center',
        boxShadow: '0 0 12px rgba(245,196,0,0.25)',
      }}>
        <div style={{ fontSize: 18 }}>🐱💤</div>
        <div style={{
          fontSize: 10,
          color: '#f5c400',
          fontWeight: 700,
          letterSpacing: 1,
          marginTop: 2,
          fontFamily: "'Courier New', Courier, monospace",
        }}>
          ZURZEIT OFFLINE
        </div>
      </div>
    </div>
  )
}
