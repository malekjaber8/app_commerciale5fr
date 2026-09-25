/**
 * Synchronise le catalogue du site officiel vers cette application.
 * LECTURE SEULE sur le site : aucun fichier de site5fre n'est modifié.
 *
 * Usage :  node scripts/sync-catalogue.mjs [chemin-du-site]
 * Par défaut le site est cherché dans ../site5fre
 *
 * Produit :
 *   - src/data/catalogue.json   (catalogue normalisé)
 *   - public/images/...         (copie des images/vidéos référencées)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const siteDir = path.resolve(root, process.argv[2] || '../site5fre')
const htmlPath = path.join(siteDir, 'catalogue.html')

if (!fs.existsSync(htmlPath)) {
  console.error('catalogue.html introuvable :', htmlPath)
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')

function extractLiteral(marker, endPattern) {
  const start = html.indexOf(marker)
  if (start === -1) throw new Error('Marqueur introuvable : ' + marker)
  const from = start + marker.length
  const end = html.indexOf(endPattern, from)
  if (end === -1) throw new Error('Fin introuvable pour : ' + marker)
  return html.slice(from, end + endPattern.length)
}

const catalogue = new Function('return ' + extractLiteral('const catalogue = ', '\n};'))()
const toolCategories = new Function('return ' + extractLiteral('const toolCategories = ', '\n];'))()

/* ───────── helpers ───────── */
const usedFiles = new Set()

