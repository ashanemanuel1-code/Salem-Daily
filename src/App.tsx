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
type Plan = { id: string; title: string; category?: string; description?: string; days: PDay[] }
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
  books: 'M4 19.5V5a2 2 0 012-2h13v18H6a2 2 0 01-2-1.5zM8 7h7M8 11h7',
  ask: 'M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
}
const LANGCODE: Record<string, string> = { english: 'en-US', tamil: 'ta-IN', sinhala: 'si-LK' }
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
let tk = 0
let touchX = 0, touchY = 0
let ntts: any
let nActive = false
const nativeTTS = () => { try { const c = (window as any).Capacitor; if (!c?.isNativePlatform?.()) return null; if (c.Plugins?.TextToSpeech) return c.Plugins.TextToSpeech; if (typeof c.registerPlugin === 'function') { if (!ntts) ntts = c.registerPlugin('TextToSpeech'); return ntts } } catch { /* no native voice */ } return null }
const speechOK = () => canSpeak || !!nativeTTS()
const langOf = (t: string) => /[\u0B80-\u0BFF]/.test(t) ? 'tamil' : /[\u0D80-\u0DFF]/.test(t) ? 'sinhala' : 'english'
const stopSpeak = () => { tk++; if (nActive) { nActive = false; Promise.resolve(nativeTTS()?.stop?.()).catch(() => {}) } if (canSpeak) speechSynthesis.cancel() }
const voiceMap = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem('sd:ttsVoices') || '{}') } catch { return {} } }
const rateNow = (d: number) => { try { return Number(JSON.parse(localStorage.getItem('sd:ttsRate') || '')) || d } catch { return d } }
const listVoices = async (l2: string): Promise<string[]> => { try { const nt = nativeTTS(); if (nt) { const r = await nt.getSupportedVoices(); return (r.voices || []).filter((v: any) => (v.lang || '').toLowerCase().startsWith(l2)).map((v: any) => v.name || v.voiceURI) } if (canSpeak) return speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(l2)).map(v => v.name) } catch { /* none */ } return [] }
const FEM = /female|woman|zira|samantha|susan|hazel|karen|moira|tessa|victoria|fiona|vani|kanmani|heera|aria|jenny/i
const MALE = /(^|[^e])male|david|mark|daniel|alex|fred|george|ravi|valluvar|prabhat|guy|james/i
const genderPref = (): string => { try { return JSON.parse(localStorage.getItem('sd:ttsGender') || '"any"') } catch { return 'any' } }
const pickName = (names: string[], g: string) => g === 'f' ? names.find(n => FEM.test(n)) : g === 'm' ? names.find(n => MALE.test(n)) : undefined
const speak = (texts: string[], language: string, rate: number, onIdx?: (i: number) => void, onDone?: () => void, onFail?: (m?: string) => void) => {
  if (!texts.length) return
  stopSpeak(); const my = ++tk; rate = rateNow(rate)
  const lang = LANGCODE[language.toLowerCase()] || 'en-US'; const gd = genderPref()
  const nt = nativeTTS()
  if (nt) { nActive = true; (async () => { let vi: number | undefined; if (gd !== 'any') { try { const r = await nt.getSupportedVoices(); const vs = r.voices || []; const n = pickName(vs.filter((v: any) => (v.lang || '').toLowerCase().startsWith(lang.slice(0, 2))).map((v: any) => v.name || v.voiceURI), gd); if (n) vi = vs.findIndex((v: any) => (v.name || v.voiceURI) === n) } catch { /* default voice */ } }
    for (let i = 0; i < texts.length; i++) { if (my !== tk) return; onIdx?.(i); try { await nt.speak({ text: texts[i], lang, rate, pitch: 1, volume: 1, voice: vi, category: 'ambient' }) } catch (e: any) { if (my === tk) { nActive = false; onFail?.(String(e?.message || e)) } return } } nActive = false; if (my === tk) onDone?.() })(); return }
  if (!canSpeak) { onFail?.('no speech engine'); return }
  const cand = speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang.slice(0, 2))); const pn = pickName(cand.map(v => v.name), gd); const voice = cand.find(v => v.name === pn) || cand[0]
  texts.forEach((t, i) => { const u = new SpeechSynthesisUtterance(t); u.lang = lang; u.rate = rate; if (voice) u.voice = voice; u.onstart = () => { if (my === tk) onIdx?.(i) }; u.onerror = e => { if (my === tk && e.error !== 'interrupted' && e.error !== 'canceled') onFail?.(e.error) }; if (i === texts.length - 1) u.onend = () => { if (my === tk) onDone?.() }; speechSynthesis.speak(u) })
}
const BOOK_LIST = Object.values(NAMES)
let BN: Record<string, string[]> | null = null; let bnP: Promise<void> | null = null
const bnLoad = () => bnP || (bnP = get<Record<string, string[]>>('booknames.json').then(j => { BN = j && typeof j === 'object' ? j : {} }).catch(() => { BN = {} }))
const useBN = () => { const [, f] = useState(0); useEffect(() => { bnLoad().then(() => f(x => x + 1)) }, []) }
const langKey = (language?: string) => { const l = (language || '').toLowerCase(); return l.startsWith('tamil') ? 'ta' : l.startsWith('sinhala') ? 'si' : '' }
const bn = (name: string, language?: string) => { const k = langKey(language); const i = BOOK_LIST.indexOf(name); return (k && BN?.[k]?.[i]) || name }
const refL = (h: { book: string; ref: string }, language?: string) => bn(h.book, language) + h.ref.slice(h.book.length)
const L10N: Record<string, Record<string, string>> = { ta: { ch: 'அதிகாரம்', ot: 'பழைய ஏற்பாடு', nt: 'புதிய ஏற்பாடு', pick: 'புத்தகத்தை தேர்வு' }, si: { ch: 'පරිච්ඡේදය', ot: 'පැරණි ගිවිසුම', nt: 'නව ගිවිසුම', pick: 'පොත තෝරන්න' } }
const t10 = (language: string | undefined, k: string, en: string) => L10N[langKey(language)]?.[k] || en
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

