import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
const B = import.meta.env.BASE_URL
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(B + 'data/' + p); if (!r.ok) throw new Error(p); return r.json() }
const bibleCache = new Map<string, Promise<Bible>>()
const loadBible = (path: string) => { let p = bibleCache.get(path); if (!p) { p = get<Bible>('bibles/' + path); p.catch(() => bibleCache.delete(path)); bibleCache.set(path, p) } return p }
const arr = (f: any) => (j: unknown) => f(Array.isArray(j) ? j : [])
const ls = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem('sd:' + k); return v ? JSON.parse(v) : d } catch { return d } }
const useLS = <T,>(k: string, d: T) => { const [v, s] = useState<T>(() => ls(k, d)); useEffect(() => { try { localStorage.setItem('sd:' + k, JSON.stringify(v)) } catch { /* storage full */ } }, [k, v]); return [v, s] as const }
const save = (name: string, data: unknown) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = name; a.click() }

type Devotion = { id: string; title: string; body: string; categories: string[]; published: boolean; date: string }
type Cat = { id: string; name: string }
type Bible = { meta: { id: string; name: string; language: string; license?: string }; books: { name: string; chapters: string[][] }[] }
type PRead = { book: string; from: number; to: number; vFrom?: number; vTo?: number }
type PDay = PRead & { title?: string; body?: string; more?: PRead[] }
type Plan = { id: string; title: string; days: PDay[] }
type Entry = { id: string; name: string; language: string; path: string }

export const validateBible = (j: any): string | null => {
  if (!j?.meta?.id || !j.meta.name || !j.meta.language) return 'meta needs id, name, language'
  if (!Array.isArray(j.books) || !j.books.length) return 'books must be a non-empty array'
  for (const b of j.books) if (!b.name || !Array.isArray(b.chapters) || b.chapters.some((c: any) => !Array.isArray(c) || c.some((v: any) => typeof v !== 'string'))) return `invalid book: ${b.name}`
  return null
}

const NAMES: Record<string, string> = Object.fromEntries('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ').map((c, i) => [c, 'Genesis,Exodus,Leviticus,Numbers,Deuteronomy,Joshua,Judges,Ruth,1 Samuel,2 Samuel,1 Kings,2 Kings,1 Chronicles,2 Chronicles,Ezra,Nehemiah,Esther,Job,Psalms,Proverbs,Ecclesiastes,Song of Solomon,Isaiah,Jeremiah,Lamentations,Ezekiel,Daniel,Hosea,Joel,Amos,Obadiah,Jonah,Micah,Nahum,Habakkuk,Zephaniah,Haggai,Zechariah,Malachi,Matthew,Mark,Luke,John,Acts,Romans,1 Corinthians,2 Corinthians,Galatians,Ephesians,Philippians,Colossians,1 Thessalonians,2 Thessalonians,1 Timothy,2 Timothy,Titus,Philemon,Hebrews,James,1 Peter,2 Peter,1 John,2 John,3 John,Jude,Revelation'.split(',')[i]]))
const ICONS: Record<string, string> = {
  '': 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  bible: 'M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5zM4 21.5A2.5 2.5 0 006.5 19H20M12 6v8M9 9h6',
  devotions: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  plans: 'M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18M9 16l2 2 4-4',
  saved: 'M6 3h12v18l-6-4-6 4z',
  ask: 'M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
}
const LANGCODE: Record<string, string> = { english: 'en-US', tamil: 'ta-IN', sinhala: 'si-LK' }
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
let tk = 0
let ntts: any
let nActive = false
const nativeTTS = () => { const c = (window as any).Capacitor; if (!c?.isNativePlatform?.()) return null; if (!ntts) ntts = c.registerPlugin('TextToSpeech'); return ntts }
const speechOK = () => canSpeak || !!nativeTTS()
const langOf = (t: string) => /[\u0B80-\u0BFF]/.test(t) ? 'tamil' : /[\u0D80-\u0DFF]/.test(t) ? 'sinhala' : 'english'
const stopSpeak = () => { tk++; if (nActive) { nActive = false; Promise.resolve(nativeTTS()?.stop?.()).catch(() => {}) } if (canSpeak) speechSynthesis.cancel() }
const speak = (texts: string[], language: string, rate: number, onIdx?: (i: number) => void, onDone?: () => void, onFail?: (m?: string) => void) => {
  if (!texts.length) return
  stopSpeak(); const my = ++tk
  const lang = LANGCODE[language.toLowerCase()] || 'en-US'
  const nt = nativeTTS()
  if (nt) { nActive = true; (async () => { for (let i = 0; i < texts.length; i++) { if (my !== tk) return; onIdx?.(i); try { await nt.speak({ text: texts[i], lang, rate, pitch: 1, volume: 1, category: 'ambient' }) } catch (e: any) { if (my === tk) { nActive = false; onFail?.(String(e?.message || e)) } return } } nActive = false; if (my === tk) onDone?.() })(); return }
  if (!canSpeak) { onFail?.('no speech engine'); return }
  const voice = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang.slice(0, 2)))
  texts.forEach((t, i) => { const u = new SpeechSynthesisUtterance(t); u.lang = lang; u.rate = rate; if (voice) u.voice = voice; u.onstart = () => { if (my === tk) onIdx?.(i) }; u.onerror = e => { if (my === tk && e.error !== 'interrupted' && e.error !== 'canceled') onFail?.(e.error) }; if (i === texts.length - 1) u.onend = () => { if (my === tk) onDone?.() }; speechSynthesis.speak(u) })
}
const BOOK_LIST = Object.values(NAMES)
const parseUsfx = (xml: string): { books: Bible['books'] } | string => {
  const doc = new DOMParser().parseFromString(xml, 'text/xml'); if (doc.querySelector('parsererror')) return 'This is not valid XML'
  const out: Bible['books'] = []
  doc.querySelectorAll('book').forEach(be => {
    const code = be.getAttribute('id') || ''; const chs: string[][] = []; let ch = 0, v = 0
    const walk = (n: Node) => {
      if (n.nodeType === 3) { if (ch > 0 && v > 0) chs[ch - 1][v - 1] = (chs[ch - 1][v - 1] || '') + (n.nodeValue || ''); return }
      if (n.nodeType !== 1) return
      const e = n as Element; const t = e.tagName
      if (t === 'f' || t === 'x' || t === 'fig' || t === 'rq') return
      if (t === 'c') { ch = parseInt(e.getAttribute('id') || '0'); v = 0; while (chs.length < ch) chs.push([]); return }
      if (t === 'v') { v = parseInt(e.getAttribute('id') || '0'); return }
      if (t === 've') { v = 0; return }
      e.childNodes.forEach(c => walk(c))
    }
    be.childNodes.forEach(c => walk(c))
    if (chs.length && NAMES[code]) out.push({ name: NAMES[code], chapters: chs.map(c => Array.from(c, x => (x || '').replace(/\s+/g, ' ').trim())) })
  })
  return out.length ? { books: out } : 'No standard books found - is this a USFX file?'
}

