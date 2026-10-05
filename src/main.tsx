import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGame } from './game/store'
import { initSound } from './game/sound'

initSound()

// 개발 중 콘솔 디버깅용: window.__game.getState()
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
