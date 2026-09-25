import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { QuoteLine } from '../types'

interface QuoteCtx {
  lines: QuoteLine[]
  add: (line: Omit<QuoteLine, 'key'>) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  total: number
  count: number
}

const Ctx = createContext<QuoteCtx | null>(null)
const STORAGE_KEY = 'commercial_quote_v1'

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<QuoteLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)) } catch { /* ignore */ }
  }, [lines])

  const value = useMemo<QuoteCtx>(() => ({
    lines,
    add: (line) => setLines(prev => {
      const key = `${line.articleId}|${line.variant}`
      const existing = prev.find(l => l.key === key)
      if (existing) return prev.map(l => l.key === key ? { ...l, qty: l.qty + line.qty } : l)
      return [...prev, { ...line, key }]
    }),
    setQty: (key, qty) => setLines(prev => prev.map(l => l.key === key ? { ...l, qty: Math.max(1, qty) } : l)),
    remove: (key) => setLines(prev => prev.filter(l => l.key !== key)),
    clear: () => setLines([]),
    total: lines.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    count: lines.reduce((s, l) => s + l.qty, 0),
  }), [lines])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useQuote() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useQuote hors QuoteProvider')
  return ctx
}
