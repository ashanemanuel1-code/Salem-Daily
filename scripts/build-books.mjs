// Converts the PDFs / text files listed in public/data/books/books.json into readable JSON books.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { execFileSync } from 'child_process'

const manifest = 'public/data/books/books.json'
if (!existsSync(manifest)) { console.log('No books manifest. Skipping.'); process.exit(0) }

function toChapters(raw) {
  const text = raw.replace(/\r/g, '').replace(/\f/g, '\n\n').replace(/-\n(?=[a-z])/g, '')
  const words = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty\\w*|thirty\\w*'
  const head = new RegExp('^(chapter|part|book|lesson|day|week)\\s+(\\d+|[ivxlc]+|' + words + ')\\b[\\s.:\\u2014-]*.{0,50}$', 'i')
  const items = []; let buf = []
  const flush = () => { if (buf.length) { const t = buf.join(' ').replace(/\s+/g, ' ').trim(); if (t && !/^\d{1,4}$/.test(t)) items.push({ h: false, s: t }); buf = [] } }
  for (const ln of text.split('\n')) {
    const l = ln.trim()
    if (!l) { flush(); continue }
    if (!buf.length && l.length < 70 && head.test(l)) { items.push({ h: true, s: l }); continue }
    buf.push(l)
  }
  flush()
  if (!items.length) return [{ title: 'No readable text', paras: ['This PDF has no readable text (it may be scanned pages). Use the Download PDF button instead.'] }]
  const chs = []; let cur = { title: 'Beginning', paras: [] }
  for (const it of items) { if (it.h) { if (cur.paras.length) chs.push(cur); cur = { title: it.s, paras: [] } } else cur.paras.push(it.s) }
  if (cur.paras.length) chs.push(cur)
  if (chs.length >= 2) return chs
  const all = items.filter(i => !i.h).map(i => i.s); const out = []; let acc = []; let n = 0
  for (const p of all) { acc.push(p); n += p.length; if (n > 4000) { out.push({ title: 'Part ' + (out.length + 1), paras: acc }); acc = []; n = 0 } }
  if (acc.length) out.push({ title: 'Part ' + (out.length + 1), paras: acc })
  return out
}

const books = JSON.parse(readFileSync(manifest, 'utf8'))
mkdirSync('public/books', { recursive: true })
for (const b of books) {
  try {
    if (!b.id || !b.file) { console.warn('Skipping a book with no id or file name'); continue }
    const src = 'books-src/' + b.file
    if (!existsSync(src)) { console.warn('Missing file: ' + src); continue }
    let text
    if (/\.pdf$/i.test(src)) { text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-nopgbrk', src, '-'], { maxBuffer: 1 << 29 }).toString('utf8'); copyFileSync(src, 'public/books/' + b.file) }
    else text = readFileSync(src, 'utf8')
    const chapters = toChapters(text)
    writeFileSync(`public/data/books/${b.id}.json`, JSON.stringify({ id: b.id, title: b.title, chapters }))
    console.log(`Built ${b.id}: ${chapters.length} chapters`)
  } catch (e) { console.warn('Failed ' + b.id + ': ' + e.message) }
}
