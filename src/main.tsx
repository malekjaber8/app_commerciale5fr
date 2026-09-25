import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Application installable (tablette / telephone) : uniquement pour la version web, pas pour l'application bureau
if (import.meta.env.PROD && import.meta.env.VITE_DESKTOP !== '1' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* installation impossible : sans consequence */ }) })
}
