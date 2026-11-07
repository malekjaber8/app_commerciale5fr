import type { Article } from '../types'

/** Ligne brute extraite d'un fichier Excel/CSV (facture, bon de commande...). */
export interface ParsedLine {
  code: string | null
  designation: string
  qty: number
  filePriceHT: number
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

/** Decoupe un texte en jetons alphanumeriques normalises, pour comparer deux libelles sans tenir compte des accents/casse/separateurs. */
function tokenize(s: string): Set<string> {
  return new Set(
    norm(s)
      .replace(/[×xX](?=\d)/g, 'X') // uniformise les separateurs de dimension (190x140, 190×140)
      .split(/[^A-Z0-9]+/)
      .filter(Boolean),
  )
}

/**
 * Parcourt la matrice brute d'une feuille (lignes de cellules, types melanges) et en extrait les lignes d'articles.
 * Independant de la position exacte des colonnes : pour chaque ligne, identifie le texte le plus long comme
 * designation, un eventuel code article court, et cherche parmi les valeurs numeriques un triplet
 * (quantite, prix unitaire, montant) tel que quantite x prix unitaire = montant (a l'arrondi pres).
 * Ignore les lignes d'en-tete et de pied de page (totaux, signature...).
 */
export function parseInvoiceRows(matrix: unknown[][]): ParsedLine[] {
  const out: ParsedLine[] = []
  for (const row of matrix) {
    if (!Array.isArray(row)) continue
    const textCells: string[] = []
    const numCells: number[] = []
    for (const cell of row) {
      if (cell == null || cell === '') continue
      if (typeof cell === 'number') { numCells.push(cell); continue }
      const s = String(cell).trim()
      if (!s) continue
      if (/^-?\d+([.,]\d+)?$/.test(s)) numCells.push(parseFloat(s.replace(',', '.')))
      else textCells.push(s)
    }
    if (numCells.length < 3 || textCells.length === 0) continue

    const codeIdx = textCells.findIndex(c => /^[A-Za-z]{1,6}\d{3,6}$/.test(c))
    const code = codeIdx > -1 ? textCells[codeIdx] : null
    const designation = textCells.filter((_, i) => i !== codeIdx).sort((a, b) => b.length - a.length)[0]
    if (!designation || designation.length < 3) continue
    if (/total|taxe|arretee|cachet|signature|reference|designation|d.signation/i.test(norm(designation))) continue

    let best: { qty: number; price: number; amount: number } | null = null
    outer: for (let i = 0; i < numCells.length; i++) {
      for (let j = 0; j < numCells.length; j++) {
        if (j === i) continue
        for (let k = 0; k < numCells.length; k++) {
          if (k === i || k === j) continue
          const qty = numCells[i], price = numCells[j], amount = numCells[k]
          if (qty <= 0 || price <= 0 || amount <= 0) continue
          if (Math.abs(qty * price - amount) < 0.01) { best = { qty, price, amount }; break outer }
        }
      }
    }
    if (!best) continue
    out.push({ code, designation, qty: best.qty, filePriceHT: best.price })
  }
  return out
}

export interface CatalogueOption {
  key: string
  articleId: string
  name: string
  variant: string
  unitPrice: number
  tokens: Set<string>
}

export function buildCatalogueOptions(articles: Article[]): CatalogueOption[] {
  const out: CatalogueOption[] = []
  for (const a of articles) {
    for (const v of a.variants) {
      if (v.price == null) continue
      out.push({ key: `${a.id}|${v.label}`, articleId: a.id, name: a.name, variant: v.label, unitPrice: v.price, tokens: tokenize(`${a.name} ${v.label}`) })
    }
  }
  return out
}

/** Meilleure correspondance catalogue pour une designation de fichier (similarite de jetons, type Jaccard). */
export function bestMatch(designation: string, options: CatalogueOption[]): { option: CatalogueOption; score: number } | null {
  const target = tokenize(designation)
  if (target.size === 0 || options.length === 0) return null
  let best: { option: CatalogueOption; score: number } | null = null
  for (const opt of options) {
    let inter = 0
    for (const t of target) if (opt.tokens.has(t)) inter++
    const union = target.size + opt.tokens.size - inter
    const score = union === 0 ? 0 : inter / union
    if (!best || score > best.score) best = { option: opt, score }
  }
  return best
}

export const MATCH_THRESHOLD = 0.4
