import { useEffect, useState } from 'react'
const B = import.meta.env.BASE_URL
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(B + 'data/' + p); if (!r.ok) throw new Error(p); return r.json() }
const ls = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem('sd:' + k); return v ? JSON.parse(v) : d } catch { return d } }
const useLS = <T,>(k: string, d: T) => { const [v, s] = useState<T>(() => ls(k, d)); useEffect(() => { localStorage.setItem('sd:' + k, JSON.stringify(v)) }, [k, v]); return [v, s] as const }
const save = (name: string, data: unknown) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = name; a.click() }

type Devotion = { id: string; title: string; body: string; categories: string[]; published: boolean; date: string }
type Cat = { id: string; name: string }
type Bible = { meta: { id: string; name: string; language: string; license?: string }; books: { name: string; chapters: string[][] }[] }
type Entry = { id: string; name: string; language: string; path: string }

export const validateBible = (j: any): string | null => {
  if (!j?.meta?.id || !j.meta.name || !j.meta.language) return 'meta needs id, name, language'
  if (!Array.isArray(j.books) || !j.books.length) return 'books must be a non-empty array'
  for (const b of j.books) if (!b.name || !Array.isArray(b.chapters) || b.chapters.some((c: any) => !Array.isArray(c) || c.some((v: any) => typeof v !== 'string'))) return `invalid book: ${b.name}`
  return null
}