function SpeedPicker({ rate, set }: { rate: number; set: (r: number) => void }) {
  const [o, setO] = useState(false)
  return <><button className="sd-chip !px-2 !py-1 text-xs" onClick={() => setO(true)}>⚡ {rate}× ▾</button>
    {o && <Sheet title="Reading speed" onClose={() => setO(false)}>{[[0.75, 'Slow'], [1, 'Normal'], [1.25, 'Brisk'], [1.5, 'Fast'], [2, 'Very fast']].map(([r, l]) => <button key={r} className={'opt' + (rate === r ? ' on' : '')} onClick={() => { localStorage.setItem('sd:ttsRate', JSON.stringify(r)); set(r as number); setO(false) }}>{r}× · {l}</button>)}</Sheet>}</>
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
  useBN()
  const [playing, setPlaying] = useState(false); const [cur, setCur] = useState(-1); const [resume, setResume] = useState(false)
  const [rate, setRate] = useLS<number>('ttsRate', 1); const [auto, setAuto] = useLS<boolean>('ttsAuto', false)
  const stop = () => { stopSpeak(); setPlaying(false); setCur(-1) }
  const advance = () => { if (!bible) return; const b = bible.books[bi]; if (ci + 1 < b.chapters.length) { setCi(ci + 1); setResume(true) } else if (bi + 1 < bible.books.length) { setBi(bi + 1); setCi(0); setResume(true) } }
  const startReading = (vs: string[], off = 0) => { if (!bible) return; setPlaying(true); speak(vs, bible.meta.language, rate, (i: number) => setCur(i + off), () => { setCur(-1); setPlaying(false); if (auto) advance() }, (m) => { setCur(-1); setPlaying(false); alert('Could not play the voice (' + (m || 'unknown') + '). Check that a ' + bible.meta.language + ' voice is installed in your phone settings (Text-to-speech).') }) }
  useEffect(() => { if (!resume || !bible) return; setResume(false); startReading(bible.books[bi]?.chapters[ci] || []) }, [resume])
  useEffect(() => () => stopSpeak(), [])
  useEffect(() => { if (!bible) return; const g = ls<any>('goto', null); if (g) { const k = bible.books.findIndex(b => b.name === g.book); if (k >= 0) { setBi(k); setCi(g.ch - 1); if (g.v) { setCur(g.v - 1); setTimeout(() => setCur(-1), 4500) } } localStorage.removeItem('sd:goto') } }, [bible])
  if (!bible) return <p>Loading Bible… (no translation available yet — import one in Admin)</p>
  const book = bible.books[bi] ?? bible.books[0]; const verses = book.chapters[ci] ?? []; const lang = bible.meta.language; const play = () => startReading(verses); const playFrom = (n: number) => startReading(verses.slice(n), n); const changeRate = (r: number) => { setRate(r); localStorage.setItem('sd:ttsRate', JSON.stringify(r)); if (playing) { const from = Math.max(cur, 0); startReading(verses.slice(from), from) } }
  const hits = q.length > 2 ? bible.books.flatMap(b => b.chapters.flatMap((c, i) => c.map((t, v) => ({ b: b.name, i, v, t })))).filter(x => x.t.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : []
  const key = (v: number) => `${bible.meta.id}|${book.name}|${ci}|${v}`
  const set = (v: number, p: object) => setMarks({ ...marks, [key(v)]: { ...marks[key(v)], ...p } })
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">

      <button className="sd-chip" onClick={() => setPick('book')}>{bn(book.name, lang)} ▾</button><button className="sd-chip" onClick={() => setPick('ch')}>{t10(lang, 'ch', 'Chapter')} {ci + 1} ▾</button><span className="ml-auto"><BiblePicker compact opts={opts} settings={settings} setSettings={setSettings} /></span>
      {pick === 'book' && <Sheet title={t10(lang, 'pick', 'Choose a book')} onClose={() => setPick('')}>{(bible.books.length === 66 ? [[t10(lang, 'ot', 'Old Testament'), 0, 39], [t10(lang, 'nt', 'New Testament'), 39, 66]] : [['Books', 0, bible.books.length]]).map(([t, a, z]: any) => <div key={t}><h4 className="text-xs uppercase opacity-60 mb-2">{t}</h4><div className="grid grid-cols-2 gap-2 mb-4">{bible.books.slice(a, z).map((b, k) => <button key={a + k} className={'opt !mb-0' + (a + k === bi ? ' on' : '')} onClick={() => { stop(); setBi(a + k); setCi(0); setPick('') }}>{bn(b.name, lang)}</button>)}</div></div>)}</Sheet>}
      {pick === 'ch' && <Sheet title={bn(book.name, lang)} onClose={() => setPick('')}><div className="grid grid-cols-5 gap-2">{book.chapters.map((_, i) => <button key={i} className={'opt !mb-0 text-center' + (i === ci ? ' on' : '')} onClick={() => { stop(); setCi(i); setPick('') }}>{i + 1}</button>)}</div></Sheet>}
    </div>
    <input className={card + ' w-full'} placeholder="Search this translation…" value={q} onChange={e => setQ(e.target.value)} />
    {hits.map((h, k) => <p key={k} className="text-sm">{h.b} {h.i + 1}:{h.v + 1} — {h.t}</p>)}
    {!speechOK() && <p className="text-xs opacity-60">🔇 Voice reading is not available on this device.</p>}
    {speechOK() && <div className="flex flex-wrap items-center gap-2"><button className="sd-btn" onClick={playing ? stop : play}>{playing ? '■ Stop' : '▶ Listen'}</button><SpeedPicker rate={rate} set={changeRate} /><label className="text-xs flex items-center gap-1"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />Next chapter</label><span className="text-xs opacity-50">{nativeTTS() ? 'phone voice' : 'browser voice'}</span></div>}
    {speechOK() && bible.meta.language.toLowerCase() !== 'english' && <p className="text-xs opacity-60">Listening needs a {bible.meta.language} voice installed on your phone (Settings → Text-to-speech).</p>}
    <div style={readerStyle(settings)} className="space-y-2">{verses.map((t, v) => { const m = marks[key(v)] || {}; return <p key={v} ref={el => { if (el && cur === v) el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }} onClick={() => setSel(v)} style={{ background: cur === v ? 'color-mix(in srgb, var(--gold) 28%, transparent)' : m.color ? m.color + '55' : undefined, cursor: 'pointer' }} className="rounded px-1 transition-colors">
      {settings.vnums && <sup className="mr-1">{v + 1}</sup>}{t}{m.bookmark && <span className="sd-gold"> ★</span>}{m.note && <span className="opacity-70"> ✎</span>}</p> })}
      <p className="text-xs opacity-60 pt-2">{bible.meta.name}{bible.meta.license ? ' · ' + bible.meta.license : ''}</p>
      {sel !== null && verses[sel] !== undefined && (() => { const m = marks[key(sel)] || {}; const ref = `${bn(book.name, lang)} ${ci + 1}:${sel + 1}`; return <Sheet title={ref} onClose={() => setSel(null)}>
        <p className="mb-3 text-sm opacity-80">{verses[sel]}</p>
        <div className="flex gap-3 items-center mb-3 flex-wrap">{['#fde047', '#86efac', '#7dd3fc', '#f9a8d4', '#fdba74'].map(c => <button key={c} aria-label="highlight" className="w-9 h-9 rounded-full grid place-items-center text-black text-sm" style={{ background: c }} onClick={() => set(sel, { color: m.color === c ? undefined : c })}>{m.color === c ? '✓' : ''}</button>)}{m.color && <button className="sd-chip" onClick={() => set(sel, { color: undefined })}>Remove</button>}</div>
        <div className="flex gap-2 flex-wrap mb-3"><button className="sd-chip" onClick={() => set(sel, { bookmark: !m.bookmark })}>{m.bookmark ? '★ Bookmarked' : '☆ Bookmark'}</button>{speechOK() && <button className="sd-chip" onClick={() => { const n = sel; setSel(null); stop(); playFrom(n) }}>▶ Read from here</button>}{speechOK() && <button className="sd-chip" onClick={() => { setSel(null); stop(); speak([verses[sel]], bible.meta.language, rate) }}>🔊 This verse</button>}<button className="sd-chip" onClick={() => navigator.clipboard?.writeText(`${ref} — ${verses[sel]}`)}>📋 Copy</button>{typeof navigator.share === 'function' && <button className="sd-chip" onClick={() => navigator.share({ text: `${ref} — ${verses[sel]}` }).catch(() => {})}>↗ Share</button>}</div>
        <textarea className="w-full rounded-lg p-2" rows={3} placeholder="Add a note…" value={m.note || ''} onChange={e => set(sel, { note: e.target.value })} /></Sheet> })()}</div></div>
}

function Plans({ settings }: { settings: any }) {
  const [plans, setPlans] = useState<Plan[]>([]); const [sel, setSel] = useState(''); const [open, setOpen] = useState<number | null>(null); const [sw, setSw] = useState(false)
  const [items, setItems] = useLS<string[]>('planItems', []); const [talk, setTalk] = useState(''); useBN(); const [started, setStarted] = useLS<Record<string, string>>('planStarted', {}); const [tab, setTab] = useState(''); const [cat, setCat] = useState('All'); const [msg, setMsg] = useState(''); const [run, setRun] = useState<{ day: number; step: number } | null>(null); const [fin, setFin] = useState<number | null>(null); const [rate, setRate] = useLS<number>('ttsRate', 1)
  useEffect(() => () => stopSpeak(), [])
  const [idx, setIdx] = useState<Entry[]>([]); const [bible, setBible] = useState<Bible | null>(null); const [custom] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Plan[]>('plans/plans.json').then(arr(setPlans)).catch(() => {}); get<Entry[]>('bibles/index.json').then(arr(setIdx)).catch(() => {}) }, [])
  useEffect(() => { const c = custom.find(b => b.meta.id === settings.translation); if (c) { setBible(c); return } const e = idx.find(x => x.id === settings.translation) || idx[0]; if (e) loadBible(e.path).then(setBible).catch(() => setBible(null)) }, [idx, custom, settings.translation])
  const refOf = (r: PRead) => `${bn(r.book, bible?.meta.language)} ${r.from}${r.vFrom ? ':' + r.vFrom + (r.vTo && r.vTo > r.vFrom ? '–' + r.vTo : '') : r.to > r.from ? '–' + r.to : ''}`
  const reads = (r: PDay): PRead[] => [r as PRead, ...(r.more || [])].filter(x => x.book)
  const reading = (r: PRead) => { const bk = bible?.books.find(b => b.name.toLowerCase() === r.book.toLowerCase()); if (!bk) return <p className="text-sm">"{r.book}" is not in the selected Bible.</p>
    if (r.vFrom) return <div>{(bk.chapters[r.from - 1] || []).slice(r.vFrom - 1, r.vTo || r.vFrom).map((t, v) => <p key={v}><sup>{r.vFrom! + v}</sup> {t}</p>)}</div>
    return <>{Array.from({ length: Math.max(r.to, r.from) - r.from + 1 }, (_, k) => r.from + k).map(c => <div key={c}>{r.to > r.from && <h4 className="font-semibold">{bn(r.book, bible?.meta.language)} {c}</h4>}{(bk.chapters[c - 1] || []).map((t, v) => <p key={v}><sup>{v + 1}</sup> {t}</p>)}</div>)}</> }
  const textsOf = (r: PRead): string[] => { const bk = bible?.books.find(b => b.name.toLowerCase() === r.book.toLowerCase()); if (!bk) return []; if (r.vFrom) return (bk.chapters[r.from - 1] || []).slice(r.vFrom - 1, r.vTo || r.vFrom); return Array.from({ length: Math.max(r.to, r.from) - r.from + 1 }, (_, k) => r.from + k).flatMap(c => bk.chapters[c - 1] || []) }
  const speakDay = (r: PDay, key: string) => { if (talk === key) { stopSpeak(); setTalk(''); return } const texts = [r.title || '', r.body || '', ...reads(r).flatMap(textsOf)].filter(Boolean); setTalk(key); speak(texts, bible?.meta.language || 'english', rate, undefined, () => setTalk(''), (m) => { setTalk(''); alert('Could not play the voice (' + (m || 'unknown') + '). Check that a voice for this language is installed in your phone settings (Text-to-speech).') }) }
  const has = (k: string) => items.includes(k)
  const tick = (k: string) => setItems(has(k) ? items.filter(x => x !== k) : [...items, k])
  const keysOf = (p: Plan, i: number) => { const d = p.days[i]; const ks: string[] = []; if (d.body) ks.push(`${p.id}|${i}|d`); reads(d).forEach((_, k) => ks.push(`${p.id}|${i}|r${k}`)); return ks }
  const dayDone = (p: Plan, i: number) => { const ks = keysOf(p, i); return ks.length > 0 && ks.every(has) }
  const plan = plans.find(p => p.id === sel)
  const bar = (n: number, t: number) => <span className="block h-1 mt-2 rounded bg-white/10"><span className="block h-1 rounded" style={{ width: `${t ? n * 100 / t : 0}%`, background: 'var(--gold)' }} /></span>
  const isStarted = (p: Plan) => !!started[p.id] || items.some(k => k.startsWith(p.id + '|'))
  const doneCount = (p: Plan) => p.days.filter((_, i) => dayDone(p, i)).length
  const nextDay = (p: Plan) => p.days.findIndex((_, i) => !dayDone(p, i))
  const openPlan = (p: Plan) => { setSel(p.id); setMsg(''); const nx = nextDay(p); setOpen(nx < 0 ? 0 : nx) }
  const catOf = (p: Plan) => p.category || 'General'
  if (!plan) {
    const my = plans.filter(isStarted); const tb = tab || (my.length ? 'my' : 'browse'); const cats = Array.from(new Set(plans.map(catOf)))
    const row = (p: Plan) => { const n = doneCount(p); const on = isStarted(p); return <button key={p.id} className={card + ' block w-full text-left'} onClick={() => openPlan(p)}><b className="sd-gold">{on ? '✓ ' : ''}{p.title}</b>{on && <><span className="block text-xs opacity-70">{(n >= p.days.length ? 'Completed' : `Continue · Day ${nextDay(p) + 1}`) + ` · ${n}/${p.days.length} days`}</span>{bar(n, p.days.length)}</>}</button> }
    return <div className="space-y-3"><h2 className="font-bold">Reading plans</h2>
      <div className="flex gap-2"><button className={'sd-chip' + (tb === 'my' ? ' on' : '')} onClick={() => setTab('my')}>My plans ({my.length})</button><button className={'sd-chip' + (tb === 'browse' ? ' on' : '')} onClick={() => setTab('browse')}>Browse</button></div>
      {tb === 'my' ? (my.length ? my.map(row) : <p className="text-sm opacity-70">You have not started a plan yet. Open Browse, choose a plan and tap Start.</p>) : <>
        {cats.length > 1 && <div className="flex flex-wrap gap-2">{['All', ...cats].map(c => <button key={c} className={'sd-chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>}
        {!plans.length && <p>No plans yet.</p>}
        {(cat === 'All' ? cats : [cat]).map(c => { const list = plans.filter(p => catOf(p) === c); return list.length > 0 && <div key={c} className="space-y-2">{cat === 'All' && cats.length > 1 && <h3 className="text-xs uppercase opacity-60 pt-1">{c}</h3>}{list.map(row)}</div> })}</>}</div>
  }
  const on = isStarted(plan); const nDone = doneCount(plan)
  const back = <div className="flex justify-between items-center"><button className="text-sm underline" onClick={() => { setSel(''); setMsg('') }}>← All plans</button>{on && <button className="sd-chip" onClick={() => setSw(true)}>⇄ My plans</button>}</div>
  if (!on) return <div className="space-y-3">{back}<h2 className="font-bold">{plan.title}</h2><p className="text-xs opacity-70">{catOf(plan)} · {plan.days.length} days</p>{plan.description && <p>{plan.description}</p>}
    <h3 className="font-semibold">What you will read</h3><div className="space-y-1 text-sm opacity-90">{plan.days.slice(0, 10).map((r, i) => <div key={i}>Day {i + 1}: {r.title || reads(r).map(refOf).join(', ')}</div>)}{plan.days.length > 10 && <div className="opacity-60">… and {plan.days.length - 10} more days</div>}</div>
    <button className="sd-btn w-full" onClick={() => { setStarted({ ...started, [plan.id]: todayStr() }); setMsg(`You started “${plan.title}”. It is now under My plans.`); setTab('my'); setOpen(0) }}>▶ Start this plan</button>
    <p className="text-xs opacity-60">Your progress is tracked only after you start. Started plans appear under My plans.</p></div>
  const restart = () => { if (confirm('Restart this plan from Day 1?')) { setItems(items.filter(k => !k.startsWith(plan.id + '|'))); setStarted({ ...started, [plan.id]: todayStr() }); setOpen(0) } }
  const removePlan = () => { if (confirm('Remove this plan from My plans? Your ticks for it will be cleared.')) { setItems(items.filter(k => !k.startsWith(plan.id + '|'))); const n = { ...started }; delete n[plan.id]; setStarted(n); setSel('') } }
  const stepsOf = (r: PDay) => { const st: { kind: string; k: number; label: string }[] = []; if (r.body) st.push({ kind: 'd', k: 0, label: 'Devotion' }); reads(r).forEach((x, k) => st.push({ kind: 'r', k, label: refOf(x) })); return st }
  const keyOf = (i: number, st: { kind: string; k: number }) => `${plan.id}|${i}|${st.kind === 'd' ? 'd' : 'r' + st.k}`
  const openDay = (i: number) => { const steps = stepsOf(plan.days[i]); const f = steps.findIndex(x => !has(keyOf(i, x))); setRun({ day: i, step: f < 0 ? 0 : f }) }
  const trackMsg = () => { const sd = started[plan.id]; if (!sd) return ''; const n = doneCount(plan); const exp = Math.min(plan.days.length, Math.max(1, dayNum(todayStr()) - dayNum(sd) + 1)); return n > exp ? 'You are ahead of schedule 🌟' : n === exp ? 'You are on track ✓ No days missed.' : `You are ${exp - n} day${exp - n > 1 ? 's' : ''} behind. Catch up when you can.` }
  const speakTexts = (texts: string[], key: string) => { if (talk === key) { stopSpeak(); setTalk(''); return } setTalk(key); speak(texts, bible?.meta.language || 'english', rate, undefined, () => setTalk(''), (m) => { setTalk(''); alert('Could not play the voice (' + (m || 'unknown') + '). Check that a voice for this language is installed in your phone settings (Text-to-speech).') }) }
  if (run && plan.days[run.day]) {
    const r = plan.days[run.day]; const steps = stepsOf(r); const idx = Math.min(run.step, Math.max(steps.length - 1, 0)); const st = steps[idx]; const last = idx >= steps.length - 1
    const go = (d: number) => { stopSpeak(); setTalk(''); setRun({ day: run.day, step: idx + d }) }
    const nextStep = () => { stopSpeak(); setTalk(''); if (st && !has(keyOf(run.day, st))) setItems([...items, keyOf(run.day, st)]); if (last) { setFin(run.day); setRun(null) } else go(1) }
    const prev = () => { if (idx > 0) go(-1) }
    return <div key={run.day + '-' + idx} className="space-y-3 slide" onTouchStart={e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - touchX; const dy = e.changedTouches[0].clientY - touchY; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) nextStep(); else prev() } }}>
      <div className="flex justify-between items-center text-sm"><button className="underline" onClick={() => { stopSpeak(); setTalk(''); setRun(null) }}>← {plan.title}</button><span>Day {run.day + 1} of {plan.days.length}</span></div>
      <div className="flex gap-1">{steps.map((_, k) => <span key={k} className="h-1.5 flex-1 rounded" style={{ background: k <= idx ? 'var(--gold)' : 'rgba(255,255,255,.15)' }} />)}</div>
      {!st ? <p className="text-sm opacity-70">Nothing to read on this day.</p> : <div className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="sd-gold font-bold text-lg">{st.kind === 'd' ? (r.title || 'Devotion') : st.label}</h3>{speechOK() && <div className="flex gap-2"><SpeedPicker rate={rate} set={setRate} /><button className="sd-chip" onClick={() => speakTexts(st.kind === 'd' ? [r.title || '', r.body || ''].filter(Boolean) : textsOf(reads(r)[st.k]), 'step')}>{talk === 'step' ? '■ Stop' : '🔊 Listen'}</button></div>}</div>
        {st.kind === 'd' ? <p style={readerStyle(settings)} className="whitespace-pre-wrap">{r.body}</p> : <div style={readerStyle(settings)} className="space-y-1">{reading(reads(r)[st.k])}</div>}</div>}
      <div className="flex gap-2 pt-2"><button className="sd-chip" disabled={idx === 0} onClick={prev}>◀ Back</button><button className="sd-btn flex-1" onClick={nextStep}>{last ? 'Finish day ✓' : 'Next ▶'}</button></div>
      <p className="text-xs opacity-60 text-center">Tap Next, or swipe left. Swipe right to go back.</p></div>
  }
  const total = plan.days.length; const nx = nextDay(plan)
  return <div className="space-y-3">{back}
    {sw && <Sheet title="My plans" onClose={() => setSw(false)}>{plans.filter(isStarted).map(q => <button key={q.id} className={'opt' + (q.id === plan.id ? ' on' : '')} onClick={() => { openPlan(q); setSw(false) }}>{q.title}<span className="block text-xs opacity-70">{doneCount(q)}/{q.days.length} days done</span></button>)}</Sheet>}
    {fin !== null && <Sheet title={`🎉 Day ${fin + 1} complete!`} onClose={() => setFin(null)}><p className="mb-2">{doneCount(plan)} of {total} days complete.</p><p className="mb-2">{fin + 1 < total ? `Tomorrow: Day ${fin + 2} — ${plan.days[fin + 1].title || reads(plan.days[fin + 1]).map(refOf).join(', ')}` : 'You have finished the whole plan! 🎊'}</p>{trackMsg() && <p className="mb-3 sd-gold">{trackMsg()}</p>}<button className="sd-btn w-full mb-2" onClick={() => setFin(null)}>Done</button>{fin + 1 < total && <button className="sd-chip" onClick={() => { const d = fin + 1; setFin(null); openDay(d) }}>Read Day {fin + 2} now</button>}</Sheet>}
    {msg && <div className="sd-card">✓ {msg}</div>}
    <h2 className="font-bold">{plan.title}</h2><div className="text-xs opacity-70">✓ In My plans{started[plan.id] ? ' · started ' + started[plan.id] : ''} · {nDone} of {total} days done{bar(nDone, total)}</div>
    {trackMsg() && <p className="text-sm sd-gold">{trackMsg()}</p>}
    <button className="sd-btn w-full" onClick={() => openDay(nx < 0 ? 0 : nx)}>{nDone === 0 ? '▶ Start Day 1' : nx < 0 ? '↺ Review from Day 1' : `Continue · Day ${nx + 1}`}</button>
    {plan.days.map((r, i) => { const ks = keysOf(plan, i); const got = ks.filter(has).length
      return <button key={i} className={card + ' flex w-full justify-between gap-2 text-left'} onClick={() => openDay(i)}><span>{ks.length > 0 && got === ks.length ? '✓ ' : ''}Day {i + 1}: {r.title || reads(r).map(refOf).join(', ')}</span><span className="text-xs opacity-70 whitespace-nowrap">{got}/{ks.length}</span></button> })}
    <div className="flex gap-2 pt-2"><button className="sd-chip" onClick={restart}>↺ Restart</button><button className="sd-chip" onClick={removePlan}>Remove from My plans</button></div></div>
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
  return <section className="space-y-2"><h2 className="font-bold">Reading plans</h2><datalist id="books">{BOOK_LIST.map(n => <option key={n} value={n} />)}</datalist><datalist id="plancats">{Array.from(new Set(plans.map(x => x.category).filter(Boolean))).map(c => <option key={c} value={c} />)}</datalist>
    <div className="flex flex-wrap items-center gap-2 text-sm"><input className="border rounded px-2" value={title} onChange={e => setTitle(e.target.value)} /><input list="books" className="border rounded px-2 w-32" placeholder="Book" value={book} onChange={e => setBook(e.target.value)} />
      <label>Chapters <input type="number" min={1} className="border rounded px-2 w-16 text-black" value={ch} onChange={e => setCh(+e.target.value)} /></label>
      <label>Days <input type="number" min={1} className="border rounded px-2 w-16 text-black" value={days} onChange={e => setDays(+e.target.value)} /></label></div>
    <button className={btn} onClick={create}>Create reading plan</button> <button className={btn} onClick={createSeries}>Create devotional series</button>{m && <p className="text-sm">{m}</p>}
    {plans.map(p => <div key={p.id} className={card + ' text-sm space-y-2'}><div className="flex gap-2"><input className="flex-1 border rounded px-2" value={p.title} onChange={e => upPlan(p.id, { title: e.target.value })} /><input list="plancats" className="border rounded px-2 w-28" placeholder="Category" value={p.category || ''} onChange={e => upPlan(p.id, { category: e.target.value })} /><button onClick={() => setOpenId(openId === p.id ? '' : p.id)}>✎ {p.days.length} days</button><button onClick={() => confirm('Delete plan?') && setPlans(plans.filter(x => x.id !== p.id))}>🗑</button></div>
      {openId === p.id && <input className="w-full border rounded px-2" placeholder="Short description of this plan" value={p.description || ''} onChange={e => upPlan(p.id, { description: e.target.value })} />}
      {openId === p.id && p.days.map((d, i) => <div key={i} className="space-y-1 border-t pt-2"><b>Day {i + 1}</b>
        <input className="w-full border rounded px-2" placeholder="Devotion title" value={d.title || ''} onChange={e => upDay(p.id, i, { title: e.target.value })} />
        <textarea className="w-full border rounded px-2" rows={3} placeholder="Devotion text (leave empty for reading only)" value={d.body || ''} onChange={e => upDay(p.id, i, { body: e.target.value })} />
        {[d as PRead, ...(d.more || [])].map((x, k) => <div key={k} className="flex flex-wrap items-center gap-1"><input list="books" style={x.book && !BOOK_LIST.includes(x.book) ? { outline: '2px solid #f87171' } : undefined} className="border rounded px-2 w-32" placeholder="Book (type a letter)" value={x.book} onChange={e => upRead(p.id, i, k, { book: e.target.value })} />ch <input type="number" min={1} className="border rounded px-1 w-14" value={x.from} onChange={e => upRead(p.id, i, k, { from: +e.target.value, to: Math.max(+e.target.value, x.to) })} />–<input type="number" min={1} className="border rounded px-1 w-14" value={x.to} onChange={e => upRead(p.id, i, k, { to: +e.target.value })} /> verses <input type="number" min={1} className="border rounded px-1 w-14" placeholder="from" value={x.vFrom || ''} onChange={e => upRead(p.id, i, k, { vFrom: +e.target.value || undefined })} />–<input type="number" min={1} className="border rounded px-1 w-14" placeholder="to" value={x.vTo || ''} onChange={e => upRead(p.id, i, k, { vTo: +e.target.value || undefined })} />{k > 0 && <button onClick={() => delRead(p.id, i, k)}>✕</button>}</div>)}
        <button className="underline" onClick={() => addRead(p.id, i)}>+ Add another reading</button></div>)}</div>)}
    <button className={btn} onClick={() => save('plans.json', plans)}>Export plans.json</button></section>
}