const useHash = () => { const [h, s] = useState(location.hash.slice(2) || ''); useEffect(() => { const f = () => s(location.hash.slice(2)); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, []); return h }
const card = 'sd-card'
const btn = 'sd-btn'

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(<><div className="sheet-back" onClick={onClose} /><div className="sheet"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30" /><h3 className="sd-gold font-bold mb-3">{title}</h3>{children}</div></>, document.body)
}

function BiblePicker({ opts, settings, setSettings, block, compact }: any) {
  const [open, setOpen] = useState(false)
  const cur = opts.find((o: any) => o.id === settings.translation) || opts[0]
  if (!cur) return null
  return <>{compact ? <button className="sd-chip !px-2 !py-1 text-xs" onClick={() => setOpen(true)}>🌐 {cur.language || cur.name} ▾</button> : <button className={'sd-chip flex items-center gap-2' + (block ? ' w-full justify-between' : '')} onClick={() => setOpen(true)}><span>📖 {cur.name}</span><span>▾</span></button>}
    {open && <Sheet title="Choose a Bible" onClose={() => setOpen(false)}>{opts.map((o: any) => <button key={o.id} className={'opt' + (o.id === cur.id ? ' on' : '')} onClick={() => { setSettings({ ...settings, translation: o.id }); setOpen(false) }}>{o.name}{o.language && <span className="block text-xs opacity-70">{o.language}</span>}</button>)}</Sheet>}</>
}

function Bible({ settings, setSettings, opts }: { settings: any; setSettings: any; opts: any[] }) {
  const [idx, setIdx] = useState<Entry[]>([]); const tid: string = settings.translation; const [bible, setBible] = useState<Bible | null>(null)
  const [pick, setPick] = useState(''); const [sel, setSel] = useState<number | null>(null); const [bi, setBi] = useState(0); const [ci, setCi] = useState(0); const [q, setQ] = useState('')
  const [marks, setMarks] = useLS<Record<string, { color?: string; note?: string; bookmark?: boolean }>>('marks', {})
  const [custom] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Entry[]>('bibles/index.json').then(arr(setIdx)).catch(() => {}) }, [])
  useEffect(() => { const c = custom.find(b => b.meta.id === tid); if (c) return setBible(c); const e = idx.find(x => x.id === tid) || idx[0]; if (e) loadBible(e.path).then(setBible).catch(() => setBible(null)) }, [tid, idx, custom])
  const [playing, setPlaying] = useState(false); const [cur, setCur] = useState(-1); const [resume, setResume] = useState(false)
  const [rate, setRate] = useLS<number>('ttsRate', 1); const [auto, setAuto] = useLS<boolean>('ttsAuto', false)
  const stop = () => { stopSpeak(); setPlaying(false); setCur(-1) }
  const advance = () => { if (!bible) return; const b = bible.books[bi]; if (ci + 1 < b.chapters.length) { setCi(ci + 1); setResume(true) } else if (bi + 1 < bible.books.length) { setBi(bi + 1); setCi(0); setResume(true) } }
  const startReading = (vs: string[], off = 0) => { if (!bible) return; setPlaying(true); speak(vs, bible.meta.language, rate, (i: number) => setCur(i + off), () => { setCur(-1); setPlaying(false); if (auto) advance() }, (m) => { setCur(-1); setPlaying(false); alert('Could not play the voice (' + (m || 'unknown') + '). Check that a ' + bible.meta.language + ' voice is installed in your phone settings (Text-to-speech).') }) }
  useEffect(() => { if (!resume || !bible) return; setResume(false); startReading(bible.books[bi]?.chapters[ci] || []) }, [resume])
  useEffect(() => () => stopSpeak(), [])
  useEffect(() => { if (!bible) return; const g = ls<any>('goto', null); if (g) { const k = bible.books.findIndex(b => b.name === g.book); if (k >= 0) { setBi(k); setCi(g.ch - 1) } localStorage.removeItem('sd:goto') } }, [bible])
  if (!bible) return <p>Loading Bible… (no translation available yet — import one in Admin)</p>
  const book = bible.books[bi] ?? bible.books[0]; const verses = book.chapters[ci] ?? []; const play = () => startReading(verses); const playFrom = (n: number) => startReading(verses.slice(n), n)
  const hits = q.length > 2 ? bible.books.flatMap(b => b.chapters.flatMap((c, i) => c.map((t, v) => ({ b: b.name, i, v, t })))).filter(x => x.t.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : []
  const key = (v: number) => `${bible.meta.id}|${book.name}|${ci}|${v}`
  const set = (v: number, p: object) => setMarks({ ...marks, [key(v)]: { ...marks[key(v)], ...p } })
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">

      <button className="sd-chip" onClick={() => setPick('book')}>{book.name} ▾</button><button className="sd-chip" onClick={() => setPick('ch')}>Chapter {ci + 1} ▾</button><span className="ml-auto"><BiblePicker compact opts={opts} settings={settings} setSettings={setSettings} /></span>
      {pick === 'book' && <Sheet title="Choose a book" onClose={() => setPick('')}>{(bible.books.length === 66 ? [['Old Testament', 0, 39], ['New Testament', 39, 66]] : [['Books', 0, bible.books.length]]).map(([t, a, z]: any) => <div key={t}><h4 className="text-xs uppercase opacity-60 mb-2">{t}</h4><div className="grid grid-cols-2 gap-2 mb-4">{bible.books.slice(a, z).map((b, k) => <button key={a + k} className={'opt !mb-0' + (a + k === bi ? ' on' : '')} onClick={() => { stop(); setBi(a + k); setCi(0); setPick('') }}>{b.name}</button>)}</div></div>)}</Sheet>}
      {pick === 'ch' && <Sheet title={book.name} onClose={() => setPick('')}><div className="grid grid-cols-5 gap-2">{book.chapters.map((_, i) => <button key={i} className={'opt !mb-0 text-center' + (i === ci ? ' on' : '')} onClick={() => { stop(); setCi(i); setPick('') }}>{i + 1}</button>)}</div></Sheet>}
    </div>
    <input className={card + ' w-full'} placeholder="Search this translation…" value={q} onChange={e => setQ(e.target.value)} />
    {hits.map((h, k) => <p key={k} className="text-sm">{h.b} {h.i + 1}:{h.v + 1} — {h.t}</p>)}
    {!speechOK() && <p className="text-xs opacity-60">🔇 Voice reading is not available on this device.</p>}
    {speechOK() && <div className="flex flex-wrap items-center gap-2"><button className="sd-btn" onClick={playing ? stop : play}>{playing ? '■ Stop' : '▶ Listen'}</button>{[0.8, 1, 1.25].map(r => <button key={r} className={'sd-chip' + (rate === r ? ' on' : '')} onClick={() => setRate(r)}>{r}×</button>)}<label className="text-xs flex items-center gap-1"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />Next chapter</label><span className="text-xs opacity-50">{nativeTTS() ? 'phone voice' : 'browser voice'}</span></div>}
    {speechOK() && bible.meta.language.toLowerCase() !== 'english' && <p className="text-xs opacity-60">Listening needs a {bible.meta.language} voice installed on your phone (Settings → Text-to-speech).</p>}
    <div style={readerStyle(settings)} className="space-y-2">{verses.map((t, v) => { const m = marks[key(v)] || {}; return <p key={v} ref={el => { if (el && cur === v) el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }} onClick={() => setSel(v)} style={{ background: cur === v ? 'color-mix(in srgb, var(--gold) 28%, transparent)' : m.color ? m.color + '55' : undefined, cursor: 'pointer' }} className="rounded px-1 transition-colors">
      {settings.vnums && <sup className="mr-1">{v + 1}</sup>}{t}{m.bookmark && <span className="sd-gold"> ★</span>}{m.note && <span className="opacity-70"> ✎</span>}</p> })}
      <p className="text-xs opacity-60 pt-2">{bible.meta.name}{bible.meta.license ? ' · ' + bible.meta.license : ''}</p>
      {sel !== null && verses[sel] !== undefined && (() => { const m = marks[key(sel)] || {}; const ref = `${book.name} ${ci + 1}:${sel + 1}`; return <Sheet title={ref} onClose={() => setSel(null)}>
        <p className="mb-3 text-sm opacity-80">{verses[sel]}</p>
        <div className="flex gap-3 items-center mb-3 flex-wrap">{['#fde047', '#86efac', '#7dd3fc', '#f9a8d4', '#fdba74'].map(c => <button key={c} aria-label="highlight" className="w-9 h-9 rounded-full grid place-items-center text-black text-sm" style={{ background: c }} onClick={() => set(sel, { color: m.color === c ? undefined : c })}>{m.color === c ? '✓' : ''}</button>)}{m.color && <button className="sd-chip" onClick={() => set(sel, { color: undefined })}>Remove</button>}</div>
        <div className="flex gap-2 flex-wrap mb-3"><button className="sd-chip" onClick={() => set(sel, { bookmark: !m.bookmark })}>{m.bookmark ? '★ Bookmarked' : '☆ Bookmark'}</button>{speechOK() && <button className="sd-chip" onClick={() => { const n = sel; setSel(null); stop(); playFrom(n) }}>▶ Read from here</button>}{speechOK() && <button className="sd-chip" onClick={() => { setSel(null); stop(); speak([verses[sel]], bible.meta.language, rate) }}>🔊 This verse</button>}<button className="sd-chip" onClick={() => navigator.clipboard?.writeText(`${ref} — ${verses[sel]}`)}>📋 Copy</button>{typeof navigator.share === 'function' && <button className="sd-chip" onClick={() => navigator.share({ text: `${ref} — ${verses[sel]}` }).catch(() => {})}>↗ Share</button>}</div>
        <textarea className="w-full rounded-lg p-2" rows={3} placeholder="Add a note…" value={m.note || ''} onChange={e => set(sel, { note: e.target.value })} /></Sheet> })()}</div></div>
}

