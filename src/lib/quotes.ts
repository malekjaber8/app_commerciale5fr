import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { QuoteLine } from '../types'
import { TIMBRE } from './db'

/** Nature du document une fois le devis valide par l'admin. */
export type DocType = 'devis' | 'bon_livraison' | 'facture'
export const DOC_TYPE_LABEL: Record<DocType, string> = { devis: 'Devis', bon_livraison: 'Bon de livraison', facture: 'Facture' }
export type QuoteStatus = 'attente' | 'valide'

export type PaymentMethod = 'especes' | 'cheque' | 'virement' | 'traite'
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { especes: 'Especes', cheque: 'Cheque', virement: 'Virement', traite: 'Traite / Effet' }
/** Un encaissement enregistre par l'admin. */
export interface Payment { id: string; amount: number; at: number; method: PaymentMethod; note: string }

export interface QuoteDoc {
  id: string
  /** Absent sur les anciens devis : ils comptent comme « en attente ». */
  status?: QuoteStatus
  docType?: DocType
  /** Numero du bon de livraison ou de la facture (le devis garde `number`). */
  docNumber?: string
  invoiceId?: string
  validatedAt?: Timestamp | null
  /** Reglements encaisses (admin) et leur somme. */
  payments?: Payment[]
  paid?: number
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

export type NewQuote = Omit<QuoteDoc, 'id' | 'createdAt' | 'status' | 'docType' | 'docNumber' | 'invoiceId' | 'validatedAt' | 'payments' | 'paid'>

export async function saveQuote(q: NewQuote): Promise<void> {
  await addDoc(collection(db, 'quotes'), { ...q, status: 'attente', createdAt: serverTimestamp() })
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

export const updateQuote = (id: string, data: Record<string, unknown>) => updateDoc(doc(db, 'quotes', id), data)

/** Etat affiche : « En attente » ou « Valide » + nature du document. */
export function quoteStateLabel(q: QuoteDoc): { pending: boolean; label: string; number: string } {
  if (q.status !== 'valide') return { pending: true, label: 'En attente', number: '' }
  const type = q.docType ?? 'devis'
  return { pending: false, label: `Valide — ${DOC_TYPE_LABEL[type]}`, number: type === 'devis' ? q.number : q.docNumber || q.number }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000

export type PaymentState = 'na' | 'impaye' | 'partiel' | 'paye'

/** Situation de reglement d'un devis valide : montant du, encaisse, reste. */
export function quotePayment(q: QuoteDoc): { state: PaymentState; due: number; paid: number; balance: number } {
  const due = round3(q.total + (q.status === 'valide' && q.docType === 'facture' ? TIMBRE : 0))
  const paid = round3((q.payments ?? []).reduce((s, p) => s + p.amount, 0))
  if (q.status !== 'valide') return { state: 'na', due, paid, balance: due }
  const balance = round3(Math.max(0, due - paid))
  return { state: balance <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'impaye', due, paid, balance }
}
