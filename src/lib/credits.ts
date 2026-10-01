import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'

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
  paid: boolean
  paidAt: number | null
  createdByName: string
  createdAt?: { seconds: number } | null
}
export type NewCredit = Pick<CreditDoc, 'ownerUid' | 'ownerName' | 'client' | 'docDate' | 'ref' | 'amount' | 'note' | 'createdByName'>

const sortByDate = (rows: CreditDoc[]) => rows.sort((a, b) => (b.docDate || '').localeCompare(a.docDate || ''))
const toRows = (snap: { docs: { id: string; data: () => unknown }[] }) =>
  snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as CreditDoc)

export async function fetchMyCredits(uid: string): Promise<CreditDoc[]> {
  return sortByDate(toRows(await getDocs(query(collection(db, 'credits'), where('ownerUid', '==', uid)))))
}
export async function fetchAllCredits(): Promise<CreditDoc[]> {
  return sortByDate(toRows(await getDocs(collection(db, 'credits'))))
}

export const createCredit = (c: NewCredit) => addDoc(collection(db, 'credits'), { ...c, paid: false, paidAt: null, createdAt: serverTimestamp() })
export const updateCredit = (id: string, data: Partial<NewCredit>) => updateDoc(doc(db, 'credits', id), data)
export const setCreditPaid = (id: string, paid: boolean) => updateDoc(doc(db, 'credits', id), { paid, paidAt: paid ? Date.now() : null })
export const deleteCredit = (id: string) => deleteDoc(doc(db, 'credits', id))
