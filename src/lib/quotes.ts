import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { QuoteLine } from '../types'

export interface QuoteDoc {
  id: string
  number: string
  ownerUid: string
  ownerName: string
  ownerEmail: string
  clientId: string
  orderId?: string
  client: string
  phone: string
  note: string
  discountPct: number
  lines: Omit<QuoteLine, 'key'>[]
  subtotal: number
  discount: number
  total: number
  createdAt: Timestamp | null
}

export type NewQuote = Omit<QuoteDoc, 'id' | 'createdAt'>

export async function saveQuote(q: NewQuote): Promise<void> {
  await addDoc(collection(db, 'quotes'), { ...q, createdAt: serverTimestamp() })
}

const toDoc = (d: { id: string; data: () => unknown }) => ({ id: d.id, ...(d.data() as Omit<QuoteDoc, 'id'>) })

/** Devis du commercial connecte (tri cote client pour eviter un index composite). */
export async function fetchMyQuotes(uid: string): Promise<QuoteDoc[]> {
  const snap = await getDocs(query(collection(db, 'quotes'), where('ownerUid', '==', uid)))
  return snap.docs.map(toDoc).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

/** Tous les devis (admin). */
export async function fetchAllQuotes(): Promise<QuoteDoc[]> {
  const snap = await getDocs(query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(300)))
  return snap.docs.map(toDoc)
}

export function fmtDate(ts: Timestamp | null): string {
  if (!ts) return '—'
  return ts.toDate().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export const linkQuoteToOrder = (quoteId: string, orderId: string) => updateDoc(doc(db, 'quotes', quoteId), { orderId })
