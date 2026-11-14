import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'
import type { Article, QuoteLine } from '../types'

export interface TissuLine { name: string; variant: string; qty: number; unit?: string }

export type TissuStatus = 'a_preparer' | 'coupe'

export interface TissuOrderDoc {
  id: string
  quoteId: string
  ownerUid: string
  ownerName: string
  client: string
  lines: TissuLine[]
  status: TissuStatus
  createdAt?: { toDate: () => Date }
  preparedAt?: { toDate: () => Date } | null
  preparedBy?: string
}

/** Lignes d'un devis qui appartiennent a la categorie Tissu (et ses sous-categories eventuelles). */
export function tissuLinesOf(
  lines: Pick<QuoteLine, 'articleId' | 'name' | 'variant' | 'qty'>[],
  articles: Article[],
  tissuScope: string[],
): TissuLine[] {
  const byId = new Map(articles.map(a => [a.id, a]))
  const out: TissuLine[] = []
  for (const l of lines) {
    const a = byId.get(l.articleId)
    if (a && tissuScope.includes(a.categoryId)) out.push({ name: l.name, variant: l.variant, qty: l.qty, unit: a.unit })
  }
  return out
}

/**
 * Cree/actualise la tache de preparation du tissu d'un devis, ou la supprime s'il n'a plus de ligne de tissu.
 * `previousTissuLines` (lignes de tissu du devis avant la modification, absent pour une creation) sert a ne
 * remettre le statut a « a preparer » que si le tissu a reellement change, pour ne pas annuler une preparation
 * deja marquee terminee lors d'une modification du devis sans rapport avec le tissu (ex. juste le telephone).
 */
export async function syncTissuOrder(
  quoteId: string,
  meta: { ownerUid: string; ownerName: string; client: string },
  tissuLines: TissuLine[],
  previousTissuLines?: TissuLine[],
): Promise<void> {
  const ref = doc(db, 'tissuOrders', quoteId)
  if (tissuLines.length === 0) {
    await deleteDoc(ref).catch(() => {})
    return
  }
  const changed = previousTissuLines === undefined || JSON.stringify(previousTissuLines) !== JSON.stringify(tissuLines)
  await setDoc(ref, {
    quoteId, ownerUid: meta.ownerUid, ownerName: meta.ownerName, client: meta.client, lines: tissuLines,
    ...(changed ? { status: 'a_preparer' as const, createdAt: serverTimestamp(), preparedAt: null, preparedBy: null } : {}),
  }, { merge: true })
}

export const deleteTissuOrder = (quoteId: string) => deleteDoc(doc(db, 'tissuOrders', quoteId)).catch(() => {})

/** Toutes les taches de tissu, en direct (tri le plus recent en premier, cote client). */
export function watchTissuOrders(cb: (orders: TissuOrderDoc[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'tissuOrders'), snap => {
    const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<TissuOrderDoc, 'id'>) }))
    rows.sort((a, b) => (b.createdAt?.toDate().getTime() ?? 0) - (a.createdAt?.toDate().getTime() ?? 0))
    cb(rows)
  }, () => cb([]))
}

export const markTissuDone = (id: string, preparedBy: string) =>
  updateDoc(doc(db, 'tissuOrders', id), { status: 'coupe', preparedAt: serverTimestamp(), preparedBy })

export const markTissuPending = (id: string) =>
  updateDoc(doc(db, 'tissuOrders', id), { status: 'a_preparer', preparedAt: null, preparedBy: null })