const useHash = () => { const [h, s] = useState(location.hash.slice(2) || ''); useEffect(() => { const f = () => s(location.hash.slice(2)); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, []); return h }
const card = 'rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800'
const btn = 'rounded-lg bg-violet-600 text-white px-3 py-1.5 text-sm'

function Bible({ settings }: { settings: any }) {
  const [idx, setIdx] = useState<Entry[]>([]); const [tid, setTid] = useState(settings.translation); const [bible, setBible] = useState<Bible | null>(null)
  const [bi, setBi] = useState(0); const [ci, setCi] = useState(0); const [q, setQ] = useState('')
  const [marks, setMarks] = useLS<Record<string, { color?: string; note?: string; bookmark?: boolean }>>('marks', {})
  const [custom] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Entry[]>('bibles/index.json').then(setIdx).catch(() => {}) }, [])
  useEffect(() => { const c = custom.find(b => b.meta.id === tid); if (c) return setBible(c); const e = idx.find(x => x.id === tid) || idx[0]; if (e) get<Bible>('bibles/' + e.path).then(setBible).catch(() => setBible(null)) }, [tid, idx, custom])
  if (!bible) return <p>Loading Bible… (no translation available yet — import one in Admin)</p>
  const book = bible.books[bi] ?? bible.books[0]; const verses = book.chapters[ci] ?? []
  const hits = q.length > 2 ? bible.books.flatMap(b => b.chapters.flatMap((c, i) => c.map((t, v) => ({ b: b.name, i, v, t })))).filter(x => x.t.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : []
  const key = (v: number) => `${bible.meta.id}|${book.name}|${ci}|${v}`
  const set = (v: number, p: object) => setMarks({ ...marks, [key(v)]: { ...marks[key(v)], ...p } })
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <select className={card} value={bible.meta.id} onChange={e => setTid(e.target.value)}>{[...idx, ...custom.map(c => ({ id: c.meta.id, name: c.meta.name + ' (imported)' }))].map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      <select className={card} value={bi} onChange={e => { setBi(+e.target.value); setCi(0) }}>{bible.books.map((b, i) => <option key={i} value={i}>{b.name}</option>)}</select>
      <select className={card} value={ci} onChange={e => setCi(+e.target.value)}>{book.chapters.map((_, i) => <option key={i} value={i}>Chapter {i + 1}</option>)}</select>
    </div>
    <input className={card + ' w-full'} placeholder="Search this translation…" value={q} onChange={e => setQ(e.target.value)} />
    {hits.map((h, k) => <p key={k} className="text-sm">{h.b} {h.i + 1}:{h.v + 1} — {h.t}</p>)}
    <div style={{ fontSize: settings.font }} className="space-y-2">{verses.map((t, v) => { const m = marks[key(v)] || {}; return <p key={v} style={{ background: m.color }} className="rounded px-1">
      <sup className="mr-1">{v + 1}</sup>{t} <button title="bookmark" onClick={() => set(v, { bookmark: !m.bookmark })}>{m.bookmark ? '★' : '☆'}</button>{' '}
      {['#fde68a', '#bbf7d0', '#bfdbfe', undefined].map((c, i) => <button key={i} onClick={() => set(v, { color: c })} className="inline-block w-3 h-3 rounded-full border ml-1" style={{ background: c || 'transparent' }} />)}
      <button className="ml-2 text-xs" onClick={() => { const n = prompt('Note', m.note || ''); if (n !== null) set(v, { note: n }) }}>✎</button>{m.note && <em className="block text-xs opacity-70">{m.note}</em>}</p> })}</div></div>
}

function Devotions() {
  const [d, setD] = useState<Devotion[]>([]); const [local] = useLS<Devotion[] | null>('draftDevotions', null)
  useEffect(() => { get<Devotion[]>('devotions/devotions.json').then(setD).catch(() => {}) }, [])
  return <div className="space-y-3">{d.filter(x => x.published).map(x => <article key={x.id} className={card}><h3 className="font-semibold">{x.title}</h3><p className="whitespace-pre-wrap">{x.body}</p></article>)}{local && <p className="text-xs opacity-60">Admin drafts exist on this device and are not shown to readers until published via GitHub.</p>}</div>
}

function Admin() {
  const [d, setD] = useLS<Devotion[] | null>('draftDevotions', null); const [cats, setCats] = useLS<Cat[] | null>('draftCats', null)
  const [cb, setCb] = useLS<Bible[]>('customBibles', []); const [msg, setMsg] = useState('')
  useEffect(() => { if (!d) get<Devotion[]>('devotions/devotions.json').then(setD); if (!cats) get<Cat[]>('devotions/categories.json').then(setCats) }, [])
  if (!d || !cats) return <p>Loading…</p>
  const up = (i: number, p: Partial<Devotion>) => setD(d.map((x, k) => k === i ? { ...x, ...p } : x))
  const [msg2, setMsg2] = useState('')
  const importDev = async (f: File) => { try { const j = JSON.parse(await f.text()); if (!Array.isArray(j) || j.some((x: any) => !x.id || !x.title || typeof x.body !== 'string')) return setMsg2('Invalid file: it must be a list where every devotion has id, title and body'); setD(j.map((x: any) => ({ categories: [], published: false, date: new Date().toISOString().slice(0, 10), ...x }))); setMsg2(`Loaded ${j.length} devotions. Edit them below, then click Export devotions.json.`) } catch { setMsg2('This is not a valid JSON file') } }
  const importBible = async (f: File) => { try { const j = JSON.parse(await f.text()); const e = validateBible(j); if (e) return setMsg('Invalid: ' + e); setCb([...cb.filter(b => b.meta.id !== j.meta.id), j]); setMsg(`Imported ${j.meta.name} (${j.meta.language}, ${j.books.length} books). Use Export to place it in public/data/bibles/.`) } catch { setMsg('Not valid JSON') } }
  return <div className="space-y-4">
    <p className="text-xs">Local content tool only — not secure authentication. Drafts live in this browser. Export, then upload the files to GitHub (see README).</p>
    <section className="space-y-2"><h2 className="font-bold">Devotions</h2>
      {d.map((x, i) => <div key={x.id} className={card + ' space-y-1'}>
        <input className="w-full border rounded px-2" value={x.title} onChange={e => up(i, { title: e.target.value })} />
        <textarea className="w-full border rounded px-2" rows={3} value={x.body} onChange={e => up(i, { body: e.target.value })} />
        <div className="flex flex-wrap gap-2 text-sm">{cats.map(c => <label key={c.id}><input type="checkbox" checked={x.categories.includes(c.id)} onChange={e => up(i, { categories: e.target.checked ? [...x.categories, c.id] : x.categories.filter(k => k !== c.id) })} /> {c.name}</label>)}
          <label><input type="checkbox" checked={x.published} onChange={e => up(i, { published: e.target.checked })} /> Published</label>
          <button onClick={() => confirm('Delete?') && setD(d.filter((_, k) => k !== i))}>🗑</button></div></div>)}
      <button className={btn} onClick={() => setD([...d, { id: 'd' + Date.now(), title: 'New devotion', body: '', categories: [], published: false, date: new Date().toISOString().slice(0, 10) }])}>+ Devotion</button>
      <button className={btn} onClick={() => save('devotions.json', d)}>Export devotions.json</button>
      <label className="block text-sm">Import devotions.json <input type="file" accept=".json" onChange={e => e.target.files?.[0] && importDev(e.target.files[0])} /></label>{msg2 && <p className="text-sm">{msg2}</p>}</section>
    <section className="space-y-2"><h2 className="font-bold">Categories</h2>
      {cats.map((c, i) => <div key={c.id} className="flex gap-2"><input className="border rounded px-2" value={c.name} onChange={e => setCats(cats.map((x, k) => k === i ? { ...x, name: e.target.value } : x))} /><button onClick={() => setCats(cats.filter((_, k) => k !== i))}>🗑</button></div>)}
      <button className={btn} onClick={() => setCats([...cats, { id: 'c' + Date.now(), name: 'New category' }])}>+ Category</button>
      <button className={btn} onClick={() => save('categories.json', cats)}>Export categories.json</button></section>
    <section className="space-y-2"><h2 className="font-bold">Import Bible JSON</h2>
      <input type="file" accept=".json" onChange={e => e.target.files?.[0] && importBible(e.target.files[0])} />{msg && <p className="text-sm">{msg}</p>}
      {cb.map(b => <div key={b.meta.id} className="text-sm">{b.meta.name} · {b.meta.language} · {b.meta.license || 'license not stated'} <button onClick={() => save(b.meta.id + '.json', b)}>Export</button></div>)}</section></div>
}

export default function App() {
  const route = useHash(); const [name, setName] = useLS('name', ''); const [settings, setSettings] = useLS('settings', { translation: 'sample', font: 18, dark: false })
  const [verse, setVerse] = useState<{ ref: string; text: string } | null>(null)
  useEffect(() => { get<any>('daily-verse.json').then(setVerse).catch(() => {}) }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', settings.dark) }, [settings.dark])
  if (!name) return <Welcome onDone={setName} />
  const tab = route.split('/')[0]
  const restore = async (f: File) => { try { const j = JSON.parse(await f.text()); Object.entries(j).forEach(([k, v]) => localStorage.setItem(k, v as string)); location.reload() } catch { alert('Invalid backup') } }
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100"><div className="max-w-2xl mx-auto p-4 space-y-4">
    <header className="flex justify-between items-center"><h1 className="text-xl font-bold text-violet-600">Salem Daily</h1>
      <nav className="flex gap-3 text-sm">{[['', 'Home'], ['bible', 'Bible'], ['devotions', 'Devotions'], ['settings', 'Settings']].map(([r, l]) => <a key={r} href={'#/' + r} className={tab === r ? 'font-bold underline' : ''}>{l}</a>)}</nav></header>
    {tab === '' && <div className="space-y-3"><h2 className="text-lg">Hello, {name}</h2>{verse && <blockquote className={card}>{verse.text}<footer className="text-sm opacity-70">— {verse.ref}</footer></blockquote>}</div>}
    {tab === 'bible' && <Bible settings={settings} />}
    {tab === 'devotions' && <Devotions />}
    {tab === 'admin' && <Admin />}
    {tab === 'settings' && <div className="space-y-3">
      <label className="block">Name <input className="border rounded px-2 text-black" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block">Font size {settings.font}px <input type="range" min={14} max={32} value={settings.font} onChange={e => setSettings({ ...settings, font: +e.target.value })} /></label>
      <label className="block"><input type="checkbox" checked={settings.dark} onChange={e => setSettings({ ...settings, dark: e.target.checked })} /> Dark theme</label>
      <button className={btn} onClick={() => save('salem-daily-backup.json', Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('sd:')).map(k => [k, localStorage.getItem(k)])))}>Download my data</button>
      <label className="block text-sm">Restore backup <input type="file" accept=".json" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} /></label></div>}
  </div></div>
}

function Welcome({ onDone }: { onDone: (n: string) => void }) {
  const [n, setN] = useState('')
  return <div className="min-h-screen grid place-items-center p-6"><div className="max-w-sm w-full space-y-3 text-center"><h1 className="text-3xl font-bold text-violet-600">Salem Daily</h1><p>What should we call you? Your name stays on this device.</p>
    <input className="border rounded px-3 py-2 w-full" value={n} onChange={e => setN(e.target.value)} placeholder="Your name" /><button className={btn} disabled={!n.trim()} onClick={() => onDone(n.trim())}>Continue</button></div></div>
}