function Plans({ settings }: { settings: any }) {
  const [plans, setPlans] = useState<Plan[]>([]); const [sel, setSel] = useState(''); const [open, setOpen] = useState<number | null>(null); const [sw, setSw] = useState(false)
  const [items, setItems] = useLS<string[]>('planItems', []); const [talk, setTalk] = useState(''); const [rate] = useLS<number>('ttsRate', 1)
  useEffect(() => () => stopSpeak(), [])
  const [idx, setIdx] = useState<Entry[]>([]); const [bible, setBible] = useState<Bible | null>(null); const [custom] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Plan[]>('plans/plans.json').then(arr(setPlans)).catch(() => {}); get<Entry[]>('bibles/index.json').then(arr(setIdx)).catch(() => {}) }, [])
  useEffect(() => { const c = custom.find(b => b.meta.id === settings.translation); if (c) { setBible(c); return } const e = idx.find(x => x.id === settings.translation) || idx[0]; if (e) loadBible(e.path).then(setBible).catch(() => setBible(null)) }, [idx, custom, settings.translation])
  const refOf = (r: PRead) => `${r.book} ${r.from}${r.vFrom ? ':' + r.vFrom + (r.vTo && r.vTo > r.vFrom ? '–' + r.vTo : '') : r.to > r.from ? '–' + r.to : ''}`
  const reads = (r: PDay): PRead[] => [r as PRead, ...(r.more || [])].filter(x => x.book)
  const reading = (r: PRead) => { const bk = bible?.books.find(b => b.name.toLowerCase() === r.book.toLowerCase()); if (!bk) return <p className="text-sm">"{r.book}" is not in the selected Bible.</p>
    if (r.vFrom) return <div>{(bk.chapters[r.from - 1] || []).slice(r.vFrom - 1, r.vTo || r.vFrom).map((t, v) => <p key={v}><sup>{r.vFrom! + v}</sup> {t}</p>)}</div>
    return <>{Array.from({ length: Math.max(r.to, r.from) - r.from + 1 }, (_, k) => r.from + k).map(c => <div key={c}>{r.to > r.from && <h4 className="font-semibold">{r.book} {c}</h4>}{(bk.chapters[c - 1] || []).map((t, v) => <p key={v}><sup>{v + 1}</sup> {t}</p>)}</div>)}</> }
  const textsOf = (r: PRead): string[] => { const bk = bible?.books.find(b => b.name.toLowerCase() === r.book.toLowerCase()); if (!bk) return []; if (r.vFrom) return (bk.chapters[r.from - 1] || []).slice(r.vFrom - 1, r.vTo || r.vFrom); return Array.from({ length: Math.max(r.to, r.from) - r.from + 1 }, (_, k) => r.from + k).flatMap(c => bk.chapters[c - 1] || []) }
  const speakDay = (r: PDay, key: string) => { if (talk === key) { stopSpeak(); setTalk(''); return } const texts = [r.title || '', r.body || '', ...reads(r).flatMap(textsOf)].filter(Boolean); setTalk(key); speak(texts, bible?.meta.language || 'english', rate, undefined, () => setTalk(''), (m) => { setTalk(''); alert('Could not play the voice (' + (m || 'unknown') + '). Check that a voice for this language is installed in your phone settings (Text-to-speech).') }) }
  const has = (k: string) => items.includes(k)
  const tick = (k: string) => setItems(has(k) ? items.filter(x => x !== k) : [...items, k])
  const keysOf = (p: Plan, i: number) => { const d = p.days[i]; const ks: string[] = []; if (d.body) ks.push(`${p.id}|${i}|d`); reads(d).forEach((_, k) => ks.push(`${p.id}|${i}|r${k}`)); return ks }
  const dayDone = (p: Plan, i: number) => { const ks = keysOf(p, i); return ks.length > 0 && ks.every(has) }
  const plan = plans.find(p => p.id === sel)
  const bar = (n: number, t: number) => <span className="block h-1 mt-2 rounded bg-white/10"><span className="block h-1 rounded" style={{ width: `${t ? n * 100 / t : 0}%`, background: 'var(--gold)' }} /></span>
  if (!plan) return <div className="space-y-3"><h2 className="font-bold">Reading plans</h2>{!plans.length && <p>No plans yet.</p>}{plans.map(p => { const n = p.days.filter((_, i) => dayDone(p, i)).length
    return <button key={p.id} className={card + ' block w-full text-left'} onClick={() => { setSel(p.id); const nx = p.days.findIndex((_, i) => !dayDone(p, i)); setOpen(nx < 0 ? 0 : nx) }}><b className="sd-gold">{p.title}</b><span className="block text-xs opacity-70">{n >= p.days.length ? '✓ Completed' : n ? `Continue · Day ${p.days.findIndex((_, i) => !dayDone(p, i)) + 1}` : 'Start plan →'} · {n}/{p.days.length} days</span>{bar(n, p.days.length)}</button> })}</div>
  const nDone = plan.days.filter((_, i) => dayDone(plan, i)).length
  return <div className="space-y-3"><div className="flex justify-between items-center"><button className="text-sm underline" onClick={() => setSel('')}>← All plans</button><button className="sd-chip" onClick={() => setSw(true)}>⇄ Switch plan</button></div>
    {sw && <Sheet title="Choose a plan" onClose={() => setSw(false)}>{plans.map(q => <button key={q.id} className={'opt' + (q.id === plan.id ? ' on' : '')} onClick={() => { setSel(q.id); const nx = q.days.findIndex((_, i) => !dayDone(q, i)); setOpen(nx < 0 ? 0 : nx); setSw(false) }}>{q.title}<span className="block text-xs opacity-70">{q.days.filter((_, i) => dayDone(q, i)).length}/{q.days.length} days done</span></button>)}</Sheet>}<h2 className="font-bold">{plan.title}</h2><div className="text-xs opacity-70">{nDone} of {plan.days.length} days done{bar(nDone, plan.days.length)}</div>
    {plan.days.map((r, i) => { const ks = keysOf(plan, i); const got = ks.filter(has).length
      return <div key={i} className={card}><button className="w-full flex justify-between gap-2 text-left" onClick={() => setOpen(open === i ? null : i)}><span>{ks.length > 0 && got === ks.length ? '✓ ' : ''}Day {i + 1}: {r.title || reads(r).map(refOf).join(', ')}</span><span className="text-xs opacity-70 whitespace-nowrap">{got}/{ks.length}</span></button>
        {open === i && <div style={readerStyle(settings)} className="mt-3 space-y-4">{speechOK() && <button className="sd-chip" onClick={() => speakDay(r, `${plan.id}|${i}`)}>{talk === `${plan.id}|${i}` ? '■ Stop' : '🔊 Listen to this day'}</button>}
          {r.body && <section><label className="flex items-center gap-2 font-bold sd-gold"><input type="checkbox" checked={has(`${plan.id}|${i}|d`)} onChange={() => tick(`${plan.id}|${i}|d`)} />Devotion</label><p className="whitespace-pre-wrap mt-1">{r.body}</p></section>}
          {reads(r).map((x, k) => <section key={k}><label className="flex items-center gap-2 font-bold sd-gold"><input type="checkbox" checked={has(`${plan.id}|${i}|r${k}`)} onChange={() => tick(`${plan.id}|${i}|r${k}`)} />{refOf(x)}</label><div className="mt-1 space-y-1">{reading(x)}</div></section>)}</div>}</div> })}</div>
}

