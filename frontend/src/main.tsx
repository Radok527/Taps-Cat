import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { TamiWidget } from './components/TamiWidget'

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    <TamiWidget />
  </StrictMode>,
)
