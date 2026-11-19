import { useEffect, useState, type ReactNode } from 'react'
const B = import.meta.env.BASE_URL
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(B + 'data/' + p); if (!r.ok) throw new Error(p); return r.json() }
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
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
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
  return <><div className="sheet-back" onClick={onClose} /><div className="sheet"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30" /><h3 className="sd-gold font-bold mb-3">{title}</h3>{children}</div></>
}

function BiblePicker({ opts, settings, setSettings, block }: any) {
  const [open, setOpen] = useState(false)
  const cur = opts.find((o: any) => o.id === settings.translation) || opts[0]
  if (!cur) return null
  return <><button className={'sd-chip flex items-center gap-2' + (block ? ' w-full justify-between' : '')} onClick={() => setOpen(true)}><span>📖 {cur.name}</span><span>▾</span></button>
    {open && <Sheet title="Choose a Bible" onClose={() => setOpen(false)}>{opts.map((o: any) => <button key={o.id} className={'opt' + (o.id === cur.id ? ' on' : '')} onClick={() => { setSettings({ ...settings, translation: o.id }); setOpen(false) }}>{o.name}{o.language && <span className="block text-xs opacity-70">{o.language}</span>}</button>)}</Sheet>}</>
}

function Bible({ settings }: { settings: any }) {
  const [idx, setIdx] = useState<Entry[]>([]); const tid: string = settings.translation; const [bible, setBible] = useState<Bible | null>(null)
  const [pick, setPick] = useState(''); const [bi, setBi] = useState(0); const [ci, setCi] = useState(0); const [q, setQ] = useState('')
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

      <button className="sd-chip" onClick={() => setPick('book')}>{book.name} ▾</button><button className="sd-chip" onClick={() => setPick('ch')}>Chapter {ci + 1} ▾</button>
      {pick === 'book' && <Sheet title="Choose a book" onClose={() => setPick('')}>{(bible.books.length === 66 ? [['Old Testament', 0, 39], ['New Testament', 39, 66]] : [['Books', 0, bible.books.length]]).map(([t, a, z]: any) => <div key={t}><h4 className="text-xs uppercase opacity-60 mb-2">{t}</h4><div className="grid grid-cols-2 gap-2 mb-4">{bible.books.slice(a, z).map((b, k) => <button key={a + k} className={'opt !mb-0' + (a + k === bi ? ' on' : '')} onClick={() => { setBi(a + k); setCi(0); setPick('') }}>{b.name}</button>)}</div></div>)}</Sheet>}
      {pick === 'ch' && <Sheet title={book.name} onClose={() => setPick('')}><div className="grid grid-cols-5 gap-2">{book.chapters.map((_, i) => <button key={i} className={'opt !mb-0 text-center' + (i === ci ? ' on' : '')} onClick={() => { setCi(i); setPick('') }}>{i + 1}</button>)}</div></Sheet>}
    </div>
    <input className={card + ' w-full'} placeholder="Search this translation…" value={q} onChange={e => setQ(e.target.value)} />
    {hits.map((h, k) => <p key={k} className="text-sm">{h.b} {h.i + 1}:{h.v + 1} — {h.t}</p>)}
    <div style={readerStyle(settings)} className="space-y-2">{verses.map((t, v) => { const m = marks[key(v)] || {}; return <p key={v} style={{ background: m.color }} className="rounded px-1">
      {settings.vnums && <sup className="mr-1">{v + 1}</sup>}{t} <button title="bookmark" onClick={() => set(v, { bookmark: !m.bookmark })}>{m.bookmark ? '★' : '☆'}</button>{' '}
      {['#fde68a', '#bbf7d0', '#bfdbfe', undefined].map((c, i) => <button key={i} onClick={() => set(v, { color: c })} className="inline-block w-3 h-3 rounded-full border ml-1" style={{ background: c || 'transparent' }} />)}
      <button className="ml-2 text-xs" onClick={() => { const n = prompt('Note', m.note || ''); if (n !== null) set(v, { note: n }) }}>✎</button>{m.note && <em className="block text-xs opacity-70">{m.note}</em>}</p> })}</div></div>
}

