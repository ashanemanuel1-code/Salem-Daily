import { useEffect, useState } from 'react'
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

function Plans({ settings }: { settings: any }) {
  const [plans, setPlans] = useState<Plan[]>([]); const [sel, setSel] = useState(''); const [open, setOpen] = useState<number | null>(null)
  const [done, setDone] = useLS<Record<string, number[]>>('planDone', {})
  const [idx, setIdx] = useState<Entry[]>([]); const [bible, setBible] = useState<Bible | null>(null); const [custom] = useLS<Bible[]>('customBibles', [])
  useEffect(() => { get<Plan[]>('plans/plans.json').then(setPlans).catch(() => {}); get<Entry[]>('bibles/index.json').then(setIdx).catch(() => {}) }, [])
  useEffect(() => { const c = custom.find(b => b.meta.id === settings.translation); if (c) { setBible(c); return } const e = idx.find(x => x.id === settings.translation) || idx[0]; if (e) get<Bible>('bibles/' + e.path).then(setBible).catch(() => setBible(null)) }, [idx, custom, settings.translation])
  const plan = plans.find(p => p.id === sel); const dn = plan ? done[plan.id] || [] : []
  const refOf = (r: PRead) => `${r.book} ${r.from}${r.vFrom ? ':' + r.vFrom + (r.vTo && r.vTo > r.vFrom ? '–' + r.vTo : '') : r.to > r.from ? '–' + r.to : ''}`
  const reads = (r: PDay): PRead[] => [r as PRead, ...(r.more || [])].filter(x => x.book)
  const reading = (r: PRead) => { const bk = bible?.books.find(b => b.name.toLowerCase() === r.book.toLowerCase()); if (!bk) return <p className="text-sm">"{r.book}" is not in the selected Bible yet.</p>
    if (r.vFrom) return <div><h4 className="font-semibold">{refOf(r)}</h4>{(bk.chapters[r.from - 1] || []).slice(r.vFrom - 1, r.vTo || r.vFrom).map((t, v) => <p key={v}><sup>{r.vFrom! + v}</sup> {t}</p>)}</div>
    return <>{Array.from({ length: Math.max(r.to, r.from) - r.from + 1 }, (_, k) => r.from + k).map(c => <div key={c}><h4 className="font-semibold">{r.book} {c}</h4>{(bk.chapters[c - 1] || []).map((t, v) => <p key={v}><sup>{v + 1}</sup> {t}</p>)}</div>)}</> }
  if (!plan) return <div className="space-y-3"><h2 className="font-bold">Reading plans</h2>{!plans.length && <p>No plans yet.</p>}{plans.map(p => <button key={p.id} className={card + ' block w-full text-left'} onClick={() => { setSel(p.id); setOpen(null) }}>{p.title}<span className="block text-xs opacity-70">{p.days.length} days · {(done[p.id] || []).length} done</span></button>)}</div>
  const next = plan.days.findIndex((_, i) => !dn.includes(i))
  return <div className="space-y-3"><button className="text-sm underline" onClick={() => setSel('')}>← All plans</button><h2 className="font-bold">{plan.title}</h2><p className="text-sm">{dn.length} of {plan.days.length} days done</p>
    {plan.days.map((r, i) => <div key={i} className={card}><div className="flex items-center gap-2"><input type="checkbox" checked={dn.includes(i)} onChange={e => setDone({ ...done, [plan.id]: e.target.checked ? [...dn, i] : dn.filter(x => x !== i) })} />
      <button className="flex-1 text-left" onClick={() => setOpen(open === i ? null : i)}>Day {i + 1}: {r.title || reads(r).map(refOf).join(', ')}{r.title && reads(r).length ? ' · ' + reads(r).map(refOf).join(', ') : ''}{i === next ? ' ← next' : ''}</button></div>
      {open === i && <div style={{ fontSize: settings.font }} className="mt-2 space-y-2">{r.body && <div><h3 className="font-bold sd-gold">Devotion</h3><p className="whitespace-pre-wrap">{r.body}</p></div>}{reads(r).length > 0 && <div className="space-y-2"><h3 className="font-bold sd-gold">Today's reading</h3>{reads(r).map((x, k) => <div key={k}>{reading(x)}</div>)}</div>}</div>}</div>)}</div>
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
  return <section className="space-y-2"><h2 className="font-bold">Reading plans</h2>
    <div className="flex flex-wrap gap-2 text-sm text-black"><input className="border rounded px-2" value={title} onChange={e => setTitle(e.target.value)} /><input className="border rounded px-2 w-28" value={book} onChange={e => setBook(e.target.value)} />
      <label className="dark:text-white">Chapters <input type="number" min={1} className="border rounded px-2 w-16 text-black" value={ch} onChange={e => setCh(+e.target.value)} /></label>
      <label className="dark:text-white">Days <input type="number" min={1} className="border rounded px-2 w-16 text-black" value={days} onChange={e => setDays(+e.target.value)} /></label></div>
    <button className={btn} onClick={create}>Create reading plan</button> <button className={btn} onClick={createSeries}>Create devotional series</button>{m && <p className="text-sm">{m}</p>}
    {plans.map(p => <div key={p.id} className={card + ' text-sm space-y-2'}><div className="flex gap-2"><input className="flex-1 border rounded px-2" value={p.title} onChange={e => upPlan(p.id, { title: e.target.value })} /><button onClick={() => setOpenId(openId === p.id ? '' : p.id)}>✎ {p.days.length} days</button><button onClick={() => confirm('Delete plan?') && setPlans(plans.filter(x => x.id !== p.id))}>🗑</button></div>
      {openId === p.id && p.days.map((d, i) => <div key={i} className="space-y-1 border-t pt-2"><b>Day {i + 1}</b>
        <input className="w-full border rounded px-2" placeholder="Devotion title" value={d.title || ''} onChange={e => upDay(p.id, i, { title: e.target.value })} />
        <textarea className="w-full border rounded px-2" rows={3} placeholder="Devotion text (leave empty for reading only)" value={d.body || ''} onChange={e => upDay(p.id, i, { body: e.target.value })} />
        {[d as PRead, ...(d.more || [])].map((x, k) => <div key={k} className="flex flex-wrap items-center gap-1"><input className="border rounded px-2 w-28" placeholder="Book" value={x.book} onChange={e => upRead(p.id, i, k, { book: e.target.value })} />ch <input type="number" min={1} className="border rounded px-1 w-14" value={x.from} onChange={e => upRead(p.id, i, k, { from: +e.target.value, to: Math.max(+e.target.value, x.to) })} />–<input type="number" min={1} className="border rounded px-1 w-14" value={x.to} onChange={e => upRead(p.id, i, k, { to: +e.target.value })} /> verses <input type="number" min={1} className="border rounded px-1 w-14" placeholder="from" value={x.vFrom || ''} onChange={e => upRead(p.id, i, k, { vFrom: +e.target.value || undefined })} />–<input type="number" min={1} className="border rounded px-1 w-14" placeholder="to" value={x.vTo || ''} onChange={e => upRead(p.id, i, k, { vTo: +e.target.value || undefined })} />{k > 0 && <button onClick={() => delRead(p.id, i, k)}>✕</button>}</div>)}
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

export default function App() {
  const route = useHash(); const [name, setName] = useLS('name', ''); const [settings, setSettings] = useLS('settings', { translation: 'sample', font: 18, dark: false })
  const [verse, setVerse] = useState<{ ref: string; text: string } | null>(null); const [theme, setTheme] = useState<any>({})
  useEffect(() => { get<any>('theme.json').then(t => { setTheme(t); const r = document.documentElement.style; if (t.gold) r.setProperty('--gold', t.gold); if (t.bg) r.setProperty('--bg', t.bg) }).catch(() => {}) }, [])
  useEffect(() => { get<any>('daily-verse.json').then(setVerse).catch(() => {}) }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', settings.dark) }, [settings.dark])
  if (!name) return <Welcome onDone={setName} />
  const tab = route.split('/')[0]
  const restore = async (f: File) => { try { const j = JSON.parse(await f.text()); Object.entries(j).forEach(([k, v]) => localStorage.setItem(k, v as string)); location.reload() } catch { alert('Invalid backup') } }
  return <div className="min-h-screen"><div className="max-w-2xl mx-auto p-4 space-y-4">
    <header className="flex justify-between items-center"><h1 className="text-xl font-bold sd-gold flex items-center gap-2"><img src={B + 'icons/icon.png'} alt="" className="w-9 h-9 rounded-xl" />{theme.appName || 'Salem Daily'}</h1>
      <nav className="flex flex-wrap justify-end gap-x-3 text-sm">{[['', 'Home'], ['bible', 'Bible'], ['devotions', 'Devotions'], ['plans', 'Plans'], ['saved', 'Saved'], ['settings', 'Settings']].map(([r, l]) => <a key={r} href={'#/' + r} className={tab === r ? 'font-bold underline' : ''}>{l}</a>)}</nav></header>
    {tab === '' && <div className="space-y-3">{theme.hero && <img src={B + theme.hero} alt="" className="w-full rounded-2xl max-h-64 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />}<h2 className="text-lg">Hello, {name}</h2>{theme.tagline && <p className="text-sm opacity-70">{theme.tagline}</p>}{verse && <blockquote className={card}>{verse.text}<footer className="text-sm opacity-70">— {verse.ref}</footer></blockquote>}</div>}
    {tab === 'bible' && <Bible settings={settings} />}
    {tab === 'devotions' && <Devotions />}
    {tab === 'plans' && <Plans settings={settings} />}
    {tab === 'saved' && <Saved />}
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
  return <div className="min-h-screen grid place-items-center p-6"><div className="max-w-sm w-full space-y-3 text-center"><img src={B + 'icons/icon.png'} alt="" className="w-28 h-28 mx-auto rounded-3xl" /><h1 className="text-3xl font-bold sd-gold">Salem Daily</h1><p>What should we call you? Your name stays on this device.</p>
    <input className="border rounded px-3 py-2 w-full" value={n} onChange={e => setN(e.target.value)} placeholder="Your name" /><button className={btn} disabled={!n.trim()} onClick={() => onDone(n.trim())}>Continue</button></div></div>
}
