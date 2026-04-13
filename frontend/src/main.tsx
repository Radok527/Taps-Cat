import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TamiWidget } from './components/TamiWidget'

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 12px',
      }}
    >
      <TamiWidget />
    </div>
  </StrictMode>,
)
