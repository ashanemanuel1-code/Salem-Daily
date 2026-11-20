import { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const heal = async () => { try { const rs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((rs || []).map(r => r.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))) } catch { /* ignore */ } location.reload() }

class Boundary extends Component<{ children: ReactNode }, { err: string }> {
  state = { err: '' }
  static getDerivedStateFromError(e: unknown) { return { err: String((e as Error)?.message || e) } }
  componentDidCatch() { if (!sessionStorage.getItem('sd-healed')) { sessionStorage.setItem('sd-healed', '1'); heal() } }
  render() {
    if (!this.state.err) return this.props.children
    const b: React.CSSProperties = { background: '#d4a017', color: '#1a1200', borderRadius: 10, padding: '8px 16px', fontWeight: 700, margin: 6, border: 0 }
    return <div style={{ minHeight: '100vh', background: '#0b0b0f', color: '#fdf3d0', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#d4a017' }}>Something went wrong on this page</h2>
      <p>Your data is safe. The app is repairing itself. If this page stays, tap Repair and reload.</p>
      <button style={b} onClick={() => { location.hash = '#/'; this.setState({ err: '' }) }}>Go to Home</button>
      <button style={b} onClick={() => heal()}>Repair and reload</button>
      <p style={{ fontSize: 11, opacity: 0.6, marginTop: 24 }}>{this.state.err}</p>
    </div>
  }
}

const banner = (msg: string) => { let d = document.getElementById('errbar'); if (!d) { d = document.createElement('div'); d.id = 'errbar'; d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99;background:#7f1d1d;color:#fff;font:12px sans-serif;padding:6px 10px'; d.onclick = () => d!.remove(); document.body.appendChild(d) } d.textContent = 'Error: ' + msg + ' (tap to close)' }
addEventListener('error', e => banner(e.message))
addEventListener('unhandledrejection', e => banner(String((e.reason && e.reason.message) || e.reason)))
createRoot(document.getElementById('root')!).render(<Boundary><App /></Boundary>)
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller; let busy = false
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !busy) { busy = true; location.reload() } })
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(reg => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update() })
    setInterval(() => reg.update(), 5 * 60 * 1000)
  }).catch(() => {}))
}