function PlanAdmin() {
  const [plans, setPlans] = useLS<Plan[] | null>('draftPlans', null); const [title, setTitle] = useState('Matthew in 30 days'); const [book, setBook] = useState('Matthew'); const [ch, setCh] = useState(28); const [days, setDays] = useState(30); const [m, setM] = useState(''); const [openId, setOpenId] = useState('')
  useEffect(() => { if (!plans) get<Plan[]>('plans/plans.json').then(arr(setPlans)).catch(() => setPlans([])) }, [])
  if (!plans) return null
  const upPlan = (id: string, q: Partial<Plan>) => setPlans(plans.map(x => x.id === id ? { ...x, ...q } : x))
  const upDay = (id: string, i: number, q: Partial<PDay>) => setPlans(plans.map(x => x.id === id ? { ...x, days: x.days.map((d, k) => k === i ? { ...d, ...q } : d) } : x))
  const upRead = (id: string, i: number, k: number, q: Partial<PRead>) => k === 0 ? upDay(id, i, q) : setPlans(plans.map(x => x.id === id ? { ...x, days: x.days.map((d, j) => j === i ? { ...d, more: (d.more || []).map((m2, n) => n === k - 1 ? { ...m2, ...q } : m2) } : d) } : x))
  const addRead = (id: string, i: number) => setPlans(plans.map(x => x.id === id ? { ...x, days: x.days.map((d, j) => j === i ? { ...d, more: [...(d.more || []), { book: '', from: 1, to: 1 }] } : d) } : x))
  const delRead = (id: string, i: number, k: number) => setPlans(plans.map(x => x.id === id ? { ...x, days: x.days.map((d, j) => j === i ? { ...d, more: (d.more || []).filter((_, n) => n !== k - 1) } : d) } : x))
  const createSeries = () => { if (days < 1) return; const id = 'p' + Date.now(); setPlans([...plans, { id, title, days: Array.from({ length: days }, (_, i) => ({ book: '', from: 1, to: 1, title: 'Day ' + (i + 1), body: '' })) }]); setOpenId(id); setM(`Made a ${days}-day devotional series. Fill in each day below.`) }
  const create = () => { const n = Math.min(days, ch); if (n < 1) return setM('Days and chapters must be at least 1')
    const list: PDay[] = Array.from({ length: n }, (_, i) => ({ book, from: Math.floor(i * ch / n) + 1, to: Math.floor((i + 1) * ch / n) }))
    setPlans([...plans, { id: 'p' + Date.now(), title, days: list }]); setM(days > ch ? `Made ${n} days (one chapter minimum per day, so it was limited from ${days}).` : `Made ${n} days.`) }
  return <section className="space-y-2"><h2 className="font-bold">Reading plans</h2><datalist id="books">{BOOK_LIST.map(n => <option key={n} value={n} />)}</datalist>
    <div className="flex flex-wrap items-center gap-2 text-sm"><input className="border rounded px-2" value={title} onChange={e => setTitle(e.target.value)} /><input list="books" className="border rounded px-2 w-32" placeholder="Book" value={book} onChange={e => setBook(e.target.value)} />
      <label>Chapters <input type="number" min={1} className="border rounded px-2 w-16 text-black" value={ch} onChange={e => setCh(+e.target.value)} /></label>
      <label>Days <input type="number" min={1} className="border rounded px-2 w-16 text-black" value={days} onChange={e => setDays(+e.target.value)} /></label></div>
    <button className={btn} onClick={create}>Create reading plan</button> <button className={btn} onClick={createSeries}>Create devotional series</button>{m && <p className="text-sm">{m}</p>}
    {plans.map(p => <div key={p.id} className={card + ' text-sm space-y-2'}><div className="flex gap-2"><input className="flex-1 border rounded px-2" value={p.title} onChange={e => upPlan(p.id, { title: e.target.value })} /><button onClick={() => setOpenId(openId === p.id ? '' : p.id)}>✎ {p.days.length} days</button><button onClick={() => confirm('Delete plan?') && setPlans(plans.filter(x => x.id !== p.id))}>🗑</button></div>
      {openId === p.id && p.days.map((d, i) => <div key={i} className="space-y-1 border-t pt-2"><b>Day {i + 1}</b>
        <input className="w-full border rounded px-2" placeholder="Devotion title" value={d.title || ''} onChange={e => upDay(p.id, i, { title: e.target.value })} />
        <textarea className="w-full border rounded px-2" rows={3} placeholder="Devotion text (leave empty for reading only)" value={d.body || ''} onChange={e => upDay(p.id, i, { body: e.target.value })} />
        {[d as PRead, ...(d.more || [])].map((x, k) => <div key={k} className="flex flex-wrap items-center gap-1"><input list="books" style={x.book && !BOOK_LIST.includes(x.book) ? { outline: '2px solid #f87171' } : undefined} className="border rounded px-2 w-32" placeholder="Book (type a letter)" value={x.book} onChange={e => upRead(p.id, i, k, { book: e.target.value })} />ch <input type="number" min={1} className="border rounded px-1 w-14" value={x.from} onChange={e => upRead(p.id, i, k, { from: +e.target.value, to: Math.max(+e.target.value, x.to) })} />–<input type="number" min={1} className="border rounded px-1 w-14" value={x.to} onChange={e => upRead(p.id, i, k, { to: +e.target.value })} /> verses <input type="number" min={1} className="border rounded px-1 w-14" placeholder="from" value={x.vFrom || ''} onChange={e => upRead(p.id, i, k, { vFrom: +e.target.value || undefined })} />–<input type="number" min={1} className="border rounded px-1 w-14" placeholder="to" value={x.vTo || ''} onChange={e => upRead(p.id, i, k, { vTo: +e.target.value || undefined })} />{k > 0 && <button onClick={() => delRead(p.id, i, k)}>✕</button>}</div>)}
        <button className="underline" onClick={() => addRead(p.id, i)}>+ Add another reading</button></div>)}</div>)}
    <button className={btn} onClick={() => save('plans.json', plans)}>Export plans.json</button></section>
}