type BookMeta = { id: string; title: string; author?: string; category?: string; description?: string; file?: string; license?: string; language?: string }
type BookData = { chapters: { title: string; paras: string[] }[] }

function Books({ settings }: any) {
  const [list, setList] = useState<BookMeta[]>([]); const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [sel, setSel] = useState(''); const [data, setData] = useState<BookData | null>(null); const [ch, setCh] = useState<number | null>(null)
  const [prog, setProg] = useLS<Record<string, number>>('bookProg', {}); const [talk, setTalk] = useState(false); const [rate, setRate] = useLS<number>('ttsRate', 1)
  useEffect(() => { get('books/books.json').then(arr(setList)).catch(() => {}) }, [])
  useEffect(() => { setData(null); setCh(null); if (sel) get<BookData>(`books/${sel}.json`).then(j => setData(j && Array.isArray(j.chapters) ? j : { chapters: [] })).catch(() => setData({ chapters: [] })) }, [sel])
  useEffect(() => () => stopSpeak(), [])
  const book = list.find(b => b.id === sel)
  if (!book) {
    const cats = Array.from(new Set(list.map(b => b.category || 'General')))
    const shown = list.filter(b => (cat === 'All' || (b.category || 'General') === cat) && (!q || (b.title + ' ' + (b.author || '')).toLowerCase().includes(q.toLowerCase())))
    return <div className="space-y-3"><h2 className="font-bold">Books</h2>
      {list.length > 3 && <input className="w-full rounded-lg px-3 py-2" placeholder="Search books…" value={q} onChange={e => setQ(e.target.value)} />}
      {cats.length > 1 && <div className="flex flex-wrap gap-2">{['All', ...cats].map(c => <button key={c} className={'sd-chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>}
      {!list.length && <p className="text-sm opacity-70">No books yet. Books added by your church will appear here.</p>}
      {shown.map(b => <button key={b.id} className={card + ' flex gap-3 w-full text-left items-center'} onClick={() => setSel(b.id)}><span className="text-3xl">📕</span><span><b className="sd-gold">{b.title}</b>{b.author && <span className="block text-xs opacity-70">{b.author}</span>}{prog[b.id] !== undefined && <span className="block text-xs">Continue · Chapter {prog[b.id] + 1}</span>}</span></button>)}</div>
  }
  const chs = data?.chapters || []
  if (ch === null) return <div className="space-y-3"><button className="text-sm underline" onClick={() => setSel('')}>← All books</button>
    <h2 className="font-bold sd-gold text-lg">{book.title}</h2>{book.author && <p className="text-sm opacity-80">{book.author}</p>}<p className="text-xs opacity-60">{book.category || 'General'}{chs.length ? ` · ${chs.length} chapters` : ''}</p>
    {book.description && <p className="text-sm">{book.description}</p>}
    {!data ? <p className="text-sm">Loading…</p> : !chs.length ? <p className="text-sm opacity-70">This book is not ready yet. It appears after the next publish.</p> : <>
      <button className="sd-btn w-full" onClick={() => { const n = Math.min(prog[book.id] ?? 0, chs.length - 1); setCh(n); setProg({ ...prog, [book.id]: n }) }}>{prog[book.id] !== undefined ? `Continue · Chapter ${prog[book.id] + 1}` : '▶ Start reading'}</button>
      <h3 className="font-semibold pt-1">Contents</h3>{chs.map((c, i) => <button key={i} className={'opt' + (prog[book.id] === i ? ' on' : '')} onClick={() => { setCh(i); setProg({ ...prog, [book.id]: i }) }}>{c.title}</button>)}</>}
    {book.file && /\.pdf$/i.test(book.file) && <a className="sd-chip inline-block" href={B + 'books/' + book.file} target="_blank" rel="noreferrer">⬇ Download the PDF</a>}
    {book.license && <p className="text-xs opacity-50">{book.license}</p>}</div>
  const c = chs[Math.min(ch, chs.length - 1)]; const last = ch >= chs.length - 1
  const go = (n: number) => { stopSpeak(); setTalk(false); if (n < 0) return; if (n >= chs.length) { setCh(null); return } setCh(n); setProg({ ...prog, [book.id]: n }); window.scrollTo(0, 0) }
  const lang = book.language || langOf(c.paras[0] || '')
  return <div key={ch} className="space-y-3 slide" onTouchStart={e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - touchX; const dy = e.changedTouches[0].clientY - touchY; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? ch + 1 : ch - 1) }}>
    <div className="flex justify-between items-center text-sm"><button className="underline" onClick={() => { stopSpeak(); setTalk(false); setCh(null) }}>← {book.title}</button><span>{ch + 1} / {chs.length}</span></div>
    <span className="block h-1 rounded bg-white/10"><span className="block h-1 rounded" style={{ width: `${(ch + 1) * 100 / chs.length}%`, background: 'var(--gold)' }} /></span>
    <div className="flex items-center justify-between gap-2"><h3 className="sd-gold font-bold text-lg">{c.title}</h3>{speechOK() && <div className="flex gap-2"><SpeedPicker rate={rate} set={setRate} /><button className="sd-chip" onClick={() => { if (talk) { stopSpeak(); setTalk(false) } else { setTalk(true); speak([c.title, ...c.paras], lang, rate, undefined, () => setTalk(false), (m) => { setTalk(false); alert('Could not play the voice (' + (m || 'unknown') + ').') }) } }}>{talk ? '■ Stop' : '🔊 Listen'}</button></div>}</div>
    <div style={readerStyle(settings)} className="space-y-3">{c.paras.map((p, i) => <p key={i}>{p}</p>)}</div>
    <div className="flex gap-2 pt-2"><button className="sd-chip" disabled={ch === 0} onClick={() => go(ch - 1)}>◀ Previous</button><button className="sd-btn flex-1" onClick={() => go(ch + 1)}>{last ? 'Finish ✓' : 'Next chapter ▶'}</button></div>
    <p className="text-xs opacity-60 text-center">Swipe left for the next chapter, right to go back.</p></div>
}

function BooksAdmin() {
  const [bks, setBks] = useLS<BookMeta[] | null>('draftBooks', null)
  useEffect(() => { if (!bks) get('books/books.json').then(arr(setBks)).catch(() => setBks([])) }, [])
  if (!bks) return null
  const up = (i: number, p: Partial<BookMeta>) => setBks(bks.map((x, k) => k === i ? { ...x, ...p } : x))
  const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'book'
  return <section className="space-y-2"><h2 className="font-bold">Books</h2>
    <datalist id="bookcats">{Array.from(new Set(bks.map(b => b.category).filter(Boolean))).map(c => <option key={c} value={c} />)}</datalist>
    <p className="text-xs opacity-70">1) Add the book details here. 2) Click Export books.json. 3) On GitHub, upload the PDF into the folder books-src and upload books.json into public/data/books. The site turns the PDF into readable chapters when it publishes. Only add books you have the right to publish.</p>
    {bks.map((b, i) => <div key={i} className={card + ' text-sm space-y-1'}>
      <input className="w-full border rounded px-2" placeholder="Title" value={b.title} onChange={e => up(i, { title: e.target.value })} />
      <div className="flex gap-2"><input className="flex-1 border rounded px-2" placeholder="Author" value={b.author || ''} onChange={e => up(i, { author: e.target.value })} /><input list="bookcats" className="w-32 border rounded px-2" placeholder="Category" value={b.category || ''} onChange={e => up(i, { category: e.target.value })} /></div>
      <input className="w-full border rounded px-2" placeholder="Exact file name, e.g. pilgrims-progress.pdf" value={b.file || ''} onChange={e => up(i, { file: e.target.value.trim() })} />
      <textarea className="w-full border rounded px-2" rows={2} placeholder="Short description" value={b.description || ''} onChange={e => up(i, { description: e.target.value })} />
      <div className="flex gap-2"><input className="flex-1 border rounded px-2" placeholder="Rights, e.g. Public domain" value={b.license || ''} onChange={e => up(i, { license: e.target.value })} /><input className="w-24 border rounded px-2" placeholder="Language" value={b.language || ''} onChange={e => up(i, { language: e.target.value })} /><button onClick={() => confirm('Delete this book entry?') && setBks(bks.filter((_, k) => k !== i))}>🗑</button></div></div>)}
    <button className={btn} onClick={() => setBks([...bks, { id: '', title: 'New book', file: '' }])}>+ Book</button> <button className={btn} onClick={() => save('books.json', bks.map(b => ({ ...b, id: b.id || slug(b.title) })))}>Export books.json</button></section>
}

