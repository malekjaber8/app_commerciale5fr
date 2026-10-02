import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { PaymentMethod } from './quotes'

/** Un encaissement enregistre par l'admin sur un credit (peut etre partiel). */
export interface CreditPayment { id: string; amount: number; at: number; method: PaymentMethod; note: string }

/**
 * Credit ajoute a la main par l'admin (montant du par un client, independant d'un devis cree dans l'app :
 * ancienne dette, accord particulier...). Visible par le commercial concerne, qui ne peut ni le creer ni le modifier.
 */
export interface CreditDoc {
  id: string
  ownerUid: string
  ownerName: string
  client: string
  /** Date du bon de livraison ou de la facture (format YYYY-MM-DD). */
  docDate: string
  /** Numero du BL/facture, optionnel. */
  ref: string
  amount: number
  note: string
  /** Reglements encaisses sur ce credit (admin), eventuellement partiels. */
  payments?: CreditPayment[]
  createdByName: string
  createdAt?: { seconds: number } | null
}
export type NewCredit = Pick<CreditDoc, 'ownerUid' | 'ownerName' | 'client' | 'docDate' | 'ref' | 'amount' | 'note' | 'createdByName'>

const round3 = (n: number) => Math.round(n * 1000) / 1000
export type CreditState = 'impaye' | 'partiel' | 'paye'

/** Situation de reglement d'un credit : montant du, encaisse, reste. */
export function creditPayment(c: CreditDoc): { state: CreditState; paid: number; balance: number } {
  const paid = round3((c.payments ?? []).reduce((s, p) => s + p.amount, 0))
  const balance = round3(Math.max(0, c.amount - paid))
  return { state: balance <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'impaye', paid, balance }
}

const sortByDate = (rows: CreditDoc[]) => rows.sort((a, b) => (b.docDate || '').localeCompare(a.docDate || ''))
const toRows = (snap: { docs: { id: string; data: () => unknown }[] }) =>
  snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as CreditDoc)

export async function fetchMyCredits(uid: string): Promise<CreditDoc[]> {
  return sortByDate(toRows(await getDocs(query(collection(db, 'credits'), where('ownerUid', '==', uid)))))
}
export async function fetchAllCredits(): Promise<CreditDoc[]> {
  return sortByDate(toRows(await getDocs(collection(db, 'credits'))))
}

export const createCredit = (c: NewCredit) => addDoc(collection(db, 'credits'), { ...c, payments: [], createdAt: serverTimestamp() })
export const updateCredit = (id: string, data: Partial<NewCredit>) => updateDoc(doc(db, 'credits', id), data)
export const setCreditPayments = (id: string, payments: CreditPayment[]) => updateDoc(doc(db, 'credits', id), { payments })
export const deleteCredit = (id: string) => deleteDoc(doc(db, 'credits', id))