function Saved() {
  const [marks, setMarks] = useLS<Record<string, { color?: string; note?: string; bookmark?: boolean }>>('marks', {})
  const [idx, setIdx] = useState<Entry[]>([]); const [bibles, setBibles] = useState<Record<string, Bible>>({}); const [custom] = useLS<Bible[]>('customBibles', []); const [f, setF] = useState('all')
  useEffect(() => { get<Entry[]>('bibles/index.json').then(arr(setIdx)).catch(() => {}) }, [])
  const ids = Array.from(new Set(Object.keys(marks).map(k => k.split('|')[0])))
  useEffect(() => { ids.forEach(id => { const c = custom.find(b => b.meta.id === id); if (c) { setBibles(o => ({ ...o, [id]: c })); return } const e = idx.find(x => x.id === id); if (e) loadBible(e.path).then(b => setBibles(o => ({ ...o, [id]: b }))).catch(() => {}) }) }, [idx, ids.join(',')])
  const items = Object.entries(marks).filter(([, m]) => f === 'all' ? (m.bookmark || m.color || m.note) : f === 'bookmarks' ? m.bookmark : f === 'highlights' ? m.color : m.note)
  return <div className="space-y-3"><h2 className="font-bold">Saved</h2>
    <div className="flex gap-3 text-sm">{['all', 'bookmarks', 'highlights', 'notes'].map(t => <button key={t} className={f === t ? 'font-bold underline' : ''} onClick={() => setF(t)}>{t}</button>)}</div>
    {!items.length && <p className="text-sm opacity-70">Nothing here yet. Use the star, the colored dots or the pencil on a Bible verse.</p>}
    {items.map(([k, m]) => { const [id, bk, ch, v] = k.split('|'); const t = bibles[id]?.books.find(b => b.name === bk)?.chapters[+ch]?.[+v]
      return <div key={k} className={card + ' text-sm'} style={{ borderLeft: m.color ? `6px solid ${m.color}` : undefined }}><b>{m.bookmark ? '★ ' : ''}{bk} {+ch + 1}:{+v + 1}</b> <span className="opacity-60">({id})</span><p>{t || '…'}</p>{m.note && <p className="italic opacity-80">✎ {m.note}</p>}
        <button className="text-xs underline" onClick={() => { const n = { ...marks }; delete n[k]; setMarks(n) }}>Remove</button></div> })}</div>
}

function Devotions() {
  const [d, setD] = useState<Devotion[]>([]); const [local] = useLS<Devotion[] | null>('draftDevotions', null)
  useEffect(() => { get<Devotion[]>('devotions/devotions.json').then(arr(setD)).catch(() => {}) }, [])
  return <div className="space-y-3">{d.filter(x => x && x.published).map((x, n) => <article key={x.id || n} className={card}><h3 className="font-semibold">{x.title}</h3><p className="whitespace-pre-wrap">{x.body}</p></article>)}{local && <p className="text-xs opacity-60">Admin drafts exist on this device and are not shown to readers until published via GitHub.</p>}</div>
}

function Admin() {
  const [d, setD] = useLS<Devotion[] | null>('draftDevotions', null); const [cats, setCats] = useLS<Cat[] | null>('draftCats', null)
  const [cb, setCb] = useLS<Bible[]>('customBibles', []); const [msg, setMsg] = useState('')
  useEffect(() => { if (!d) get<Devotion[]>('devotions/devotions.json').then(arr(setD)); if (!cats) get<Cat[]>('devotions/categories.json').then(arr(setCats)) }, [])
  if (!d || !cats) return <p>Loading…</p>
  const up = (i: number, p: Partial<Devotion>) => setD(d.map((x, k) => k === i ? { ...x, ...p } : x))
  const [msg2, setMsg2] = useState('')
  const importDev = async (f: File) => { try { const j = JSON.parse(await f.text()); if (!Array.isArray(j) || j.some((x: any) => !x.id || !x.title || typeof x.body !== 'string')) return setMsg2('Invalid file: it must be a list where every devotion has id, title and body'); setD(j.map((x: any) => ({ categories: [], published: false, date: new Date().toISOString().slice(0, 10), ...x }))); setMsg2(`Loaded ${j.length} devotions. Edit them below, then click Export devotions.json.`) } catch { setMsg2('This is not a valid JSON file') } }
  const importUsfx = async (f: File) => { const r = parseUsfx(await f.text()); if (typeof r === 'string') return setMsg(r)
    const id = prompt('Short id (letters and numbers, e.g. web)', 'web'); const name = prompt('Translation name', 'World English Bible'); const language = prompt('Language', 'English'); const license = prompt('License', 'Public domain')
    if (!id || !name || !language) return setMsg('Cancelled')
    const j: Bible = { meta: { id, name, language, license: license || '' }, books: r.books }; const e = validateBible(j); if (e) return setMsg('Invalid: ' + e)
    save(id + '.json', j); setMsg(`Converted ${name}: ${j.books.length} books, ${j.books.reduce((a, b) => a + b.chapters.length, 0)} chapters. The file ${id}.json was downloaded - upload it to public/data/bibles on GitHub.`) }
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
      <input type="file" accept=".json" onChange={e => e.target.files?.[0] && importBible(e.target.files[0])} />
      <label className="block text-sm">Convert a USFX/XML Bible (downloads a ready JSON file) <input type="file" accept=".xml" onChange={e => e.target.files?.[0] && importUsfx(e.target.files[0])} /></label>{msg && <p className="text-sm">{msg}</p>}
      {cb.map(b => <div key={b.meta.id} className="text-sm">{b.meta.name} · {b.meta.language} · {b.meta.license || 'license not stated'} <button onClick={() => save(b.meta.id + '.json', b)}>Export</button></div>)}</section><PlanAdmin /></div>
}

const readerStyle = (st: any) => ({ fontSize: st.font, lineHeight: st.spacing, fontFamily: st.serif ? 'Georgia, "Times New Roman", serif' : undefined })

function SettingsPage({ name, setName, settings, setSettings, opts, restore }: any) {
  const up = (p: object) => setSettings({ ...settings, ...p })
  const row = 'flex items-center justify-between gap-3 py-1'
  const chip = (on: boolean) => 'sd-chip' + (on ? ' on' : '')
  return <div className="space-y-4"><h2 className="font-bold">Settings</h2>
    <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">Profile</h3><label className={row}>Your name<input className="rounded-lg px-2 py-1 w-44" value={name} onChange={e => setName(e.target.value)} /></label></div>
    <div className="sd-card space-y-3"><h3 className="sd-gold font-semibold">Appearance</h3>
      <div className="flex gap-2">{[['dark', '🌙 Dark'], ['light', '☀️ Light'], ['auto', '🌓 Auto']].map(([m, l]) => <button key={m} className={chip(settings.mode === m)} onClick={() => up({ mode: m })}>{l}</button>)}</div>
      <div className="flex gap-3 items-center"><span className="text-sm">Accent</span>{['#d4a017', '#38bdf8', '#fb7185', '#4ade80', '#a78bfa'].map(c => <button key={c} aria-label={c} className="w-7 h-7 rounded-full" style={{ background: c, boxShadow: settings.accent === c ? '0 0 0 3px var(--ink)' : 'none' }} onClick={() => up({ accent: c })} />)}</div>
      <label className={row}>Animations<input type="checkbox" checked={settings.motion} onChange={e => up({ motion: e.target.checked })} /></label></div>
    <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">Reading</h3>
      {opts.length > 0 && <div className={row}>Bible<BiblePicker opts={opts} settings={settings} setSettings={setSettings} /></div>}
      <label className={row}>Text size {settings.font}px<input type="range" min={14} max={32} value={settings.font} onChange={e => up({ font: +e.target.value })} /></label>
      <label className={row}>Line spacing<input type="range" min={1.3} max={2.2} step={0.1} value={settings.spacing} onChange={e => up({ spacing: +e.target.value })} /></label>
      <label className={row}>Serif font<input type="checkbox" checked={settings.serif} onChange={e => up({ serif: e.target.checked })} /></label>
      <label className={row}>Show verse numbers<input type="checkbox" checked={settings.vnums} onChange={e => up({ vnums: e.target.checked })} /></label>
      <p className="rounded-lg p-3 border border-white/10" style={readerStyle(settings)}>{settings.vnums && <sup className="mr-1">1</sup>}The LORD is my shepherd; I shall not want.</p><p className="text-xs opacity-60">Voice: {nativeTTS() ? 'phone voice (app)' : canSpeak ? 'browser voice' : 'not available on this device'}</p></div>
    <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">My data</h3><p className="text-xs opacity-70">Everything is saved only on this device.</p>
      <button className="sd-btn" onClick={() => save('salem-daily-backup.json', Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('sd:')).map(k => [k, localStorage.getItem(k)])))}>Download my data</button>
      <label className="block text-sm">Restore backup <input type="file" accept=".json" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} /></label>
      <div className="flex gap-2 flex-wrap"><button className="sd-chip" onClick={() => { if (confirm('Reset all plan progress?')) { localStorage.removeItem('sd:planItems'); location.reload() } }}>Reset plan progress</button>
      <button className="sd-chip" onClick={() => { if (confirm('Erase ALL your saved data on this device?')) { Object.keys(localStorage).filter(k => k.startsWith('sd:')).forEach(k => localStorage.removeItem(k)); location.reload() } }}>Erase all my data</button></div></div>
    <div className="text-center space-y-2"><button className="sd-chip" onClick={async () => { const rs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((rs || []).map(r => r.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); location.reload() }}>↻ Get the latest version now</button><p className="text-xs opacity-60">Salem Daily · the app updates itself whenever new content is published.</p></div></div>
}