function Saved() {
  useBN()
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
      return <div key={k} className={card + ' text-sm'} style={{ borderLeft: m.color ? `6px solid ${m.color}` : undefined }}><b>{m.bookmark ? '★ ' : ''}{bn(bk, bibles[id]?.meta.language)} {+ch + 1}:{+v + 1}</b> <span className="opacity-60">({id})</span><p>{t || '…'}</p>{m.note && <p className="italic opacity-80">✎ {m.note}</p>}
        <button className="text-xs underline" onClick={() => { const n = { ...marks }; delete n[k]; setMarks(n) }}>Remove</button></div> })}</div>
}

function Devotions() {
  const [d, setD] = useState<Devotion[]>([]); const [cats, setCats] = useState<Cat[]>([]); const [f, setF] = useState('all'); const [local] = useLS<Devotion[] | null>('draftDevotions', null)
  useEffect(() => { get('devotions/devotions.json').then(arr(setD)).catch(() => {}); get('devotions/categories.json').then(arr(setCats)).catch(() => {}) }, [])
  const shown = d.filter(x => x && x.published && (f === 'all' || (x.categories || []).includes(f)))
  const nm = (id: string) => cats.find(c => c.id === id)?.name || id
  return <div className="space-y-3">{cats.length > 0 && <div className="flex flex-wrap gap-2"><button className={'sd-chip' + (f === 'all' ? ' on' : '')} onClick={() => setF('all')}>All</button>{cats.map(c => <button key={c.id} className={'sd-chip' + (f === c.id ? ' on' : '')} onClick={() => setF(c.id)}>{c.name}</button>)}</div>}
    {shown.map((x, n) => <article key={x.id || n} className={card}><h3 className="font-semibold">{x.title}</h3>{(x.categories || []).length > 0 && <p className="text-xs opacity-60">{(x.categories || []).map(nm).join(' · ')}</p>}<p className="whitespace-pre-wrap">{x.body}</p></article>)}
    {!shown.length && <p className="text-sm opacity-70">No devotions here yet.</p>}
    {local && <p className="text-xs opacity-60">Admin drafts exist on this device and are not shown to readers until published via GitHub.</p>}</div>
}

function Admin() {
  const [d, setD] = useLS<Devotion[] | null>('draftDevotions', null); const [cats, setCats] = useLS<Cat[] | null>('draftCats', null)
  const [cb, setCb] = useLS<Bible[]>('customBibles', []); const [msg, setMsg] = useState(''); const [msg2, setMsg2] = useState('')
  useEffect(() => { if (!d) get<Devotion[]>('devotions/devotions.json').then(arr(setD)); if (!cats) get<Cat[]>('devotions/categories.json').then(arr(setCats)) }, [])
  if (!d || !cats) return <p>Loading…</p>
  const up = (i: number, p: Partial<Devotion>) => setD(d.map((x, k) => k === i ? { ...x, ...p } : x))
  const importDev = async (f: File) => { try { const j = JSON.parse(await f.text()); if (!Array.isArray(j) || j.some((x: any) => !x.id || !x.title || typeof x.body !== 'string')) return setMsg2('Invalid file: it must be a list where every devotion has id, title and body'); setD(j.map((x: any) => ({ categories: [], published: false, date: new Date().toISOString().slice(0, 10), ...x }))); setMsg2(`Loaded ${j.length} devotions. Edit them below, then click Export devotions.json.`) } catch { setMsg2('This is not a valid JSON file') } }
  const importUsfx = async (f: File) => { const r = parseUsfx(await f.text()); if (typeof r === 'string') return setMsg(r)
    const id = prompt('Short id (letters and numbers, e.g. web)', 'web'); const name = prompt('Translation name', 'World English Bible'); const language = prompt('Language', 'English'); const license = prompt('License', 'Public domain')
    if (!id || !name || !language) return setMsg('Cancelled')
    const j: Bible = { meta: { id, name, language, license: license || '' }, books: r.books }; const e = validateBible(j); if (e) return setMsg('Invalid: ' + e)
    save(id + '.json', j); setMsg(`Converted ${name}: ${j.books.length} books, ${j.books.reduce((a, b) => a + b.chapters.length, 0)} chapters. The file ${id}.json was downloaded - upload it to public/data/bibles on GitHub.`) }
  const importBible = async (f: File) => { try { const j = JSON.parse(await f.text()); const e = validateBible(j); if (e) return setMsg('Invalid: ' + e); setCb([...cb.filter(b => b.meta.id !== j.meta.id), j]); setMsg(`Imported ${j.meta.name} (${j.meta.language}, ${j.books.length} books). Use Export to place it in public/data/bibles/.`) } catch { setMsg('Not valid JSON') } }
  return <div className="space-y-4">
    <p className="text-xs">Local content tool only — not secure authentication. Drafts live in this browser. Export, then upload the files to GitHub (see README).</p>
    <BooksAdmin />
    <section className="space-y-2"><h2 className="font-bold">Import Bible JSON</h2>
      <input type="file" accept=".json" onChange={e => e.target.files?.[0] && importBible(e.target.files[0])} />
      <label className="block text-sm">Convert a USFX/XML Bible (downloads a ready JSON file) <input type="file" accept=".xml" onChange={e => e.target.files?.[0] && importUsfx(e.target.files[0])} /></label>{msg && <p className="text-sm">{msg}</p>}
      {cb.map(b => <div key={b.meta.id} className="text-sm">{b.meta.name} · {b.meta.language} · {b.meta.license || 'license not stated'} <button onClick={() => save(b.meta.id + '.json', b)}>Export</button></div>)}</section><PlanAdmin /></div>
}

const readerStyle = (st: any) => ({ fontSize: st.font, lineHeight: st.spacing, fontFamily: st.serif ? 'Georgia, "Times New Roman", serif' : undefined })

function SettingsPage({ name, setName, settings, setSettings, opts, restore, theme, remind, setRemind, cm, setCm, fbOK }: any) {
  const [rate, setRate] = useLS<number>('ttsRate', 1); const [gender, setGender] = useLS<string>('ttsGender', 'any')
  const up = (p: object) => setSettings({ ...settings, ...p })
  const row = 'flex items-center justify-between gap-3 py-1'
  const chip = (on: boolean) => 'sd-chip' + (on ? ' on' : '')
  return <div className="space-y-4"><h2 className="font-bold">Settings</h2>
    <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">Profile</h3><label className={row}>Your name<input className="rounded-lg px-2 py-1 w-44" value={name} onChange={e => setName(e.target.value)} /></label></div>
    <div className="sd-card space-y-3"><h3 className="sd-gold font-semibold">Appearance</h3>
      <div className="flex gap-2">{[['dark', '🌙 Dark'], ['light', '☀️ Light'], ['auto', '🌓 Auto']].map(([m, l]) => <button key={m} className={chip(settings.mode === m)} onClick={() => up({ mode: m })}>{l}</button>)}</div>
      <div className="flex gap-3 items-center"><span className="text-sm">Accent</span>{['#d4a017', '#38bdf8', '#fb7185', '#4ade80', '#a78bfa'].map(c => <button key={c} aria-label={c} className="w-7 h-7 rounded-full" style={{ background: c, boxShadow: settings.accent === c ? '0 0 0 3px var(--ink)' : 'none' }} onClick={() => up({ accent: c })} />)}</div>
      <label className={row}>Animations<input type="checkbox" checked={settings.motion} onChange={e => up({ motion: e.target.checked })} /></label></div>
    <div className="sd-card space-y-3"><h3 className="sd-gold font-semibold">Voice</h3>
      <div className="flex gap-2">{[['any', 'Default'], ['f', 'Female'], ['m', 'Male']].map(([g, l]) => <button key={g} className={'sd-chip' + (gender === g ? ' on' : '')} onClick={() => { localStorage.setItem('sd:ttsGender', JSON.stringify(g)); setGender(g) }}>{l}</button>)}</div>
      <label className={row}>Reading speed<SpeedPicker rate={rate} set={setRate} /></label></div>
    <div className="sd-card space-y-3"><h3 className="sd-gold font-semibold">Daily verse reminder</h3>
      {notif() ? <><label className={row}>Show the verse of the day<input type="checkbox" checked={remind.on} onChange={e => setRemind({ ...remind, on: e.target.checked })} /></label>
        {remind.on && <label className={row}>Time<input type="time" className="rounded-lg px-2 py-1" value={remind.time} onChange={e => setRemind({ ...remind, time: e.target.value || '07:00' })} /></label>}
        <p className="text-xs opacity-60">A notification with the verse appears on your lock screen every day.</p></> : <p className="text-xs opacity-60">Daily lock-screen reminders work in the Android app. On any phone you can save the verse as a picture from the Home page and use it as your wallpaper.</p>}</div>
    <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">Reading</h3>
      {opts.length > 0 && <div className={row}>Bible<BiblePicker opts={opts} settings={settings} setSettings={setSettings} /></div>}
      <label className={row}>Text size {settings.font}px<input type="range" min={14} max={32} value={settings.font} onChange={e => up({ font: +e.target.value })} /></label>
      <label className={row}>Line spacing<input type="range" min={1.3} max={2.2} step={0.1} value={settings.spacing} onChange={e => up({ spacing: +e.target.value })} /></label>
      <label className={row}>Serif font<input type="checkbox" checked={settings.serif} onChange={e => up({ serif: e.target.checked })} /></label>
      <label className={row}>Show verse numbers<input type="checkbox" checked={settings.vnums} onChange={e => up({ vnums: e.target.checked })} /></label>
      <p className="rounded-lg p-3 border border-white/10" style={readerStyle(settings)}>{settings.vnums && <sup className="mr-1">1</sup>}The LORD is my shepherd; I shall not want.</p><p className="text-xs opacity-60">Voice: {nativeTTS() ? 'phone voice (app)' : canSpeak ? 'browser voice' : 'not available on this device'}</p></div>
    {fbOK && <div className="sd-card space-y-3"><h3 className="sd-gold font-semibold">Leaderboard and privacy</h3>
      <label className={row}>Count me as a user<input type="checkbox" checked={!!cm.count} onChange={e => setCm({ ...cm, decided: true, id: cm.id || newId(), first: cm.first || todayStr(), count: e.target.checked })} /></label>
      <label className={row}>Show me on the leaderboard<input type="checkbox" checked={!!cm.board} disabled={(cm.nick || '').trim().length < 2} onChange={e => { if (!e.target.checked) removeOnline(cm, 'board'); setCm({ ...cm, decided: true, id: cm.id || newId(), board: e.target.checked }) }} /></label>
      <label className={row}>Nickname<input className="rounded-lg px-2 py-1 w-40" maxLength={20} value={cm.nick || ''} onChange={e => setCm({ ...cm, decided: true, id: cm.id || newId(), nick: e.target.value })} /></label>
      <p className="text-xs opacity-60">We never collect your email, phone number or location. Only what is switched on above is shared.</p>
      <button className="sd-chip" onClick={async () => { await removeOnline(cm, 'all'); setCm({ ...cm, count: false, board: false }); alert('Your online data was deleted.') }}>Delete my online data</button></div>}
    {theme?.contact?.whatsapp && <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">Community</h3><p className="text-xs opacity-70">Optional. This opens WhatsApp so you can say hello to the church team. It shares your WhatsApp number with them.</p><a className="sd-btn inline-block" href={`https://wa.me/${theme.contact.whatsapp}?text=${encodeURIComponent(`Hello, I am ${name}. I am using Salem Daily.`)}`}>👋 Say hello to the church team</a></div>}
    <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">My data</h3><p className="text-xs opacity-70">Everything is saved only on this device.</p>
      <button className="sd-btn" onClick={() => { localStorage.setItem('sd:lastBackup', JSON.stringify(Date.now())); save('salem-daily-backup.json', Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('sd:')).map(k => [k, localStorage.getItem(k)]))) }}>Download my data</button>
      <label className="block text-sm">Restore backup <input type="file" accept=".json" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} /></label>
      <div className="flex gap-2 flex-wrap"><button className="sd-chip" onClick={() => { if (confirm('Reset all plan progress?')) { localStorage.removeItem('sd:planItems'); location.reload() } }}>Reset plan progress</button>
      <button className="sd-chip" onClick={() => { if (confirm('Erase ALL your saved data on this device?')) { Object.keys(localStorage).filter(k => k.startsWith('sd:')).forEach(k => localStorage.removeItem(k)); location.reload() } }}>Erase all my data</button></div></div>
    <div className="text-center space-y-2"><button className="sd-chip" onClick={async () => { const rs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((rs || []).map(r => r.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); location.reload() }}>↻ Get the latest version now</button><p className="text-xs opacity-60">Salem Daily · the app updates itself whenever new content is published.</p></div></div>
}