function Plans({ settings }: { settings: any }) {
  const [plans, setPlans] = useState<Plan[]>([]); const [sel, setSel] = useState(''); const [open, setOpen] = useState<number | null>(null); const [sw, setSw] = useState(false)
  const [items, setItems] = useLS<string[]>('planItems', [])
  const [idx, setIdx] = useState<Entry[]>([]); const [bible, setBible] = useState<Bible | null>(null); const [custom] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Plan[]>('plans/plans.json').then(setPlans).catch(() => {}); get<Entry[]>('bibles/index.json').then(setIdx).catch(() => {}) }, [])
  useEffect(() => { const c = custom.find(b => b.meta.id === settings.translation); if (c) { setBible(c); return } const e = idx.find(x => x.id === settings.translation) || idx[0]; if (e) get<Bible>('bibles/' + e.path).then(setBible).catch(() => setBible(null)) }, [idx, custom, settings.translation])
  const refOf = (r: PRead) => `${r.book} ${r.from}${r.vFrom ? ':' + r.vFrom + (r.vTo && r.vTo > r.vFrom ? '–' + r.vTo : '') : r.to > r.from ? '–' + r.to : ''}`
  const reads = (r: PDay): PRead[] => [r as PRead, ...(r.more || [])].filter(x => x.book)
  const reading = (r: PRead) => { const bk = bible?.books.find(b => b.name.toLowerCase() === r.book.toLowerCase()); if (!bk) return <p className="text-sm">"{r.book}" is not in the selected Bible.</p>
    if (r.vFrom) return <div>{(bk.chapters[r.from - 1] || []).slice(r.vFrom - 1, r.vTo || r.vFrom).map((t, v) => <p key={v}><sup>{r.vFrom! + v}</sup> {t}</p>)}</div>
    return <>{Array.from({ length: Math.max(r.to, r.from) - r.from + 1 }, (_, k) => r.from + k).map(c => <div key={c}>{r.to > r.from && <h4 className="font-semibold">{r.book} {c}</h4>}{(bk.chapters[c - 1] || []).map((t, v) => <p key={v}><sup>{v + 1}</sup> {t}</p>)}</div>)}</> }
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
        {open === i && <div style={readerStyle(settings)} className="mt-3 space-y-4">
          {r.body && <section><label className="flex items-center gap-2 font-bold sd-gold"><input type="checkbox" checked={has(`${plan.id}|${i}|d`)} onChange={() => tick(`${plan.id}|${i}|d`)} />Devotion</label><p className="whitespace-pre-wrap mt-1">{r.body}</p></section>}
          {reads(r).map((x, k) => <section key={k}><label className="flex items-center gap-2 font-bold sd-gold"><input type="checkbox" checked={has(`${plan.id}|${i}|r${k}`)} onChange={() => tick(`${plan.id}|${i}|r${k}`)} />{refOf(x)}</label><div className="mt-1 space-y-1">{reading(x)}</div></section>)}</div>}</div> })}</div>
}