const WORDS: [string, string][] = [['FAITH','Believing without seeing'],['GRACE','Unearned favor from God'],['PRAYER','Talking with God'],['SHEPHERD','The Lord is my ...'],['PSALMS','Book of songs'],['MIRACLE','Water into wine was one'],['ANGEL','Messenger from heaven'],['DAVID','Shepherd boy who became king'],['MOSES','Led Israel out of Egypt'],['NOAH','Built an ark'],['JONAH','Swallowed by a great fish'],['SAVIOR','Jesus is our ...'],['COVENANT','A sacred promise'],['PROPHET','Speaks for God'],['DISCIPLE','Follower of Jesus'],['GENESIS','First book of the Bible'],['REVELATION','Last book of the Bible'],['MERCY','Compassion for the undeserving'],['EASTER','Celebrates the resurrection'],['BETHLEHEM','Birthplace of Jesus'],['TRUTH','The way, the ___ and the life'],['PEACE','Love, joy, ___'],['SABBATH','Day of rest'],['ESTHER','Queen who saved her people']]
function Games() {
  const pick = () => Math.floor(Math.random() * WORDS.length)
  const scramble = (w: string) => { let r = w; for (let k = 0; k < 9 && r === w; k++) r = w.split('').sort(() => Math.random() - 0.5).join(''); return r }
  const [i, setI] = useState(pick); const [sc, setSc] = useState(() => scramble(WORDS[i][0])); const [g, setG] = useState(''); const [msg, setMsg] = useState(''); const [score, setScore] = useLS<number>('gameScore', 0)
  const next = () => { const n = pick(); setI(n); setSc(scramble(WORDS[n][0])); setG(''); setMsg('') }
  const check = () => { if (g.trim().toUpperCase() === WORDS[i][0]) { setScore(score + 10); setMsg('✓ Correct! +10'); setTimeout(next, 900) } else setMsg('Not quite, try again') }
  return <div className="space-y-4 text-center"><h2 className="font-bold sd-gold">Word Scramble</h2><p className="text-sm opacity-70">Score: {score}</p>
    <div className="sd-card space-y-3"><p className="text-sm">Hint: {WORDS[i][1]}</p><div className="flex flex-wrap justify-center gap-2">{sc.split('').map((c, k) => <span key={k} className="sd-chip on text-lg">{c}</span>)}</div>
      <input className="w-full rounded-lg px-3 py-2 text-center uppercase" value={g} onChange={e => setG(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} placeholder="Your answer" /><p className="h-5 text-sm">{msg}</p>
      <div className="flex gap-2 justify-center"><button className="sd-btn" onClick={check}>Check</button><button className="sd-chip" onClick={next}>Skip</button></div></div></div>
}

const TOPICS: [string, string[], string[]][] = [['Fear', ['fear', 'afraid', 'scared', 'frighten', 'terrif'], ['Isaiah 41:10', 'Psalm 23:4', '2 Timothy 1:7', 'Joshua 1:9', 'Psalm 56:3']], ['Anxiety', ['anxi', 'worry', 'worri', 'stress', 'overwhelm', 'panic'], ['Philippians 4:6-7', '1 Peter 5:7', 'Matthew 6:34', 'Psalm 94:19']], ['Forgiveness', ['forgiv', 'guilt', 'repent', 'shame'], ['1 John 1:9', 'Ephesians 4:32', 'Colossians 3:13', 'Psalm 103:12']], ['Prayer', ['pray'], ['Matthew 6:9-13', 'Philippians 4:6', 'James 5:16', '1 Thessalonians 5:17']], ['Love', ['love'], ['1 Corinthians 13:4-7', 'John 3:16', '1 John 4:7-8', 'Romans 8:38-39']], ['Hope', ['hope', 'future', 'despair'], ['Romans 15:13', 'Jeremiah 29:11', 'Lamentations 3:22-23', 'Psalm 42:11']], ['Faith', ['faith', 'believe', 'doubt', 'trust'], ['Hebrews 11:1', 'Romans 10:17', '2 Corinthians 5:7', 'Mark 9:23']], ['Strength', ['strength', 'strong', 'weak', 'tired', 'weary', 'exhaust'], ['Philippians 4:13', 'Isaiah 40:31', 'Psalm 46:1', 'Nehemiah 8:10']], ['Peace', ['peace', 'calm', 'restless'], ['John 14:27', 'Isaiah 26:3', 'Philippians 4:7', 'Psalm 29:11']], ['Grief', ['grief', 'grieve', 'mourn', 'death', 'died', 'loss', 'sad', 'comfort'], ['Psalm 34:18', 'Matthew 5:4', 'Revelation 21:4', '2 Corinthians 1:3-4']], ['Guidance', ['guid', 'direction', 'decision', 'decide', 'purpose'], ['Proverbs 3:5-6', 'Psalm 119:105', 'Psalm 32:8', 'Isaiah 30:21']], ['Joy', ['joy', 'happy', 'glad', 'rejoice'], ['Philippians 4:4', 'Psalm 16:11', 'John 15:11', 'Nehemiah 8:10']], ['Thanks', ['thank', 'grateful', 'gratitude'], ['1 Thessalonians 5:18', 'Psalm 107:1', 'Colossians 3:17', 'Psalm 100:4']], ['Salvation', ['saved', 'salvation', 'heaven', 'eternal'], ['John 3:16', 'Romans 10:9', 'Ephesians 2:8-9', 'Acts 4:12']], ['Temptation', ['tempt', 'addict', 'lust'], ['1 Corinthians 10:13', 'James 4:7', 'Matthew 26:41', 'Hebrews 4:15-16']], ['Wisdom', ['wisdom', 'wise', 'understanding'], ['James 1:5', 'Proverbs 9:10', 'Proverbs 2:6', 'Proverbs 4:7']], ['Patience', ['patien', 'wait', 'delay'], ['Romans 12:12', 'Psalm 27:14', 'James 5:7-8', 'Galatians 6:9']], ['Courage', ['courage', 'brave', 'bold'], ['Deuteronomy 31:6', 'Psalm 27:1', 'Isaiah 43:1-2', 'Joshua 1:9']], ['Healing', ['heal', 'sick', 'disease'], ['Psalm 147:3', 'Jeremiah 30:17', 'James 5:14-15', 'Isaiah 53:5']], ['Provision', ['provision', 'provide', 'money', 'financ', 'poverty'], ['Philippians 4:19', 'Matthew 6:33', 'Psalm 37:25', 'Psalm 23:1']], ['Loneliness', ['lonel', 'alone', 'abandon', 'forsaken'], ['Deuteronomy 31:8', 'Psalm 68:6', 'Matthew 28:20', 'Hebrews 13:5']], ['Anger', ['anger', 'angry', 'furious', 'rage', 'temper'], ['Ephesians 4:26-27', 'James 1:19-20', 'Proverbs 15:1', 'Psalm 37:8']]]
const norm = (x: string) => x.toLowerCase().replace(/[\s.]/g, '')
const ALIAS: Record<string, string> = { jn: 'john', mt: 'matthew', mk: 'mark', lk: 'luke', ps: 'psalms', gen: 'genesis', ex: 'exodus', rev: 'revelation', song: 'songofsolomon', sos: 'songofsolomon', php: 'philippians', phil: 'philippians' }
const findBook = (b: Bible, raw: string) => { const q = ALIAS[norm(raw)] || norm(raw); return b.books.find(x => norm(x.name) === q) || (q.length >= 3 ? b.books.find(x => norm(x.name).startsWith(q)) : undefined) }
type Hit = { ref: string; book: string; ch: number; text: string }
const parseRef = (b: Bible, q: string): Hit[] => {
  const m = q.trim().match(/^([1-3]?\s*[a-zA-Z][a-zA-Z .]*?)\s*(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/); if (!m) return []
  const bk = findBook(b, m[1]); const ch = +m[2]; const vs = bk?.chapters[ch - 1]; if (!bk || !vs) return []
  if (!m[3]) return [{ ref: `${bk.name} ${ch}`, book: bk.name, ch, text: vs.slice(0, 4).join(' ') + (vs.length > 4 ? ' …' : '') }]
  const from = +m[3]; const to = m[4] ? +m[4] : from; const text = vs.slice(from - 1, to).join(' '); if (!text) return []
  return [{ ref: `${bk.name} ${ch}:${from}${to > from ? '–' + to : ''}`, book: bk.name, ch, text }]
}
function useBible(tr: string) {
  const [idx, setIdx] = useState<Entry[]>([]); const [bible, setBible] = useState<Bible | null>(null); const [custom] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Entry[]>('bibles/index.json').then(arr(setIdx)).catch(() => {}) }, [])
  useEffect(() => { const c = custom.find(b => b.meta.id === tr); if (c) { setBible(c); return } const e = idx.find(x => x.id === tr) || idx[0]; if (e) loadBible(e.path).then(setBible).catch(() => setBible(null)) }, [idx, custom, tr])
  return bible
}
const STOP = new Set(['the', 'and', 'where', 'what', 'who', 'how', 'does', 'say', 'about', 'verse', 'bible', 'find', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'can', 'you'])