function Confetti() { return createPortal(<div className="confetti">{Array.from({ length: 30 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 0.1}s`, background: ['#f5d36a', '#d4a017', '#fb7185', '#38bdf8', '#4ade80'][i % 5] }} />)}</div>, document.body) }
type GTheme = { name: string; emoji: string; intro: string; books?: string[]; words: [string, string][]; quiz: [string, string, string[]][] }
type GQ = { kind: 'scr' | 'quiz' | 'cloze'; q: string; a: string; opts?: string[]; show?: string }
const rng = (a: number) => () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const shuf = <T,>(a: T[], r: () => number) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const scramble = (w: string, r: () => number) => { let x = w; for (let k = 0; k < 12 && x === w; k++) x = shuf(w.split(''), r).join(''); return x }
const todayStr = (off = 0) => new Date(Date.now() + off * 864e5).toLocaleDateString('en-CA')
const dayNum = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, dd) / 864e5) }
type GV = { ref: string; book: string; text: string }
const vcache = new Map<string, GV[]>(); const wcache = new Map<string, Set<string>>()
const versesOf = (b: Bible): GV[] => { let v = vcache.get(b.meta.id); if (!v) { const out: GV[] = []; for (const bk of b.books) bk.chapters.forEach((c, ci) => c.forEach((t, vi) => out.push({ ref: `${bk.name} ${ci + 1}:${vi + 1}`, book: bk.name, text: t }))); v = out; vcache.set(b.meta.id, v) } return v }
const vocabOf = (b: Bible) => { let w = wcache.get(b.meta.id); if (!w) { const set = new Set<string>(); for (const v of versesOf(b)) for (const x of v.text.toLowerCase().match(/[a-z]+/g) || []) if (x.length >= 3 && x.length <= 9) set.add(x); w = set; wcache.set(b.meta.id, w) } return w }
const STOPW = new Set(['which', 'their', 'there', 'these', 'those', 'about', 'shall', 'would', 'could', 'unto', 'thee', 'thou', 'thy', 'hath', 'have', 'with', 'that', 'this', 'from', 'they', 'them', 'were', 'been', 'will', 'what', 'when', 'your', 'every', 'because'])
const pickVerses = (b: Bible, books: string[] | null | undefined, r: () => number, n: number) => shuf(versesOf(b).filter(v => (!books || !books.length || books.includes(v.book)) && v.text.length >= 70 && v.text.length <= 170), r).slice(0, n)
const clozeQ = (v: GV, r: () => number, hint: boolean): GQ | null => { const ws = (v.text.match(/[A-Za-z]{5,}/g) || []).filter(w => !STOPW.has(w.toLowerCase())); if (!ws.length) return null; const w = ws[Math.floor(r() * ws.length)]; return { kind: 'cloze', q: v.text.replace(new RegExp('\\b' + w + '\\b'), '_____'), a: w.toUpperCase(), show: hint ? `Starts with “${w[0].toUpperCase()}” · ${w.length} letters` : '' } }
const bookQ = (v: GV, b: Bible, r: () => number): GQ => ({ kind: 'quiz', q: `Which book is this verse from?\n“${v.text}”`, a: v.book, opts: shuf([v.book, ...shuf(b.books.map(x => x.name).filter(n => n !== v.book), r).slice(0, 3)], r) })
const buildDaily = (t: GTheme, b: Bible, day: string): GQ[] => { const r = rng(dayNum(day) * 7 + 3)
  const words = shuf(t.words, r).sort((x, y) => y[0].length - x[0].length).slice(0, 2).map(([w, h]) => ({ kind: 'scr' as const, q: scramble(w, r), a: w, show: h }))
  const quiz = shuf(t.quiz, r).slice(0, 2).map(([q, a, w]) => ({ kind: 'quiz' as const, q, a, opts: shuf([a, ...w], r) }))
  const vs = pickVerses(b, t.books, r, 14); const cl = vs.slice(0, 6).map((v, i) => clozeQ(v, r, i === 0)).filter(Boolean).slice(0, 3) as GQ[]; const bk = vs.slice(6, 10).map(v => bookQ(v, b, r)).slice(0, 2)
  return [...words, ...cl, ...bk, ...quiz] }

function Play({ qs, title, onFinish, onExit }: { qs: GQ[]; title: string; onFinish: (s: number) => void; onExit: () => void }) {
  const [i, setI] = useState(0); const [score, setScore] = useState(0); const [g, setG] = useState(''); const [fb, setFb] = useState(''); const [done, setDone] = useState(false)
  const q = qs[i]
  const next = (ok: boolean) => { const s = score + (ok ? 1 : 0); setScore(s); setG(''); setFb(''); if (i + 1 >= qs.length) { setDone(true); onFinish(s) } else setI(i + 1) }
  const answer = (ok: boolean) => { if (fb) return; setFb(ok ? '✓ Correct!' : 'The answer was: ' + q.a); setTimeout(() => next(ok), ok ? 800 : 1600) }
  const check = () => answer(g.trim().toUpperCase() === q.a.toUpperCase())
  if (done) return <div className="sd-card text-center space-y-3 popin">{score >= qs.length / 2 && <Confetti />}<div className="text-5xl">{score === qs.length ? '🏆' : score >= qs.length / 2 ? '⭐' : '💪'}</div><h3 className="sd-gold font-bold text-2xl">{score} / {qs.length}</h3><p>{score === qs.length ? 'Perfect! 🎉' : score >= qs.length / 2 ? 'Well done! 👏' : 'Keep practicing! 💪'}</p><button className="sd-btn" onClick={onExit}>Back to games</button></div>
  return <div className="space-y-3"><div className="flex justify-between text-sm"><button className="underline" onClick={onExit}>← Back</button><span>{title} · {i + 1}/{qs.length}</span></div>
    <div className="h-1 rounded bg-white/10"><div className="h-1 rounded" style={{ width: `${i * 100 / qs.length}%`, background: 'var(--gold)' }} /></div>
    <div className={'sd-card space-y-3 text-center ' + (fb ? (fb.startsWith('✓') ? 'pulse-ok' : 'shake') : '')}>{q.kind === 'quiz' ? <><p className="font-semibold whitespace-pre-wrap">{q.q}</p>{q.opts!.map(o => <button key={o} className={'opt' + (fb && o === q.a ? ' on' : '')} onClick={() => answer(o === q.a)}>{o}</button>)}</>
      : <>{q.kind === 'scr' ? <><p className="text-sm opacity-70">Unscramble the word</p><div className="flex flex-wrap justify-center gap-2">{q.q.split('').map((c, k) => <span key={k} className="sd-chip on text-lg">{c}</span>)}</div></> : <><p className="text-sm opacity-70">Fill in the missing word</p><p className="font-semibold">“{q.q}”</p></>}
        {q.show && <p className="text-sm">Hint: {q.show}</p>}
        <input className="w-full rounded-lg px-3 py-2 text-center uppercase" value={g} onChange={e => setG(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} placeholder="Your answer" />
        <div className="flex gap-2 justify-center"><button className="sd-btn" onClick={check}>Check</button><button className="sd-chip" onClick={() => answer(false)}>Skip</button></div></>}
      <p className="h-5 text-sm">{fb}</p></div></div>
}

const LV: Record<string, number> = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10 }
function WordBuilder({ bible, onDone, onExit }: { bible: Bible; onDone: (p: number) => void; onExit: () => void }) {
  const vocab = vocabOf(bible)
  const mk = (seed: number, rd: boolean) => { const sev = Array.from(vocab).filter(w => w.length === 7).sort(); const w = sev[Math.floor(rng(seed)() * sev.length)] || 'kingdom'; const letters = shuf(w.split(''), rd ? Math.random : rng(seed + 1)); const ok = (x: string) => { const c: Record<string, number> = {}; letters.forEach(l => { c[l] = (c[l] || 0) + 1 }); for (const ch of x) { if (!c[ch]) return false; c[ch]-- } return true }; return { letters, all: Array.from(vocab).filter(x => x.length >= 3 && ok(x)) } }
  const [t, setT] = useState(() => mk(dayNum(todayStr()) + 1234, false)); const [found, setFound] = useState<string[]>([]); const [g, setG] = useState(''); const [msg, setMsg] = useState(''); const [fin, setFin] = useState(false)
  const pts = (w: string) => w.split('').reduce((a, c) => a + (LV[c] || 0), 0) + (w.length === 7 ? 20 : 0); const total = found.reduce((a, w) => a + pts(w), 0)
  const add = () => { const w = g.toLowerCase().trim(); setG(''); if (w.length < 3) return setMsg('Use at least 3 letters.'); if (found.includes(w)) return setMsg('You already found that.'); if (!t.all.includes(w)) return setMsg('Not a word from the Bible, or the letters do not fit.'); setFound([...found, w]); setMsg(`✓ ${w.toUpperCase()} +${pts(w)}`) }
  if (fin) return <div className="sd-card text-center space-y-3 popin">{total > 0 && <Confetti />}<div className="text-5xl">🔤</div><h3 className="sd-gold font-bold text-2xl">{total} points</h3><p>You found {found.length} of {t.all.length} words.</p><button className="sd-btn" onClick={onExit}>Back to games</button></div>
  return <div className="space-y-3 text-center"><div className="flex justify-between text-sm"><button className="underline" onClick={onExit}>← Back</button><span>Word Builder · {found.length}/{t.all.length} words</span></div>
    <div className="sd-card space-y-3"><p className="text-sm opacity-70">Make words from these letters. Every word must appear in the Bible.</p><div className="flex justify-center gap-2">{t.letters.map((c, k) => <span key={t.letters.join('') + k} style={{ animationDelay: k * 0.05 + 's' }} className="sd-chip on text-xl relative popin">{c.toUpperCase()}<sub className="text-[9px]">{LV[c]}</sub></span>)}</div>
      <input className="w-full rounded-lg px-3 py-2 text-center uppercase" value={g} onChange={e => setG(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Type a word" />
      <div className="flex gap-2 justify-center flex-wrap"><button className="sd-btn" onClick={add}>Add</button><button className="sd-chip" onClick={() => setT({ ...t, letters: shuf(t.letters, Math.random) })}>Shuffle</button><button className="sd-chip" onClick={() => { setT(mk(Math.floor(Math.random() * 1e6), true)); setFound([]); setMsg('') }}>New letters</button><button className="sd-chip" onClick={() => { onDone(Math.min(60, Math.floor(total / 3))); setFin(true) }}>Finish</button></div>
      <p className="h-5 text-sm">{msg}</p><p className="sd-gold font-bold">{total} points</p><div className="flex flex-wrap justify-center gap-1 text-sm">{found.map(w => <span key={w} className="sd-chip">{w}</span>)}</div></div></div>
}

const GOODREFS = ['John 3:16', 'Psalm 23:1', 'Philippians 4:13', 'Romans 8:28', 'Proverbs 3:5', 'Jeremiah 29:11', 'Isaiah 41:10', 'Matthew 11:28', 'John 14:6', 'Psalm 46:1', 'Romans 12:2', 'Joshua 1:9', '1 John 4:19', 'Psalm 119:105', 'John 1:1', 'Genesis 1:1', 'Matthew 5:16', 'Hebrews 11:1', '2 Timothy 1:7', 'Psalm 27:1', 'Proverbs 18:10', 'John 8:32', 'Ephesians 2:8', 'Romans 6:23', 'Psalm 118:24', 'Matthew 6:33', 'Isaiah 40:31', 'Psalm 121:1', 'John 15:5']
function VerseBuilder({ bible, onDone, onExit }: { bible: Bible; onDone: (p: number) => void; onExit: () => void }) {
  const pick = (r: () => number) => { for (const ref of shuf(GOODREFS, r)) { const h = parseRef(bible, ref)[0]; if (h && h.text.split(/\s+/).length <= 24) return h } return null }
  const init = (r: () => number) => { const h = pick(r); return { h, order: h ? shuf(h.text.split(/\s+/).map((_, i) => i), Math.random) : [] } }
  const [st, setSt] = useState(() => init(rng(dayNum(todayStr()) + 99))); const [built, setBuilt] = useState<number[]>([]); const [mist, setMist] = useState(0); const [done, setDone] = useState(false); const [paid, setPaid] = useState(false)
  const h = st.h; if (!h) return <p className="text-sm">No verse found.</p>
  const toks = h.text.split(/\s+/)
  const tap = (idx: number) => { if (done) return; if (toks[idx] === toks[built.length]) { const nb = [...built, idx]; setBuilt(nb); if (nb.length === toks.length) { setDone(true); if (!paid) { setPaid(true); onDone(Math.max(2, 10 - mist)) } } } else setMist(mist + 1) }
  const again = () => { setSt(init(Math.random)); setBuilt([]); setMist(0); setDone(false) }
  return <div className="space-y-3 text-center"><div className="flex justify-between text-sm"><button className="underline" onClick={onExit}>← Back</button><span>Verse Builder · {mist} mistakes</span></div>
    <div className="sd-card space-y-3"><p className="text-sm opacity-70">Tap the words in the right order to build the verse.</p><p className="min-h-[3rem] font-semibold">{built.map(i => toks[i]).join(' ') || '…'}</p>
      <div className="flex flex-wrap justify-center gap-2">{st.order.filter(i => !built.includes(i)).map(i => <button key={i} className="sd-chip popin" onClick={() => tap(i)}>{toks[i]}</button>)}</div>
      {done && <><Confetti /><p className="sd-gold font-bold popin">✓ {h.ref}</p><button className="sd-btn" onClick={again}>Another verse</button></>}</div></div>
}

function WordSearch({ theme, onDone, onExit }: { theme: GTheme; onDone: (p: number) => void; onExit: () => void }) {
  const N = 10
  const [g] = useState(() => { const r = rng(dayNum(todayStr()) + 5); const ws = shuf(theme.words.map(x => x[0]).filter(w => w.length <= N), r).slice(0, 6); const grid: string[][] = Array.from({ length: N }, () => Array(N).fill('')); const dirs = [[0, 1], [1, 0], [1, 1], [0, -1]]; const placed: string[] = []
    for (const w of ws) for (let t = 0; t < 80; t++) { const [dr, dc] = dirs[Math.floor(r() * dirs.length)]; const r0 = Math.floor(r() * N), c0 = Math.floor(r() * N); const r1 = r0 + dr * (w.length - 1), c1 = c0 + dc * (w.length - 1); if (r1 < 0 || r1 >= N || c1 < 0 || c1 >= N) continue; let ok = true; for (let k = 0; k < w.length; k++) { const ch = grid[r0 + dr * k][c0 + dc * k]; if (ch && ch !== w[k]) { ok = false; break } } if (!ok) continue; for (let k = 0; k < w.length; k++) grid[r0 + dr * k][c0 + dc * k] = w[k]; placed.push(w); break }
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!grid[i][j]) grid[i][j] = A[Math.floor(r() * 26)]
    return { grid, placed } })
  const [st, setSt] = useState<number[] | null>(null); const [path, setPath] = useState<string[]>([]); const [found, setFound] = useState<string[]>([]); const [cells, setCells] = useState<string[]>([]); const [paid, setPaid] = useState(false)
  const cellAt = (e: React.PointerEvent) => { const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null; const rc = el?.closest?.('[data-rc]')?.getAttribute('data-rc'); return rc ? rc.split(',').map(Number) : null }
  const line = (a: number[], b: number[]) => { const lr = b[0] - a[0], lc = b[1] - a[1]; const ar = Math.abs(lr), ac = Math.abs(lc); let dr = Math.sign(lr), dc = Math.sign(lc); if (ac > ar * 2) dr = 0; else if (ar > ac * 2) dc = 0; const n = dr === 0 ? ac : dc === 0 ? ar : Math.min(ar, ac); const out: string[] = []; for (let k = 0; k <= n; k++) { const x = a[0] + dr * k, y = a[1] + dc * k; if (x < 0 || y < 0 || x >= N || y >= N) break; out.push(x + ',' + y) } return out }
  const down = (e: React.PointerEvent<HTMLDivElement>) => { const c = cellAt(e); if (!c) return; e.currentTarget.setPointerCapture(e.pointerId); setSt(c); setPath([c.join(',')]) }
  const move = (e: React.PointerEvent) => { if (!st) return; const c = cellAt(e); if (c) setPath(line(st, c)) }
  const up = () => { if (!st) return; const str = path.map(p => { const [x, y] = p.split(',').map(Number); return g.grid[x][y] }).join(''); setSt(null); const w = path.length > 1 ? g.placed.find(p => p === str || p === str.split('').reverse().join('')) : undefined; const used = path; setPath([]); if (!w || found.includes(w)) return; const nf = [...found, w]; setFound(nf); setCells([...cells, ...used]); if (nf.length === g.placed.length && !paid) { setPaid(true); onDone(nf.length * 10) } }
  return <div className="space-y-3 text-center"><div className="flex justify-between text-sm"><button className="underline" onClick={onExit}>← Back</button><span>Word Search · {found.length}/{g.placed.length}</span></div>
    <p className="text-sm opacity-70">Swipe across the letters to find a word. Theme: {theme.emoji} {theme.name}</p>
    <div className="grid grid-cols-10 gap-1 sd-card !p-2" style={{ touchAction: 'none', userSelect: 'none' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>{g.grid.map((row, i) => row.map((c, j) => { const k = i + ',' + j; const f = cells.includes(k); const on = path.includes(k); return <div key={k} data-rc={k} className={'ws-cell aspect-square rounded grid place-items-center text-sm font-bold' + (f ? ' ws-found' : '')} style={{ background: f ? 'var(--gold)' : on ? 'rgba(212,160,23,.55)' : 'rgba(255,255,255,.07)', color: f ? '#1a1200' : undefined, transform: on ? 'scale(1.12)' : undefined }}>{c}</div> }))}</div>
    <div className="flex flex-wrap justify-center gap-2 text-sm">{g.placed.map(w => <span key={w} className={'sd-chip' + (found.includes(w) ? ' on line-through' : '')}>{w}</span>)}</div>
    {found.length === g.placed.length && <><Confetti /><p className="sd-gold font-bold popin">🎉 All words found!</p></>}</div>
}

function Games({ settings, opts, onJoin }: any) {
  const [themes, setThemes] = useState<GTheme[]>([]); const [gp, setGp] = useLS<any>('games', { streak: 0, last: '', done: {}, score: 0, level: 1 }); const [mode, setMode] = useState<any>(null)
  const en = opts.find((o: any) => /english/i.test(o.language || ''))?.id || settings.translation; const bible = useBible(en)
  useEffect(() => { get<GTheme[]>('games.json').then(arr(setThemes)).catch(() => {}) }, [])
  const [fbOK, setFbOK] = useState(false); useEffect(() => { fbLoad().then(c => setFbOK(!!c)) }, [])
  useEffect(() => () => { syncCommunity(ls('community', null), ls('games', { score: 0, level: 1, streak: 0 })) }, [])
  const day = todayStr(); const theme = themes.length ? themes[dayNum(day) % themes.length] : null; const best = gp.done?.[day]
  const award = (key: string, pts: number) => { if (gp.paid?.[key + day]) return; setGp({ ...gp, score: gp.score + pts, paid: { ...gp.paid, [key + day]: 1 } }) }
  const finishDaily = (sc: number) => { const streak = gp.last === day ? gp.streak : gp.last === todayStr(-1) ? gp.streak + 1 : 1; setGp({ ...gp, streak, last: day, done: { ...gp.done, [day]: Math.max(sc, best || 0) }, score: gp.score + (best === undefined ? sc * 10 : 0) }) }
  const finishLevel = (L: number, sc: number) => setGp({ ...gp, score: gp.score + sc * 5, level: sc >= 4 && L === gp.level ? Math.min(5, L + 1) : gp.level })
  const levelQs = (L: number): GQ[] => { const r = Math.random; const pool = themes.flatMap(t => t.words)
    const sc = (lo: number, hi: number, n: number, hint: boolean) => shuf(pool.filter(([w]) => w.length >= lo && w.length <= hi), r).slice(0, n).map(([w, h]) => ({ kind: 'scr' as const, q: scramble(w, r), a: w, show: hint ? h : '' }))
    const cl = (n: number, hint: boolean) => pickVerses(bible!, null, r, n * 3).map(v => clozeQ(v, r, hint)).filter(Boolean).slice(0, n) as GQ[]
    const bk = (n: number) => pickVerses(bible!, null, r, n).map(v => bookQ(v, bible!, r))
    return L === 1 ? sc(1, 6, 5, true) : L === 2 ? sc(7, 8, 5, true) : L === 3 ? [...sc(8, 12, 3, false), ...cl(2, true)] : L === 4 ? cl(5, true) : [...cl(3, false), ...bk(2)] }
  const exit = () => setMode(null)
  if (mode?.k === 'board') return <Board onExit={exit} onJoin={onJoin} />
  if (mode?.k === 'wb' && bible) return <WordBuilder bible={bible} onDone={p => award('wb', p)} onExit={exit} />
  if (mode?.k === 'vb' && bible) return <VerseBuilder bible={bible} onDone={p => award('vb', p)} onExit={exit} />
  if (mode?.k === 'ws' && theme) return <WordSearch theme={theme} onDone={p => award('ws', p)} onExit={exit} />
  if (mode?.qs) return <Play key={mode.title} qs={mode.qs} title={mode.title} onFinish={sc => mode.L ? finishLevel(mode.L, sc) : finishDaily(sc)} onExit={exit} />
  const names = ['Beginner', 'Reader', 'Scholar', 'Teacher', 'Master']; const infos = ['Short words, with hints', 'Longer words, with hints', 'Hard words and fill-in verses', 'Fill in the missing verse word', 'No hints: verses and books']
  const total = theme ? 9 : 0
  return <div className="space-y-4"><h2 className="font-bold sd-gold">Games</h2><div className="grid grid-cols-3 gap-2 text-center">{[['🔥', gp.streak, 'Streak'], ['⭐', gp.score, 'Points'], ['🏅', gp.level, 'Level']].map(([e, v, l]) => <div key={l as string} className="sd-card !p-2 popin"><div className="text-xl">{e}</div><div className="font-bold sd-gold text-lg">{v}</div><div className="text-[10px] uppercase opacity-60">{l}</div></div>)}</div>
    {theme ? <div className={card + ' game-hero space-y-2 rise'}><p className="text-xs uppercase opacity-60">Today's challenge · {day}</p><h3 className="text-lg font-bold">{theme.emoji} {theme.name}</h3><p className="text-sm opacity-80">{theme.intro}</p>
      <button className="sd-btn" disabled={!bible} onClick={() => bible && setMode({ qs: buildDaily(theme, bible, day), title: theme.name })}>{!bible ? 'Loading the Bible…' : best !== undefined ? `Play again (best ${best}/${total})` : "Start today's challenge"}</button></div> : <p className="text-sm">Loading today's challenge…</p>}
    <h3 className="font-semibold">More games</h3>
    {[['wb', '🔤', 'Word Builder', 'Make words from 7 letters, Scrabble style'], ['vb', '🧩', 'Verse Builder', 'Tap the words in the right order'], ['ws', '🔎', 'Word Search', "Find today's hidden Bible words"]].map(([k, e, n, d], ix) => <button key={k} style={{ animationDelay: ix * 0.08 + 's' }} disabled={!bible || !theme} className={card + ' game-tile rise flex w-full text-left gap-3 items-center'} onClick={() => setMode({ k })}><span className="tile-ico">{e}</span><span><b className="sd-gold">{n}</b><span className="block text-xs opacity-70">{d}</span></span></button>)}
    {fbOK && <button className={card + ' game-tile rise flex w-full text-left gap-3 items-center'} onClick={() => setMode({ k: 'board' })}><span className="tile-ico">🏆</span><span><b className="sd-gold">Leaderboard</b><span className="block text-xs opacity-70">See how you rank this week</span></span></button>}
    <h3 className="font-semibold">Levels</h3>
    {names.map((n, k) => { const L = k + 1; const open = L <= gp.level; return <button key={L} disabled={!open || !themes.length || (L > 2 && !bible)} className={card + ' game-tile block w-full text-left' + (open ? '' : ' opacity-50')} onClick={() => setMode({ L, qs: levelQs(L), title: 'Level ' + L })}><b className="sd-gold">{open ? '' : '🔒 '}Level {L} · {n}</b><span className="block text-xs opacity-70">{infos[k]} · get 4 of 5 right to unlock the next</span></button> })}
    <p className="text-xs opacity-60 text-center">New questions come from the Bible every day.</p></div>
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
  useBN()
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
      {(more ? sec.items : sec.items.slice(0, 8)).map((it: Hit, k: number) => <div key={k} className={card + ' space-y-2'}><b className="sd-gold">{refL(it, bible?.meta.language)}</b><p style={readerStyle(settings)}>{it.text}</p><div className="flex gap-2"><button className="sd-chip" onClick={() => open(it)}>Open chapter</button><button className="sd-chip" onClick={() => navigator.clipboard?.writeText(`${refL(it, bible?.meta.language)} — ${it.text}`)}>Copy</button></div></div>)}</div>)}
    {res?.sections.some((x: any) => x.items.length > 8) && !more && <button className="sd-chip" onClick={() => setMore(true)}>Show all results</button>}
    {res?.kind === 'none' && <p className="text-sm">No match. Try one word, a verse like John 3:16, or one of the topics above.</p>}
    {(theme.contact?.whatsapp || theme.contact?.email) && <div className="sd-card space-y-2"><p className="text-sm">Have a deeper question? Ask your church team.</p><div className="flex gap-2">{theme.contact.whatsapp && <a className="sd-btn" href={`https://wa.me/${theme.contact.whatsapp}?text=${encodeURIComponent(q)}`}>WhatsApp</a>}{theme.contact.email && <a className="sd-chip" href={`mailto:${theme.contact.email}?subject=Question&body=${encodeURIComponent(q)}`}>Email</a>}</div></div>}
    <p className="text-xs opacity-60 text-center">{bible ? bible.meta.name + ' · ' : ''}This helper finds Scripture for you. It does not interpret it. For deeper questions, speak with your pastor.</p></div>
}

const VOTD = ['John 3:16', 'Psalm 23:1', 'Philippians 4:13', 'Romans 8:28', 'Proverbs 3:5', 'Jeremiah 29:11', 'Isaiah 41:10', 'Matthew 11:28', 'John 14:6', 'Psalm 46:1', 'Romans 12:2', 'Joshua 1:9', '1 John 4:19', 'Psalm 119:105', 'John 1:1', 'Genesis 1:1', 'Matthew 5:16', 'Hebrews 11:1', '2 Timothy 1:7', 'Psalm 27:1', 'Proverbs 18:10', 'John 8:32', 'Ephesians 2:8', 'Romans 6:23', 'Psalm 118:24', 'Matthew 6:33', 'Isaiah 40:31', 'Psalm 121:1', 'John 15:5', 'Psalm 34:8', 'Psalm 37:4', 'Psalm 91:1', 'Psalm 119:11', 'Psalm 139:14', 'Proverbs 16:3', 'Proverbs 22:6', 'Ecclesiastes 3:1', 'Isaiah 26:3', 'Isaiah 53:5', 'Lamentations 3:22', 'Micah 6:8', 'Matthew 5:9', 'Matthew 6:34', 'Matthew 7:7', 'Matthew 28:20', 'Mark 10:27', 'Luke 1:37', 'John 10:10', 'John 13:34', 'John 14:27', 'John 16:33', 'Acts 1:8', 'Romans 5:8', 'Romans 10:9', 'Romans 15:13', '1 Corinthians 13:4', '1 Corinthians 13:13', '1 Corinthians 16:14', '2 Corinthians 5:7', '2 Corinthians 5:17', '2 Corinthians 12:9', 'Galatians 2:20', 'Galatians 5:22', 'Ephesians 4:32', 'Ephesians 6:10', 'Philippians 4:6', 'Philippians 4:7', 'Philippians 1:6', 'Colossians 3:23', '1 Thessalonians 5:16', '1 Thessalonians 5:17', '1 Thessalonians 5:18', '2 Thessalonians 3:3', '1 Timothy 4:12', '2 Timothy 3:16', 'Hebrews 4:12', 'Hebrews 13:8', 'James 1:5', 'James 1:17', 'James 4:8', '1 Peter 5:7', '2 Peter 3:9', '1 John 1:9', '1 John 4:4', '1 John 4:8', 'Revelation 3:20', 'Revelation 21:4', 'Deuteronomy 31:6', 'Joshua 24:15', '1 Samuel 16:7', 'Psalm 16:11', 'Psalm 19:14', 'Psalm 28:7', 'Psalm 30:5', 'Psalm 32:8', 'Psalm 51:10', 'Psalm 56:3', 'Psalm 62:1', 'Psalm 73:26', 'Psalm 90:12', 'Psalm 100:4', 'Psalm 103:1', 'Psalm 107:1', 'Psalm 145:18', 'Proverbs 4:23', 'Proverbs 15:1', 'Proverbs 17:17']
const notif = () => { try { const c = (window as any).Capacitor; return c?.isNativePlatform?.() ? c.Plugins?.LocalNotifications || null : null } catch { return null } }
const verseFor = (b: Bible, day: number): Hit | null => { const order = shuf(VOTD, rng(Math.floor(day / VOTD.length) + 11)); for (let k = 0; k < order.length; k++) { const h = parseRef(b, order[(day + k) % order.length])[0]; if (h) return h } return null }
const vnumOf = (h: Hit) => Number((h.ref.match(/:(\d+)/) || [])[1]) || 0
const famFor = (t: string) => /[\u0B80-\u0BFF]/.test(t) ? "'Noto Sans Tamil','Nirmala UI','Latha','Tamil Sangam MN',sans-serif" : /[\u0D80-\u0DFF]/.test(t) ? "'Noto Sans Sinhala','Nirmala UI','Iskoola Pota','Sinhala Sangam MN',sans-serif" : ''
const verseImage = async (h: Hit, refText: string): Promise<Blob | null> => {
  try { await (document as any).fonts?.ready } catch { /* ignore */ }
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#2a1f05'); g.addColorStop(1, '#0b0b0f'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920)
  x.strokeStyle = '#d4a017'; x.lineWidth = 6; x.strokeRect(60, 60, 960, 1800); x.textAlign = 'left'; x.textBaseline = 'alphabetic'
  const ct = (t: string, yy: number) => x.fillText(t, 540 - x.measureText(t).width / 2, yy)
  x.fillStyle = '#d4a017'; x.font = '600 44px sans-serif'; ct('✦  VERSE OF THE DAY  ✦', 600)
  const fam = famFor(h.text) || 'Georgia, serif'; const style = famFor(h.text) ? '' : 'italic '; const maxW = 820, top = 680, bottom = 1500; const nonLatin = !!famFor(h.text)
  const wrap = (t: string) => { const out: string[] = []; let cur = ''; for (const w of t.split(/\s+/)) { const n = cur ? cur + ' ' + w : w; if (x.measureText(n).width > maxW && cur) { out.push(cur); cur = w } else cur = n } out.push(cur); return out }
  let size = nonLatin ? 52 : 60; let lines: string[] = []; let lh = 0
  for (; size >= 30; size -= 2) { x.font = `${style}${size}px ${fam}`; lines = wrap(h.text); lh = Math.round(size * (nonLatin ? 1.7 : 1.4)); if (Math.max(...lines.map(l => x.measureText(l).width)) <= maxW + 1 && lines.length * lh <= bottom - top) break }
  x.fillStyle = '#fdf3d0'; let y = top + ((bottom - top) - lines.length * lh) / 2 + lh * 0.75; for (const l of lines) { ct(l, y); y += lh }
  x.fillStyle = '#d4a017'; const rf = famFor(refText) || 'sans-serif'; let rs = 54; for (; rs >= 28; rs -= 2) { x.font = `700 ${rs}px ${rf}`; if (x.measureText(refText).width <= 880) break }
  ct(refText, Math.min(y + 40, 1640))
  x.globalAlpha = 0.6; x.fillStyle = '#fdf3d0'; x.font = '34px sans-serif'; ct('Salem Daily', 1790)
  return new Promise(res => c.toBlob(b => res(b), 'image/png')) }

function VerseOfDay({ settings }: any) {
  useBN()
  const [pv, setPv] = useState('')
  const bible = useBible(settings.translation); const h = bible ? verseFor(bible, dayNum(todayStr())) : null
  if (!h) return <div className="sd-card verse-card"><p className="text-sm opacity-70">Loading today's verse…</p></div>
  const open = () => { localStorage.setItem('sd:goto', JSON.stringify({ book: h.book, ch: h.ch, v: vnumOf(h) })); location.hash = '#/bible' }
  const share = async () => { const text = `“${h.text}” — ${refL(h, bible?.meta.language)}`; try { if (typeof navigator.share === 'function') await navigator.share({ text }); else { await navigator.clipboard?.writeText(text); alert('Verse copied.') } } catch { /* cancelled */ } }
  const picture = async () => { const b = await verseImage(h, refL(h, bible?.meta.language)); if (!b) return
    const P = (window as any).Capacitor?.isNativePlatform?.() ? (window as any).Capacitor.Plugins : null
    if (P?.Filesystem && P?.Share) { try { const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(b) }); const w = await P.Filesystem.writeFile({ path: 'verse-of-the-day.png', data, directory: 'CACHE' }); await P.Share.share({ title: 'Verse of the day', files: [w.uri] }); return } catch { /* fall through */ } }
    const f = new File([b], 'verse-of-the-day.png', { type: 'image/png' }); try { if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f] }); return } } catch { /* fall through */ }
    if (P) { setPv(URL.createObjectURL(b)); return }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'verse-of-the-day.png'; a.click() }
  return <div className="sd-card verse-card rise" role="button" onClick={open}>
    <div className="text-xs tracking-widest uppercase sd-gold">✨ Verse of the day · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <p className="verse-text">“{h.text}”</p>
    <div className="flex items-center justify-between"><b className="sd-gold">{refL(h, bible?.meta.language)}</b><span className="text-xs opacity-60">Tap to read the chapter ›</span></div>
    <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}><button className="sd-chip" onClick={share}>↗ Share</button><button className="sd-chip" onClick={picture}>🖼 Save as picture</button></div>{pv && createPortal(<div className="fixed inset-0 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.92)', zIndex: 90 }} onClick={e => { e.stopPropagation(); setPv('') }}><div className="text-center space-y-3 max-w-xs"><img src={pv} alt="Verse of the day" className="rounded-xl max-h-[70vh] mx-auto" /><p className="text-sm">Take a screenshot to keep this picture, then tap anywhere to close.</p></div></div>, document.body)}</div>
}

function Reminder({ settings, remind }: any) {
  const bible = useBible(settings.translation)
  useEffect(() => { const n = notif(); if (!n) return
    ;(async () => { try { await bnLoad(); const pend = await n.getPending(); if (pend?.notifications?.length) await n.cancel({ notifications: pend.notifications }); if (!remind.on || !bible) return
      const p = await n.requestPermissions(); if (p.display !== 'granted') return
      const [hh, mm] = (remind.time || '07:00').split(':').map(Number); const list: any[] = []
      for (let k = 0; k < 30; k++) { const at = new Date(); at.setDate(at.getDate() + k); at.setHours(hh, mm, 0, 0); if (at.getTime() < Date.now() + 30000) continue; const v = verseFor(bible, dayNum(todayStr(k))); if (v) list.push({ id: 2000 + k, title: '📖 Verse of the day', body: `${v.text} — ${refL(v, bible.meta.language)}`, schedule: { at, allowWhileIdle: true } }) }
      if (list.length) await n.schedule({ notifications: list }) } catch { /* ignore */ } })() }, [bible?.meta.id, remind.on, remind.time])
  return null
}

type FB = { projectId: string; apiKey: string }
let FBC: FB | null | undefined
const fbLoad = async (): Promise<FB | null> => { if (FBC !== undefined) return FBC; try { const j = await get<FB>('firebase.json'); FBC = j?.projectId && j?.apiKey ? j : null } catch { FBC = null } return FBC }
const fbBase = (c: FB) => `https://firestore.googleapis.com/v1/projects/${c.projectId}/databases/(default)/documents`
const fbSet = async (c: FB, path: string, data: Record<string, string | number>) => { const mask = Object.keys(data).map(k => 'updateMask.fieldPaths=' + k).join('&'); const fields: any = {}; for (const k in data) fields[k] = typeof data[k] === 'number' ? { integerValue: String(Math.round(data[k] as number)) } : { stringValue: data[k] }
  const r = await fetch(`${fbBase(c)}/${path}?${mask}&key=${c.apiKey}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }); if (!r.ok) throw new Error('save ' + r.status) }
const fbDel = (c: FB, path: string) => fetch(`${fbBase(c)}/${path}?key=${c.apiKey}`, { method: 'DELETE' })
const fbTop = async (c: FB, parent: string) => { const r = await fetch(`${fbBase(c)}${parent ? '/' + parent : ''}:runQuery?key=${c.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'players' }], orderBy: [{ field: { fieldPath: 'points' }, direction: 'DESCENDING' }], limit: 20 } }) })
  if (!r.ok) throw new Error('read ' + r.status); const j = await r.json(); return (j as any[]).filter(x => x.document).map(x => { const f = x.document.fields || {}; return { id: String(x.document.name).split('/').pop() || '', name: f.name?.stringValue || '', points: Number(f.points?.integerValue || 0), level: Number(f.level?.integerValue || 1), streak: Number(f.streak?.integerValue || 0) } }) }