function PlanAdmin() {
  const [plans, setPlans] = useLS<Plan[] | null>('draftPlans', null); const [title, setTitle] = useState('Matthew in 30 days'); const [book, setBook] = useState('Matthew'); const [ch, setCh] = useState(28); const [days, setDays] = useState(30); const [m, setM] = useState(''); const [openId, setOpenId] = useState('')
  useEffect(() => { if (!plans) get<Plan[]>('plans/plans.json').then(setPlans).catch(() => setPlans([])) }, [])
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
  useEffect(() => { get<Entry[]>('bibles/index.json').then(setIdx).catch(() => {}) }, [])
  const ids = Array.from(new Set(Object.keys(marks).map(k => k.split('|')[0])))
  useEffect(() => { ids.forEach(id => { const c = custom.find(b => b.meta.id === id); if (c) { setBibles(o => ({ ...o, [id]: c })); return } const e = idx.find(x => x.id === id); if (e) get<Bible>('bibles/' + e.path).then(b => setBibles(o => ({ ...o, [id]: b }))).catch(() => {}) }) }, [idx, ids.join(',')])
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
      <p className="rounded-lg p-3 border border-white/10" style={readerStyle(settings)}>{settings.vnums && <sup className="mr-1">1</sup>}The LORD is my shepherd; I shall not want.</p></div>
    <div className="sd-card space-y-2"><h3 className="sd-gold font-semibold">My data</h3><p className="text-xs opacity-70">Everything is saved only on this device.</p>
      <button className="sd-btn" onClick={() => save('salem-daily-backup.json', Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('sd:')).map(k => [k, localStorage.getItem(k)])))}>Download my data</button>
      <label className="block text-sm">Restore backup <input type="file" accept=".json" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} /></label>
      <div className="flex gap-2 flex-wrap"><button className="sd-chip" onClick={() => { if (confirm('Reset all plan progress?')) { localStorage.removeItem('sd:planItems'); location.reload() } }}>Reset plan progress</button>
      <button className="sd-chip" onClick={() => { if (confirm('Erase ALL your saved data on this device?')) { Object.keys(localStorage).filter(k => k.startsWith('sd:')).forEach(k => localStorage.removeItem(k)); location.reload() } }}>Erase all my data</button></div></div>
    <div className="text-center space-y-2"><button className="sd-chip" onClick={async () => { const rs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((rs || []).map(r => r.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); location.reload() }}>↻ Get the latest version now</button><p className="text-xs opacity-60">Salem Daily · the app updates itself whenever new content is published.</p></div></div>
}

export default function App() {
  const route = useHash(); const [name, setName] = useLS('name', ''); const [saved, setSettings] = useLS<any>('settings', {}); const settings: any = { translation: 'sample', font: 18, mode: 'dark', accent: '#d4a017', serif: false, spacing: 1.6, vnums: true, motion: true, ...saved }
  const [verse, setVerse] = useState<{ ref: string; text: string } | null>(null); const [theme, setTheme] = useState<any>({}); const [hi, setHi] = useState(0); const [bl, setBl] = useState<Entry[]>([]); const [cb2] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Entry[]>('bibles/index.json').then(setBl).catch(() => {}) }, [])
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
  return <div className="min-h-screen"><div className="max-w-2xl mx-auto p-4 space-y-4">
    <header className="flex justify-between items-center"><h1 className="text-xl font-bold sd-gold flex items-center gap-2"><img src={B + 'icons/icon.png'} alt="" className="w-9 h-9 rounded-xl glow" />{theme.appName || 'Salem Daily'}</h1>
      <nav className="flex flex-wrap justify-end gap-x-3 text-sm">{[['', 'Home'], ['bible', 'Bible'], ['devotions', 'Devotions'], ['plans', 'Plans'], ['saved', 'Saved'], ['settings', 'Settings']].map(([r, l]) => <a key={r} href={'#/' + r} className={'tab' + (tab === r ? ' active' : '')} onClick={() => navigator.vibrate?.(12)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[r]} /></svg><span>{l}</span></a>)}</nav></header>
    {(tab === 'bible' || tab === 'plans') && opts.length > 1 && <BiblePicker opts={opts} settings={settings} setSettings={setSettings} block />}
    <div key={tab} className="rise space-y-4">
    {tab === '' && <div className="space-y-3">{heroSrc && <div className="overflow-hidden rounded-2xl"><img key={heroSrc} src={B + heroSrc} alt="" className="w-full max-h-64 object-cover kenburns rise" onError={e => (e.currentTarget.style.display = 'none')} /></div>}<h2 className="text-lg rise">Hello, {name}</h2>{theme.tagline && <p className="text-sm opacity-70">{theme.tagline}</p>}{verse && <blockquote className={card + ' rise'} style={{ animationDelay: '.3s' }}>{verse.text}<footer className="text-sm opacity-70">— {verse.ref}</footer></blockquote>}</div>}
    {tab === 'bible' && <Bible settings={settings} />}
    {tab === 'devotions' && <Devotions />}
    {tab === 'plans' && <Plans settings={settings} />}
    {tab === 'saved' && <Saved />}
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
