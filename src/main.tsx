import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
createRoot(document.getElementById('root')!).render(<App />)
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller; let busy = false
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !busy) { busy = true; location.reload() } })
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(reg => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update() })
    setInterval(() => reg.update(), 5 * 60 * 1000)
  }).catch(() => {}))
}