const weekId = () => 'w' + Math.floor((dayNum(todayStr()) + 3) / 7)
const newId = () => { const t = (crypto.randomUUID?.() || '').replace(/-/g, '') || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)); return t.padEnd(20, '0').slice(0, 20) }
const syncCommunity = async (cm: any, gp: any) => { const c = await fbLoad(); if (!c || !cm?.id || !(cm.count || cm.board)) return; const wk = weekId()
  try { if (cm.count) await fbSet(c, `installs/${cm.id}`, { first: cm.first || todayStr(), last: todayStr(), lang: (navigator.language || 'en').slice(0, 10), platform: (window as any).Capacitor?.isNativePlatform?.() ? 'app' : 'web' })
    const nick = (cm.nick || '').trim().slice(0, 20); if (cm.board && nick.length >= 2) { let wb = ls<any>('weekBase', null); if (!wb || wb.wk !== wk) { wb = { wk, base: gp.score || 0 }; localStorage.setItem('sd:weekBase', JSON.stringify(wb)) }
      const d = { name: nick, points: gp.score || 0, level: gp.level || 1, streak: gp.streak || 0 }; await fbSet(c, `players/${cm.id}`, d); await fbSet(c, `weeks/${wk}/players/${cm.id}`, { ...d, points: Math.max(0, (gp.score || 0) - wb.base) }) } } catch { /* offline or not set up */ } }
