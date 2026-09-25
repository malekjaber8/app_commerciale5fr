import {
  addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, runTransaction,
  serverTimestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Client, DocLine, InvoiceDoc, OrderDoc, OrderStatus } from '../types'

export const TVA_RATE = 0.19
export const TIMBRE = 1

const sortRecent = <T extends { createdAt?: { seconds: number } | null }>(rows: T[]) =>
  rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))

const toRows = <T>(snap: { docs: { id: string; data: () => unknown }[] }) =>
  snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as T)

/* ───────── calculs ───────── */
export const linesSubtotal = (lines: DocLine[]) => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)

export function computeInvoiceTotals(lines: DocLine[], discountTTC: number) {
  const gross = linesSubtotal(lines)
  const discount = Math.min(Math.max(0, discountTTC), gross)
  const totalHT = (gross - discount) / (1 + TVA_RATE)
  const tva = totalHT * TVA_RATE
  return { discount, totalHT, tva, timbre: TIMBRE, totalTTC: totalHT + tva + TIMBRE }
}

/* ───────── clients ───────── */
export async function fetchClients(ownerUid?: string): Promise<Client[]> {
  const q = ownerUid ? query(collection(db, 'clients'), where('ownerUid', '==', ownerUid)) : collection(db, 'clients')
  const rows = toRows<Client>(await getDocs(q))
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export type ClientInput = Omit<Client, 'id' | 'createdAt'>

export async function createClient(data: ClientInput): Promise<string> {
  const ref = await addDoc(collection(db, 'clients'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}
export const updateClient = (id: string, data: Partial<ClientInput>) => updateDoc(doc(db, 'clients', id), data)
export const deleteClient = (id: string) => deleteDoc(doc(db, 'clients', id))

/* ───────── commandes ───────── */
export async function fetchOrders(ownerUid?: string): Promise<OrderDoc[]> {
  const q = ownerUid ? query(collection(db, 'orders'), where('ownerUid', '==', ownerUid)) : collection(db, 'orders')
  return sortRecent(toRows<OrderDoc>(await getDocs(q)))
}

export type OrderInput = Omit<OrderDoc, 'id' | 'createdAt'>

export async function createOrder(data: OrderInput): Promise<string> {
  const ref = await addDoc(collection(db, 'orders'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}
export const updateOrder = (id: string, data: Partial<OrderInput>) => updateDoc(doc(db, 'orders', id), data)
export const deleteOrder = (id: string) => deleteDoc(doc(db, 'orders', id))
export const setOrderStatus = (id: string, status: OrderStatus) => updateOrder(id, { status })

/* ───────── factures ───────── */
export async function fetchInvoices(): Promise<InvoiceDoc[]> {
  const snap = await getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')))
  return toRows<InvoiceDoc>(snap)
}

export type InvoiceInput = Omit<InvoiceDoc, 'id' | 'createdAt' | 'number'>

/** Numero sequentiel FAC-AAAA-NNNN (compteur transactionnel). */
export async function createInvoice(data: InvoiceInput): Promise<string> {
  const year = new Date().getFullYear()
  const counterRef = doc(db, 'counters', `invoices-${year}`)
  const invoiceRef = doc(collection(db, 'invoices'))
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const next = (snap.exists() ? (snap.data().value as number) : 0) + 1
    tx.set(counterRef, { value: next })
    tx.set(invoiceRef, {
      ...data,
      number: `FAC-${year}-${String(next).padStart(4, '0')}`,
      createdAt: serverTimestamp(),
    })
  })
  return invoiceRef.id
}
export const updateInvoice = (id: string, data: Partial<InvoiceInput>) => updateDoc(doc(db, 'invoices', id), data)
export const deleteInvoice = (id: string) => deleteDoc(doc(db, 'invoices', id))
