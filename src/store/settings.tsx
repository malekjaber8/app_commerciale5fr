import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './auth'
import { articles as baseArticles } from '../lib/catalogue'
import { productToArticle, type ProductRow } from '../lib/products'
import type { Article, Settings } from '../types'

export const DEFAULT_SETTINGS: Settings = { hiddenIds: [], priceOverrides: {}, extraVariants: {}, maxDiscountPct: 10 }

interface SettingsCtx {
  settings: Settings
  loaded: boolean
  save: (s: Settings) => Promise<void>
  /** Articles ajoutes par l'admin (donnees brutes, pour la modification). */
  products: ProductRow[]
  /** Catalogue tel que le voit l'utilisateur courant (masques et prix ajustes appliques). */
  articles: Article[]
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { status, role } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [products, setProducts] = useState<ProductRow[]>([])

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

  // Articles ajoutes par l'admin : lus en direct, visibles par l'admin et les commerciaux seulement
  useEffect(() => {
    if (status !== 'ready') { setProducts([]); return }
    return onSnapshot(
      collection(db, 'products'),
      (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as ProductRow)),
      () => setProducts([]),
    )
  }, [status])

  const articles = useMemo(() => {
    const hidden = new Set(settings.hiddenIds)
    const out: Article[] = []
    const all = [...products.map(productToArticle).reverse(), ...baseArticles]
    for (const a of all) {
      const isHidden = hidden.has(a.id)
      if (isHidden && role !== 'admin') continue
      const ov = settings.priceOverrides[a.id]
      const extra = settings.extraVariants?.[a.id]
      let art = a
      if (ov || extra?.length) {
        const variants = [...a.variants, ...(extra ?? [])].map(v => (ov?.[v.label] != null ? { ...v, price: ov[v.label] } : v))
        const prices = variants.map(v => v.price).filter((x): x is number => x != null)
        art = { ...a, variants, priceFrom: prices.length ? Math.min(...prices) : a.priceFrom, adjusted: !!ov }
      }
      const ed = settings.edits?.[a.id]
      if (ed) art = { ...art, name: ed.name ?? art.name, desc: ed.desc ?? art.desc }
      out.push(isHidden ? { ...art, hidden: true } : art)
    }
    return out
  }, [settings, role, products])

  const value = useMemo<SettingsCtx>(() => ({
    settings, loaded, articles, products,
    save: async (s) => { await setDoc(doc(db, 'settings', 'catalogue'), s) },
  }), [settings, loaded, articles, products])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings hors SettingsProvider')
  return ctx
}