const removeOnline = async (cm: any, what: 'all' | 'board') => { const c = await fbLoad(); if (!c || !cm?.id) return; const old = ls<any>('weekBase', null)?.wk
  try { await Promise.all([fbDel(c, `players/${cm.id}`), fbDel(c, `weeks/${weekId()}/players/${cm.id}`), old ? fbDel(c, `weeks/${old}/players/${cm.id}`) : Promise.resolve(), what === 'all' ? fbDel(c, `installs/${cm.id}`) : Promise.resolve()]) } catch { /* offline */ } }

function Consent({ cm, name, onSave, onClose }: any) {
  const [count, setCount] = useState(cm.count ?? true); const [board, setBoard] = useState(cm.board ?? false); const [nick, setNick] = useState(cm.nick || (name || '').split(' ')[0].slice(0, 20))
  const ok = !board || nick.trim().length >= 2
  return createPortal(<div className="fixed inset-0 grid place-items-center p-5 overflow-auto" style={{ background: 'rgba(0,0,0,.88)', zIndex: 85 }}><div className="sd-card space-y-3 max-w-sm w-full popin">
    <div className="text-4xl text-center">🤝</div><h3 className="sd-gold font-bold text-lg text-center">Join the community? (optional)</h3>
    <p className="text-sm">You can compete with other readers and help us see how many people use Salem Daily. Nothing is shared unless you switch it on. We never collect your email, phone number or location.</p>
    <label className="flex items-start justify-between gap-3 text-sm"><span><b>Count me as a user</b><span className="block text-xs opacity-70">Shares a random number, your language and the date you last opened the app. No name.</span></span><input type="checkbox" checked={count} onChange={e => setCount(e.target.checked)} /></label>
    <label className="flex items-start justify-between gap-3 text-sm"><span><b>Show me on the leaderboard</b><span className="block text-xs opacity-70">Shares your nickname, points, level and streak with other players.</span></span><input type="checkbox" checked={board} onChange={e => setBoard(e.target.checked)} /></label>
    {board && <input className="w-full rounded-lg px-3 py-2" maxLength={20} placeholder="Choose a nickname (use a nickname, not your full name)" value={nick} onChange={e => setNick(e.target.value)} />}
    <p className="text-xs opacity-60">You can change this or delete your online data any time in Settings.</p>
    <div className="flex gap-2 justify-center"><button className="sd-chip" onClick={onClose}>Not now</button><button className="sd-btn" disabled={!ok} onClick={() => onSave({ ...cm, decided: true, id: cm.id || newId(), first: cm.first || todayStr(), count, board, nick: nick.trim() })}>Save</button></div></div></div>, document.body)
}

