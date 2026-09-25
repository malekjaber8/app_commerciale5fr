import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './auth'
import { articles as baseArticles } from '../lib/catalogue'
import type { Article, Settings } from '../types'

export const DEFAULT_SETTINGS: Settings = { hiddenIds: [], priceOverrides: {}, maxDiscountPct: 10 }

interface SettingsCtx {
  settings: Settings
  loaded: boolean
  save: (s: Settings) => Promise<void>
  /** Catalogue tel que le voit l'utilisateur courant (masques et prix ajustes appliques). */
  articles: Article[]
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { status, role } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (status !== 'ready') { setLoaded(false); return }
    return onSnapshot(
      doc(db, 'settings', 'catalogue'),
      (snap) => {
        setSettings(snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<Settings>) } : DEFAULT_SETTINGS)
        setLoaded(true)
      },
      () => setLoaded(true),
    )
  }, [status])

  const articles = useMemo(() => {
    const hidden = new Set(settings.hiddenIds)
    const out: Article[] = []
    for (const a of baseArticles) {
      const isHidden = hidden.has(a.id)
      if (isHidden && role !== 'admin') continue
      const ov = settings.priceOverrides[a.id]
      let art = a
      if (ov) {
        const variants = a.variants.map(v => (ov[v.label] != null ? { ...v, price: ov[v.label] } : v))
        const prices = variants.map(v => v.price).filter((x): x is number => x != null)
        art = { ...a, variants, priceFrom: prices.length ? Math.min(...prices) : a.priceFrom, adjusted: true }
      }
      out.push(isHidden ? { ...art, hidden: true } : art)
    }
    return out
  }, [settings, role])

  const value = useMemo<SettingsCtx>(() => ({
    settings, loaded, articles,
    save: async (s) => { await setDoc(doc(db, 'settings', 'catalogue'), s) },
  }), [settings, loaded, articles])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings hors SettingsProvider')
  return ctx
}