function Ask({ settings, theme, opts }: any) {
  const [pref, setPref] = useLS<string>('askBible', '')
  const trId = pref || opts.find((o: any) => /english/i.test(o.language || ''))?.id || settings.translation
  const bible = useBible(trId); const [q, setQ] = useState(''); const [res, setRes] = useState<any>(null); const [more, setMore] = useState(false)
  const open = (it: Hit) => { localStorage.setItem('sd:goto', JSON.stringify({ book: it.book, ch: it.ch })); location.hash = '#/bible' }
  const refs = (list: string[]) => list.flatMap(r => bible ? parseRef(bible, r) : [])
  const wordSearch = (text: string): Hit[] => { if (!bible) return []; const phrase = text.match(/["“](.+?)["”]/)?.[1]?.toLowerCase(); const terms = phrase ? [phrase] : text.toLowerCase().split(/\s+/).filter(t => t.length > 2 && !STOP.has(t)); if (!terms.length) return []
    const rx = terms.map(t => /^[\x00-\x7f]+$/.test(t) ? new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : null)
    const ok = (l: string) => terms.every((t, i) => rx[i] ? rx[i]!.test(l) : l.includes(t))
    const out: Hit[] = []; for (const b of bible.books) for (let c = 0; c < b.chapters.length; c++) for (let v = 0; v < b.chapters[c].length; v++) { const t = b.chapters[c][v]; if (ok(t.toLowerCase())) { out.push({ ref: `${b.name} ${c + 1}:${v + 1}`, book: b.name, ch: c + 1, text: t }); if (out.length >= 60) return out } }
    return out }
  const run = (text: string) => { const t = text.trim(); if (!t || !bible) return; const ql = t.toLowerCase(); setMore(false)
    if (/suicid|kill myself|end my life|want to die|self.?harm|hurt myself/.test(ql)) return setRes({ kind: 'care', sections: [{ title: '', items: refs(['Psalm 34:18', 'Matthew 11:28']) }] })
    const r = parseRef(bible, t); if (r.length) return setRes({ kind: 'ref', sections: [{ title: 'Verse found', items: r }] })
    const tp = TOPICS.find(([, kw]) => kw.some(k => ql.includes(k)))
    const hits = wordSearch(t)
    if (tp) { const key = refs(tp[2]); const seen = new Set(key.map(x => x.ref)); return setRes({ kind: 'topic', sections: [{ title: `Key passages about ${tp[0].toLowerCase()}`, items: key }, { title: `Verses with “${t}”`, items: hits.filter(h => !seen.has(h.ref)) }] }) }
    setRes(hits.length ? { kind: 'search', sections: [{ title: `${hits.length}${hits.length >= 60 ? '+' : ''} verses found`, items: hits }] } : { kind: 'none', sections: [] }) }
  useEffect(() => { if (q.trim() && bible) run(q) }, [bible?.meta.id])
  return <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="font-bold sd-gold">Ask</h2><BiblePicker compact opts={opts} settings={{ translation: trId }} setSettings={(x: any) => setPref(x.translation)} /></div>
    <p className="text-sm opacity-70">Find a verse, search a word, or tell me what you are going through.</p>
    <div className="flex gap-2"><input className="flex-1 rounded-lg px-3 py-2" placeholder="John 3:16, courage, shepherd…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run(q)} /><button className="sd-btn" onClick={() => run(q)}>Search</button></div>
    <div className="flex flex-wrap gap-2">{TOPICS.map(([l]) => <button key={l} className="sd-chip" onClick={() => { setQ(l); run(l) }}>{l}</button>)}</div>
    {bible && !/english/i.test(bible.meta.language) && <p className="text-xs opacity-70">Tip: word search matches the words of this Bible. Switch to English (top right) to search English words.</p>}
    {!bible && <p className="text-sm">Loading the Bible…</p>}
    {res?.kind === 'care' && <div className="sd-card space-y-2"><p>I am sorry you are hurting. You matter, and you do not have to carry this alone. Please reach out right now to someone you trust, such as a pastor, a family member or a friend. You can also call your local emergency number or a crisis helpline. If you are in immediate danger, call emergency services.</p></div>}
    {res?.sections.map((sec: any, n: number) => sec.items.length > 0 && <div key={n} className="space-y-3">{sec.title && <h3 className="font-semibold">{sec.title} <span className="text-xs opacity-60">({sec.items.length})</span></h3>}
      {(more ? sec.items : sec.items.slice(0, 8)).map((it: Hit, k: number) => <div key={k} className={card + ' space-y-2'}><b className="sd-gold">{it.ref}</b><p style={readerStyle(settings)}>{it.text}</p><div className="flex gap-2"><button className="sd-chip" onClick={() => open(it)}>Open chapter</button><button className="sd-chip" onClick={() => navigator.clipboard?.writeText(`${it.ref} — ${it.text}`)}>Copy</button></div></div>)}</div>)}
    {res?.sections.some((x: any) => x.items.length > 8) && !more && <button className="sd-chip" onClick={() => setMore(true)}>Show all results</button>}
    {res?.kind === 'none' && <p className="text-sm">No match. Try one word, a verse like John 3:16, or one of the topics above.</p>}
    {(theme.contact?.whatsapp || theme.contact?.email) && <div className="sd-card space-y-2"><p className="text-sm">Have a deeper question? Ask your church team.</p><div className="flex gap-2">{theme.contact.whatsapp && <a className="sd-btn" href={`https://wa.me/${theme.contact.whatsapp}?text=${encodeURIComponent(q)}`}>WhatsApp</a>}{theme.contact.email && <a className="sd-chip" href={`mailto:${theme.contact.email}?subject=Question&body=${encodeURIComponent(q)}`}>Email</a>}</div></div>}
    <p className="text-xs opacity-60 text-center">{bible ? bible.meta.name + ' · ' : ''}This helper finds Scripture for you. It does not interpret it. For deeper questions, speak with your pastor.</p></div>
}

