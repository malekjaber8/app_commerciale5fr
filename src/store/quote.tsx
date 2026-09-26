import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { QuoteLine } from '../types'
import type { QuoteDoc } from '../lib/quotes'

/** Devis enregistre en cours de modification par son commercial (tant que l'admin ne l'a pas valide). */
export interface EditInfo { id: string; number: string; clientId: string; client: string; phone: string; note: string; discountPct: number }

interface QuoteCtx {
  lines: QuoteLine[]
  add: (line: Omit<QuoteLine, 'key'>) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  /** Charge un devis existant dans le panier pour le modifier. */
  startEdit: (q: QuoteDoc) => void
  editing: EditInfo | null
  total: number
  count: number
}

const Ctx = createContext<QuoteCtx | null>(null)
const STORAGE_KEY = 'commercial_quote_v1'
const EDIT_KEY = 'commercial_quote_edit_v1'

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<QuoteLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })

  const [editing, setEditing] = useState<EditInfo | null>(() => {
    try { return JSON.parse(localStorage.getItem(EDIT_KEY) || 'null') } catch { return null }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)) } catch { /* ignore */ }
  }, [lines])
  useEffect(() => {
    try { if (editing) localStorage.setItem(EDIT_KEY, JSON.stringify(editing)); else localStorage.removeItem(EDIT_KEY) } catch { /* ignore */ }
  }, [editing])

  const value = useMemo<QuoteCtx>(() => ({
    lines,
    add: (line) => setLines(prev => {
      const key = `${line.articleId}|${line.variant}`
      const existing = prev.find(l => l.key === key)
      if (existing) return prev.map(l => l.key === key ? { ...l, qty: Math.round((l.qty + line.qty) * 1000) / 1000 } : l)
      return [...prev, { ...line, key }]
    }),
    setQty: (key, qty) => setLines(prev => prev.map(l => l.key === key ? { ...l, qty: qty > 0 ? qty : l.qty } : l)),
    remove: (key) => setLines(prev => prev.filter(l => l.key !== key)),
    clear: () => { setLines([]); setEditing(null) },
    editing,
    startEdit: (q) => {
      setLines(q.lines.map(l => ({ ...l, key: `${l.articleId}|${l.variant}` })))
      setEditing({ id: q.id, number: q.number, clientId: q.clientId || '', client: q.client, phone: q.phone, note: q.note, discountPct: q.discountPct })
    },
    total: lines.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    count: Math.round(lines.reduce((s, l) => s + l.qty, 0) * 1000) / 1000,
  }), [lines, editing])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useQuote() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useQuote hors QuoteProvider')
  return ctx
}
