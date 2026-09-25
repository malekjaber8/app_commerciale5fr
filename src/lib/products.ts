import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { Article, Variant } from '../types'

/** Article ajoute par l'admin (propre a cette application, absent du site officiel). */
export interface ProductDoc {
  name: string
  desc: string
  categoryId: string
  unit: string
  variants: Variant[]
  /** Photos redimensionnees, stockees sous forme de data URL. */
  images: string[]
}
export type ProductRow = ProductDoc & { id: string }

export const CUSTOM_PREFIX = 'custom-'
export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX)

export function productToArticle(p: ProductRow): Article {
  const prices = p.variants.map(v => v.price).filter((x): x is number => x != null)
  return {
    id: CUSTOM_PREFIX + p.id, name: p.name, desc: p.desc, categoryId: p.categoryId,
    img: p.images[0] ?? null, gallery: p.images, video: null, promo: false, oldPrice: null,
    variants: p.variants, priceFrom: prices.length ? Math.min(...prices) : null,
    unit: p.unit || undefined,
  }
}

export const newProductId = () => doc(collection(db, 'products')).id

export async function saveProduct(id: string, data: ProductDoc): Promise<void> {
  await setDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() })
}
export const deleteProduct = (id: string) => deleteDoc(doc(db, 'products', id))

/** Redimensionne une photo (cote max 900 px, JPEG) pour rester sous la limite de 1 Mo par document. */
export function resizeImage(file: File, maxSide = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * k); canvas.height = Math.round(img.height * k)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')) }
    img.src = url
  })
}