function cleanPath(p) {
  if (!p) return null
  let s = p
  try { s = decodeURIComponent(p) } catch { /* garde tel quel */ }
  s = s.replace(/^\.?\//, '')
  usedFiles.add(s)
  return s
}

/** "4,500 DT" -> 4.5 ; "315 DT" -> 315 ; "Sur devis" -> null */
function parsePrice(str) {
  if (typeof str === 'number') return str
  if (!str) return null
  const m = String(str).match(/([\d]+(?:[.,]\d+)?)\s*(DT|TND)/i)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

function parseVariant(v) {
  if (typeof v !== 'string') return { label: String(v), price: null }
  const price = parsePrice(v)
  const parts = v.split(' — ')
  let label
  if (parts.length > 1) {
    label = parts.slice(0, -1).join(' — ')
  } else {
    // "7,000 DT / pièce" -> "pièce"
    const unit = v.match(/\/\s*(.+)$/)
    label = unit ? unit[1].trim() : 'Standard'
  }
  // libellé lisible : conserve l'unité quand elle existe sur le dernier segment
  const last = parts[parts.length - 1]
  const unit = last.match(/\/\s*(.+)$/)
  if (unit && parts.length > 1) label += ' (' + unit[1].trim() + ')'
  return { label, price, raw: v }
}

function baseArticle(p, categoryId) {
  const variants = (p.variants && p.variants.length ? p.variants : [p.price]).map(parseVariant)
  // Applique l'ancien prix par variante (promo)
  if (p.promo && p.oldPrices) {
    for (const v of variants) {
      const key = v.label.split(' — ')[0].split(' (')[0].trim()
      if (p.oldPrices[key]) v.oldPrice = parsePrice(p.oldPrices[key])
    }
  }
  const prices = variants.map(v => v.price).filter(x => x != null)
  return {
    id: p.id || p.code,
    name: p.name,
    desc: p.desc || p.ref || '',
    categoryId,
    img: cleanPath(p.img),
    gallery: (p.gallery || []).map(cleanPath),
    video: cleanPath(p.video),
    promo: !!p.promo,
    oldPrice: p.oldPrice ? parsePrice(p.oldPrice) : null,
    variants,
    priceFrom: prices.length ? Math.min(...prices) : parsePrice(p.price),
  }
}

/* ───────── arbre des catégories ───────── */
const categories = []
const articles = []

const addCat = (c) => categories.push(c)

// Tissus
addCat({ id: 'tissu', label: catalogue.tissu.label, icon: catalogue.tissu.icon, desc: catalogue.tissu.desc })
for (const col of catalogue.tissu.collections) {
  const price = col.priceNum ?? parsePrice(col.price)
  articles.push({
    id: 'TISSU-' + col.id,
    name: 'Tissu ' + col.label,
    desc: `Collection ${col.label} — ${col.coloris.length} coloris. Prix au mètre.`,
    categoryId: 'tissu',
    img: cleanPath(col.img),
    gallery: [],
    video: null,
    promo: false,
    oldPrice: null,
    unit: 'm',
    variants: col.coloris.map(c => ({ label: c, price })),
    priceFrom: price,
  })
}

// Mousse (groupe)
addCat({ id: 'mousse', label: 'Mousse & Garnissage', icon: '🛏️', desc: 'Matelas mousse, plaques, fibre et polystyrène.' })

// Matelas mousse
{
  const c = catalogue['mousse-matelas']
  addCat({ id: 'mousse-matelas', label: c.label, icon: c.icon, desc: c.desc, parentId: 'mousse' })
  for (const t of c.types) {
    const variants = t.dims.map(d => ({ label: d.d + ' cm', code: d.code, price: d.prix }))
    articles.push({
      id: 'MM-' + t.id, name: `Matelas Mousse ${t.label}`, desc: t.desc,
      categoryId: 'mousse-matelas', img: cleanPath(t.img), gallery: [], video: null,
      promo: false, oldPrice: null, badge: t.badge, variants,
      priceFrom: Math.min(...variants.map(v => v.price)),
    })
  }
}

// Plaque mousse TABKA
{
  const c = catalogue['mousse-tabka']
  addCat({ id: 'mousse-tabka', label: c.label, icon: c.icon, desc: c.desc, parentId: 'mousse' })
  for (const t of c.types) {
    const variants = t.thicknesses.map(x => ({ label: `${x.ep} — ${x.dim || c.baseDim}`, code: x.code, price: x.prix }))
    articles.push({
      id: 'MT-' + t.id, name: `Plaque Mousse ${t.label}`, desc: t.desc,
      categoryId: 'mousse-tabka', img: cleanPath(t.img), gallery: [], video: null,
      promo: false, oldPrice: null, badge: t.badge, variants,
      priceFrom: Math.min(...variants.map(v => v.price)),
    })
  }
}

// Polyester + polystyrène
for (const k of ['polyester', 'polystyrene']) {
  const c = catalogue[k]
  addCat({ id: k, label: c.label, icon: c.icon, desc: c.desc, parentId: 'mousse' })
  for (const p of c.products) articles.push(baseArticle(p, k))
}

// Matelas ressort
{
  const c = catalogue.ressort
  addCat({ id: 'ressort', label: c.label, icon: c.icon, desc: c.desc })
  c.types.forEach((t, i) => {
    const variants = c.sizes
      .map(s => ({ label: s.dim + ' cm', price: s.prices[i] }))
      .filter(v => v.price != null)
    articles.push({
      id: 'MR-' + t.id, name: `Matelas Ressort ${t.label}`,
      desc: t.desc, categoryId: 'ressort', img: cleanPath(t.img), gallery: [], video: null,
      promo: false, oldPrice: null, badge: t.badge, specs: t.specs || [], variants,
      priceFrom: variants.length ? Math.min(...variants.map(v => v.price)) : null,
    })
  })
}

// Groupes avec sous-catégories filtrées par `sub`
function groupWithSubs(groupId, subs) {
  const g = catalogue[groupId]
  addCat({ id: groupId, label: g.label, icon: g.icon, desc: g.desc })
  for (const s of subs) {
    const key = Object.keys(catalogue).find(k => catalogue[k].parent === groupId && catalogue[k].filter === s)
    const meta = key ? catalogue[key] : { label: s, icon: '' }
    addCat({ id: `${groupId}-${s}`, label: meta.label, icon: meta.icon, parentId: groupId })
  }
  for (const p of g.products) {
    const s = p.sub && subs.includes(p.sub) ? p.sub : null
    articles.push(baseArticle(p, s ? `${groupId}-${s}` : groupId))
  }
}
groupWithSubs('pietement', ['metal', 'bois', 'plastique'])
groupWithSubs('socle', ['metal', 'bois'])
groupWithSubs('chaise', ['tapissee', 'bois', 'inox'])

// Catégories simples
for (const k of ['accessoires', 'bordures', 'coussins', 'agrafes', 'miroirs', 'mecanisme', 'poignees', 'colle']) {
  const c = catalogue[k]
  addCat({ id: k, label: c.label, icon: c.icon, desc: c.desc })
  for (const p of c.products) articles.push(baseArticle(p, k))
}

// Outils (toolCategories)
{
  const c = catalogue.outils
  addCat({ id: 'outils', label: c.label, icon: c.icon, desc: c.desc })
  toolCategories.forEach((tc, idx) => {
    const catId = `outils-${idx}`
    addCat({ id: catId, label: tc.name, icon: tc.icon, desc: tc.desc, parentId: 'outils' })
    for (const it of tc.items) {
      const a = baseArticle({ ...it, id: it.code, variants: [it.price], desc: it.ref }, catId)
      if (it.tnt) {
        a.variants = [
          { label: 'Au mètre', price: it.tntMeterPrice },
          { label: `Rouleau ${it.tntRollLength} m`, price: it.tntRollPrice },
        ]
        a.priceFrom = it.tntMeterPrice
      }
      articles.push(a)
    }
  })
}

/* ───────── copie des fichiers ───────── */
const pubDir = path.join(root, 'public')
let copied = 0
const missing = []
for (const rel of usedFiles) {
  const src = path.join(siteDir, rel)
  if (!fs.existsSync(src)) { missing.push(rel); continue }
  const dest = path.join(pubDir, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  copied++
}

const out = {
  generatedAt: new Date().toISOString(),
  categories,
  articles,
}
const dataDir = path.join(root, 'src', 'data')
fs.mkdirSync(dataDir, { recursive: true })
fs.writeFileSync(path.join(dataDir, 'catalogue.json'), JSON.stringify(out, null, 1))

console.log(`Catégories : ${categories.length}`)
console.log(`Articles   : ${articles.length}`)
console.log(`Fichiers copiés : ${copied}`)
if (missing.length) {
  console.log(`Fichiers introuvables (${missing.length}) :`)
  missing.forEach(m => console.log('  -', m))
}