function SelReader({ rate }: { rate: number }) {
  const [t, setT] = useState('')
  useEffect(() => { const f = () => setT((getSelection()?.toString() || '').trim()); document.addEventListener('selectionchange', f); return () => document.removeEventListener('selectionchange', f) }, [])
  if (t.length < 2 || !speechOK()) return null
  return createPortal(<button className="sd-btn" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(6.5rem + env(safe-area-inset-bottom))', zIndex: 60 }} onPointerDown={e => { e.preventDefault(); speak([t], langOf(t), rate, undefined, undefined, m => alert('Could not play the voice (' + (m || 'unknown') + ')')) }}>🔊 Read selection</button>, document.body)
}

export default function App() {
  const route = useHash(); const [name, setName] = useLS('name', ''); const [saved, setSettings] = useLS<any>('settings', {}); const settings: any = { translation: 'sample', font: 18, mode: 'dark', accent: '#d4a017', serif: false, spacing: 1.6, vnums: true, motion: true, ...saved }
  const [verse, setVerse] = useState<{ ref: string; text: string } | null>(null); const [ttsRate] = useLS<number>('ttsRate', 1); const [theme, setTheme] = useState<any>({}); const [hi, setHi] = useState(0); const [bl, setBl] = useState<Entry[]>([]); const [cb2] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Entry[]>('bibles/index.json').then(arr(setBl)).catch(() => {}) }, [])
  const opts = [...bl.map(b => ({ id: b.id, name: b.name, language: b.language })), ...cb2.map(c => ({ id: c.meta.id, name: c.meta.name, language: c.meta.language }))]
  const heroList: string[] = ([] as string[]).concat(theme.hero || []); const heroSrc = heroList.length ? heroList[hi % heroList.length] : ''
  useEffect(() => { if (heroList.length < 2) return; const t = setInterval(() => setHi(x => x + 1), 6000); return () => clearInterval(t) }, [heroList.length])
  useEffect(() => { get<any>('theme.json').then(t => { setTheme(t); const r = document.documentElement.style; if (t.bg) r.setProperty('--bg', t.bg) }).catch(() => {}) }, [])
  useEffect(() => { get<any>('daily-verse.json').then(setVerse).catch(() => {}) }, [])
  useEffect(() => { const q = matchMedia('(prefers-color-scheme: dark)'); const f = () => { const m = settings.mode === 'auto' ? (q.matches ? 'dark' : 'light') : settings.mode; document.documentElement.dataset.theme = m; document.querySelector('meta[name=theme-color]')?.setAttribute('content', m === 'dark' ? '#0b0b0f' : '#fbf7ee') }; f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f) }, [settings.mode])
  useEffect(() => { document.documentElement.dataset.motion = settings.motion ? 'on' : 'off' }, [settings.motion])
  useEffect(() => { document.documentElement.style.setProperty('--gold', saved.accent || theme.gold || '#d4a017') }, [saved.accent, theme.gold])
  if (!name) return <Welcome onDone={setName} />
  const tab = route.split('/')[0]
  const restore = async (f: File) => { try { const j = JSON.parse(await f.text()); Object.entries(j).forEach(([k, v]) => localStorage.setItem(k, v as string)); location.reload() } catch { alert('Invalid backup') } }
  return <div className="min-h-screen"><div className="max-w-2xl mx-auto p-4 space-y-4"><SelReader rate={ttsRate} />
    <header className="flex justify-between items-center"><h1 className="text-xl font-bold sd-gold flex items-center gap-2"><img src={B + 'icons/icon.png'} alt="" className="w-9 h-9 rounded-xl glow" />{theme.appName || 'Salem Daily'}</h1>
      <nav className="flex flex-wrap justify-end gap-x-3 text-sm">{[['', 'Home'], ['bible', 'Bible'], ['devotions', 'Devotions'], ['plans', 'Plans'], ['ask', 'Ask'], ['settings', 'Settings']].map(([r, l]) => <a key={r} href={'#/' + r} className={'tab' + (tab === r ? ' active' : '')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[r]} /></svg><span>{l}</span></a>)}</nav></header>
    {tab === 'plans' && opts.length > 1 && <BiblePicker opts={opts} settings={settings} setSettings={setSettings} block />}
    <div key={tab} className="rise space-y-4">
    {tab === '' && <div className="space-y-3">{heroSrc && <div className="overflow-hidden rounded-2xl"><img key={heroSrc} src={B + heroSrc} alt="" className="w-full max-h-64 object-cover kenburns rise" onError={e => (e.currentTarget.style.display = 'none')} /></div>}<h2 className="text-lg rise">Hello, {name}</h2>{theme.tagline && <p className="text-sm opacity-70">{theme.tagline}</p>}{verse && <blockquote className={card + ' rise'} style={{ animationDelay: '.3s' }}>{verse.text}<footer className="text-sm opacity-70">— {verse.ref}</footer></blockquote>}<div className="grid grid-cols-2 gap-3">{[['ask', '🔎', 'Ask & search'], ['bible', '📖', 'Read the Bible'], ['plans', '📅', 'My plans'], ['devotions', '🌅', 'Devotions'], ['games', '🎮', 'Word game'], ['saved', '🔖', 'Saved verses']].map(([r, e, l]) => <a key={r} href={'#/' + r} className="sd-card text-center rise"><div className="text-2xl">{e}</div><div className="text-sm">{l}</div></a>)}</div></div>}
    {tab === 'bible' && <Bible settings={settings} setSettings={setSettings} opts={opts} />}
    {tab === 'devotions' && <Devotions />}
    {tab === 'plans' && <Plans settings={settings} />}
    {tab === 'saved' && <Saved />}
    {tab === 'games' && <Games />}
    {tab === 'ask' && <Ask settings={settings} theme={theme} opts={opts} />}
    {tab === 'admin' && <Admin />}
    {tab === 'settings' && <SettingsPage name={name} setName={setName} settings={settings} setSettings={setSettings} opts={opts} restore={restore} />}
    </div>
  </div></div>
}

function Welcome({ onDone }: { onDone: (n: string) => void }) {
  const [n, setN] = useState('')
  return <div className="min-h-screen grid place-items-center p-6"><div className="max-w-sm w-full space-y-3 text-center"><img src={B + 'icons/icon.png'} alt="" className="w-28 h-28 mx-auto rounded-3xl glow" /><h1 className="text-3xl font-bold sd-gold">Salem Daily</h1><p>What should we call you? Your name stays on this device.</p>
    <input className="border rounded px-3 py-2 w-full" value={n} onChange={e => setN(e.target.value)} placeholder="Your name" /><button className={btn} disabled={!n.trim()} onClick={() => onDone(n.trim())}>Continue</button></div></div>
}
