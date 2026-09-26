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
  /** Fiches modifiees d'articles du site : id de l'article du site -> fiche. */
  overrides: Map<string, ProductRow>
  /** Catalogue tel que le voit l'utilisateur courant (masques et prix ajustes appliques). */
  articles: Article[]
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { status, role } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [allProducts, setAllProducts] = useState<ProductRow[]>([])

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
    if (status !== 'ready') { setAllProducts([]); return }
    return onSnapshot(
      collection(db, 'products'),
      (snap) => setAllProducts(snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as ProductRow)),
      () => setAllProducts([]),
    )
  }, [status])

  // Articles ajoutes (custom) d'un cote, fiches modifiees d'articles du site (overrideOf) de l'autre
  const products = useMemo(() => allProducts.filter(p => !p.overrideOf), [allProducts])
  const overrides = useMemo(() => new Map(allProducts.filter(p => p.overrideOf).map(p => [p.overrideOf as string, p])), [allProducts])

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
      const fiche = overrides.get(a.id)
      if (fiche) {
        const fp = fiche.variants.map(v => v.price).filter((x): x is number => x != null)
        art = { ...a, name: fiche.name, desc: fiche.desc, categoryId: fiche.categoryId, unit: fiche.unit || undefined,
          variants: fiche.variants, gallery: fiche.images, img: fiche.images[0] ?? null, promo: false, oldPrice: null,
          priceFrom: fp.length ? Math.min(...fp) : null, edited: true }
      }
      if (ov || extra?.length) {
        const variants = [...art.variants, ...(extra ?? [])].map(v => (ov?.[v.label] != null ? { ...v, price: ov[v.label] } : v))
        const prices = variants.map(v => v.price).filter((x): x is number => x != null)
        art = { ...art, variants, priceFrom: prices.length ? Math.min(...prices) : art.priceFrom, adjusted: !!ov }
      }
      out.push(isHidden ? { ...art, hidden: true } : art)
    }
    return out
  }, [settings, role, products, overrides])

  const value = useMemo<SettingsCtx>(() => ({
    settings, loaded, articles, products, overrides,
    save: async (s) => { await setDoc(doc(db, 'settings', 'catalogue'), s) },
  }), [settings, loaded, articles, products, overrides])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings hors SettingsProvider')
  return ctx
}