function Board({ onExit, onJoin }: { onExit: () => void; onJoin: () => void }) {
  const cm = ls<any>('community', {}); const [tab, setTab] = useState<'week' | 'all'>('week'); const [rows, setRows] = useState<any[] | null>(null); const [err, setErr] = useState(false)
  const load = async () => { setRows(null); setErr(false); const c = await fbLoad(); if (!c) return setErr(true); try { setRows(await fbTop(c, tab === 'week' ? `weeks/${weekId()}` : '')) } catch { setErr(true) } }
  useEffect(() => { load() }, [tab])
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] || String(i + 1)
  return <div className="space-y-3"><div className="flex justify-between text-sm"><button className="underline" onClick={onExit}>← Back</button><button className="sd-chip" onClick={load}>↻ Refresh</button></div>
    <h2 className="font-bold sd-gold text-lg">🏆 Leaderboard</h2>
    <div className="flex gap-2"><button className={'sd-chip' + (tab === 'week' ? ' on' : '')} onClick={() => setTab('week')}>This week</button><button className={'sd-chip' + (tab === 'all' ? ' on' : '')} onClick={() => setTab('all')}>All time</button></div>
    {!cm.board && <div className="sd-card space-y-2 text-sm"><p>Join to appear on the board. You choose a nickname, and you can leave any time.</p><button className="sd-btn" onClick={onJoin}>Join the leaderboard</button></div>}
    {err && <p className="text-sm opacity-70">The leaderboard could not load. Check your internet and try again.</p>}
    {!err && !rows && <p className="text-sm">Loading…</p>}
    {rows && !rows.length && <p className="text-sm opacity-70">No one is on the board yet. Play a game and be the first!</p>}
    {rows?.map((r, i) => <div key={r.id} className={'sd-card flex items-center gap-3 popin' + (r.id === cm.id ? ' ring-2' : '')} style={{ animationDelay: i * 0.04 + 's', ...(r.id === cm.id ? { boxShadow: '0 0 0 2px var(--gold)' } : {}) }}><span className="w-8 text-center text-lg">{medal(i)}</span><span className="flex-1"><b>{r.name}{r.id === cm.id ? ' (you)' : ''}</b><span className="block text-xs opacity-60">Level {r.level} · 🔥 {r.streak}</span></span><b className="sd-gold">{r.points}</b></div>)}</div>
}

function SelReader({ rate }: { rate: number }) {
  const [t, setT] = useState('')
  useEffect(() => { const f = () => setT((getSelection()?.toString() || '').trim()); document.addEventListener('selectionchange', f); return () => document.removeEventListener('selectionchange', f) }, [])
  if (t.length < 2 || !speechOK()) return null
  return createPortal(<button className="sd-btn" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(6.5rem + env(safe-area-inset-bottom))', zIndex: 60 }} onPointerDown={e => { e.preventDefault(); speak([t], langOf(t), rate, undefined, undefined, m => alert('Could not play the voice (' + (m || 'unknown') + ')')) }}>🔊 Read selection</button>, document.body)
}

const repair = async () => { try { const rs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((rs || []).map(r => r.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))) } catch { /* ignore */ } location.reload() }

function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const slides = [['📖', 'Read the Bible', 'Choose your Bible, listen to it, highlight verses and keep your notes.'], ['📅', 'Follow a plan', 'Start a reading plan and move through each day, one step at a time.'], ['🎮', 'Play and grow', 'Daily Bible games, good books to read and help finding verses.']]
  const [e, t, d] = slides[i]
  return createPortal(<div className="fixed inset-0 grid place-items-center p-6" style={{ background: 'rgba(0,0,0,.85)', zIndex: 80 }}><div key={i} className="sd-card text-center space-y-3 max-w-sm w-full popin"><div className="text-5xl">{e}</div><h3 className="sd-gold font-bold text-xl">{t}</h3><p className="text-sm">{d}</p>
    <div className="flex justify-center gap-1">{slides.map((_, k) => <span key={k} className="h-1.5 w-6 rounded" style={{ background: k === i ? 'var(--gold)' : 'rgba(255,255,255,.2)' }} />)}</div>
    <div className="flex gap-2 justify-center"><button className="sd-chip" onClick={onDone}>Skip</button><button className="sd-btn" onClick={() => i < slides.length - 1 ? setI(i + 1) : onDone()}>{i < slides.length - 1 ? 'Next' : "Let's start"}</button></div></div></div>, document.body)
}

export default function App() {
  const route = useHash(); const [name, setName] = useLS('name', ''); const [saved, setSettings] = useLS<any>('settings', {}); const settings: any = { translation: 'sample', font: 18, mode: 'dark', accent: '#d4a017', serif: false, spacing: 1.6, vnums: true, motion: true, ...saved }
  const [verse, setVerse] = useState<{ ref: string; text: string } | null>(null); const [cm, setCm] = useLS<any>('community', { decided: false }); const [fbOK, setFbOK] = useState(false); const [cmOpen, setCmOpen] = useState(false)
  useEffect(() => { fbLoad().then(c => setFbOK(!!c)) }, [])
  useEffect(() => { syncCommunity(cm, ls('games', { score: 0, level: 1, streak: 0 })) }, [cm])
  const [remind, setRemind] = useLS<{ on: boolean; time: string }>('verseRemind', { on: false, time: '07:00' }); const [stale, setStale] = useState(false); const [tour, setTour] = useLS<boolean>('tourDone', false)
  useEffect(() => { if (!localStorage.getItem('sd:firstUse')) localStorage.setItem('sd:firstUse', JSON.stringify(Date.now()))
    const chk = () => fetch(B + 'version.json', { cache: 'no-store' }).then(r => r.json()).then(j => { if (j?.v && j.v !== __BUILD__) { if (!sessionStorage.getItem('sd-upd')) { sessionStorage.setItem('sd-upd', '1'); repair() } else setStale(true) } }).catch(() => {})
    chk(); const f = () => { if (!document.hidden) chk() }; document.addEventListener('visibilitychange', f); const t = setInterval(chk, 300000); return () => { document.removeEventListener('visibilitychange', f); clearInterval(t) } }, [])
  const [ttsRate] = useLS<number>('ttsRate', 1); const [theme, setTheme] = useState<any>({}); const [hi, setHi] = useState(0); const [bl, setBl] = useState<Entry[]>([]); const [cb2] = useLS<Bible[]>('customBibles', [])
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
  return <div className="min-h-screen"><div className="max-w-2xl mx-auto p-4 space-y-4"><SelReader rate={ttsRate} /><Reminder settings={settings} remind={remind} />{!tour && <Tour onDone={() => setTour(true)} />}{fbOK && tour && (!cm.decided || cmOpen) && <Consent cm={cm} name={name} onSave={(v: any) => { setCm(v); setCmOpen(false) }} onClose={() => { if (!cm.decided) setCm({ ...cm, decided: true }); setCmOpen(false) }} />}{stale && <div className="sd-card flex items-center justify-between gap-2"><span className="text-sm">✨ A new version is ready</span><button className="sd-btn" onClick={repair}>Update now</button></div>}
    <header className="flex justify-between items-center"><h1 className="text-xl font-bold sd-gold flex items-center gap-2"><img src={B + 'icons/icon.png'} alt="" className="w-9 h-9 rounded-xl glow" />{theme.appName || 'Salem Daily'}</h1>
      <nav className="flex flex-wrap justify-end gap-x-3 text-sm">{[['', 'Home'], ['bible', 'Bible'], ['books', 'Books'], ['plans', 'Plans'], ['ask', 'Ask'], ['settings', 'Settings']].map(([r, l]) => <a key={r} href={'#/' + r} className={'tab' + (tab === r ? ' active' : '')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[r]} /></svg><span>{l}</span></a>)}</nav></header>
    {tab === 'plans' && opts.length > 1 && <BiblePicker opts={opts} settings={settings} setSettings={setSettings} block />}
    <div key={tab} className="rise space-y-4">
    {tab === '' && <div className="space-y-3">{heroSrc && <div className="overflow-hidden rounded-2xl"><img key={heroSrc} src={B + heroSrc} alt="" className="w-full max-h-64 object-cover kenburns rise" onError={e => (e.currentTarget.style.display = 'none')} /></div>}<h2 className="text-lg rise">Hello, {name}</h2>{theme.tagline && <p className="text-sm opacity-70">{theme.tagline}</p>}<VerseOfDay settings={settings} />{Date.now() - (ls<number>('lastBackup', 0) || ls<number>('firstUse', Date.now())) > 30 * 864e5 && <a href="#/settings" className="sd-card block text-sm rise">💾 It has been a while. Back up your notes and progress in Settings.</a>}<div className="grid grid-cols-2 gap-3">{[['ask', '🔎', 'Ask & search'], ['bible', '📖', 'Read the Bible'], ['plans', '📅', 'My plans'], ['books', '📚', 'Books'], ['games', '🎮', 'Word game'], ['saved', '🔖', 'Saved verses']].map(([r, e, l]) => <a key={r} href={'#/' + r} className="sd-card text-center rise"><div className="text-2xl">{e}</div><div className="text-sm">{l}</div></a>)}</div></div>}
    {tab === 'bible' && <Bible settings={settings} setSettings={setSettings} opts={opts} />}
    {(tab === 'books' || tab === 'devotions') && <Books settings={settings} />}
    {tab === 'plans' && <Plans settings={settings} />}
    {tab === 'saved' && <Saved />}
    {tab === 'games' && <Games settings={settings} opts={opts} onJoin={() => setCmOpen(true)} />}
    {tab === 'ask' && <Ask settings={settings} theme={theme} opts={opts} />}
    {tab === 'admin' && <Admin />}
    {tab === 'settings' && <SettingsPage name={name} setName={setName} settings={settings} setSettings={setSettings} opts={opts} restore={restore} theme={theme} remind={remind} setRemind={setRemind} cm={cm} setCm={setCm} fbOK={fbOK} />}
    </div>
  </div></div>
}

function Welcome({ onDone }: { onDone: (n: string) => void }) {
  const [n, setN] = useState('')
  return <div className="min-h-screen grid place-items-center p-6"><div className="max-w-sm w-full space-y-3 text-center"><img src={B + 'icons/icon.png'} alt="" className="w-28 h-28 mx-auto rounded-3xl glow" /><h1 className="text-3xl font-bold sd-gold">Salem Daily</h1><p>What should we call you? Your name stays on this device.</p>
    <input className="border rounded px-3 py-2 w-full" value={n} onChange={e => setN(e.target.value)} placeholder="Your name" /><button className={btn} disabled={!n.trim()} onClick={() => onDone(n.trim())}>Continue</button></div></div>
}
