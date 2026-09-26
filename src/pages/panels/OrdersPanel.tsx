import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { FilePlus2, Pencil, Printer, Trash2 } from 'lucide-react'
import { db } from '../../firebase'
import { deleteOrder, fetchOrders, setOrderStatus, computeInvoiceTotals } from '../../lib/db'
import { dt, fmtTs } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { ORDER_STATUS_LABEL, type Client, type OrderDoc, type OrderStatus } from '../../types'
import { SalesDocView } from '../../components/SalesDocView'
import { useDialogs } from '../../components/Dialogs'
import { OrderEditor } from '../../components/OrderEditor'
import { InvoiceEditor, type InvoiceSeed } from '../../components/InvoiceEditor'
import { Empty, inputCls } from '../../components/ui'

const STATUS_STYLE: Record<OrderStatus, string> = {
  nouvelle: 'bg-blue-100 text-blue-700',
  confirmee: 'bg-amber-100 text-amber-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-slate-200 text-slate-600',
}

interface Props { ownerUid?: string; admin?: boolean }

export function OrdersPanel({ ownerUid, admin }: Props) {
  const { uid } = useAuth()
  const { ask, notify } = useDialogs()
  const scope = ownerUid ?? (admin ? undefined : uid ?? undefined)
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewing, setViewing] = useState<OrderDoc | null>(null)
  const [editing, setEditing] = useState<OrderDoc | null>(null)
  const [invoiceSeed, setInvoiceSeed] = useState<InvoiceSeed | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setOrders(await fetchOrders(scope)) } catch { setError(true) } finally { setLoading(false) }
  }, [scope])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => (statusFilter ? orders.filter(o => o.status === statusFilter) : orders), [orders, statusFilter])
  const total = shown.reduce((s, o) => (o.status === 'annulee' ? s : s + o.total), 0)

  const changeStatus = async (o: OrderDoc, s: OrderStatus) => { await setOrderStatus(o.id, s); await load() }
  const remove = async (o: OrderDoc) => {
    if (!(await ask(`Supprimer la commande ${o.number} ?`, { confirmLabel: 'Supprimer' }))) return
    await deleteOrder(o.id); await load()
  }

  const makeInvoice = async (o: OrderDoc) => {
    let client: Client | null = null
    if (o.clientId) {
      try { const s = await getDoc(doc(db, 'clients', o.clientId)); if (s.exists()) client = s.data() as Client } catch { /* facture sans fiche client */ }
    }
    setInvoiceSeed({
      orderId: o.id, clientId: o.clientId, clientName: client?.name || o.clientName, taxId: client?.taxId || '',
      address: client?.address || '', phone: client?.phone || o.phone, ownerUid: o.ownerUid, ownerName: o.ownerName,
      lines: o.lines, note: o.note, discount: computeInvoiceTotals(o.lines, o.discount).discount,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls + ' max-w-[200px]'}>
          <option value="">Tous les statuts</option>
          {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map(s => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <div className="text-sm text-slate-500">{shown.length} commande{shown.length > 1 ? 's' : ''} — {dt(total)} (hors annulees)</div>
        <button onClick={load} className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Actualiser</button>
      </div>

      {loading && <div className="p-8 text-center text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger les commandes.</div>}
      {!loading && !error && shown.length === 0 && <Empty text="Aucune commande." />}
      {!loading && shown.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="w-8" /><th className="p-3">Commande</th><th className="p-3">Client</th>{admin && !ownerUid && <th className="p-3">Commercial</th>}<th className="p-3 text-right">Total</th><th className="p-3">Statut</th><th className="p-3">Date</th>{admin && <th />}</tr>
            </thead>
            <tbody>
              {shown.map(o => {
                return (
                    <tr key={o.id} onClick={() => setViewing(o)} title="Ouvrir le bon de commande" className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                      <td className="pl-3 text-slate-400"><Printer size={14} /></td>
                      <td className="p-3 font-semibold text-navy">{o.number}</td>
                      <td className="p-3"><div>{o.clientName || '-'}</div><div className="text-xs text-slate-400">{o.phone}</div></td>
                      {admin && !ownerUid && <td className="p-3 text-slate-500">{o.ownerName || o.ownerEmail}</td>}
                      <td className="p-3 text-right font-bold">{dt(o.total)}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        {admin ? (
                          <select value={o.status} onChange={e => changeStatus(o, e.target.value as OrderStatus)} className={`rounded-full px-2 py-1 text-xs font-bold outline-none ${STATUS_STYLE[o.status]}`}>
                            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map(s => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                          </select>
                        ) : (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">{fmtTs(o.createdAt)}</td>
                      {admin && (
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button title="Modifier" onClick={() => setEditing(o)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil size={15} /></button>
                            <button title="Creer une facture" onClick={() => makeInvoice(o)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-teal/10 hover:text-teal-dark"><FilePlus2 size={15} /></button>
                            <button title="Supprimer" onClick={() => remove(o)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <SalesDocView onClose={() => setViewing(null)} doc={{
          kind: 'commande', number: viewing.number, date: viewing.createdAt ? viewing.createdAt.toDate() : null,
          clientId: viewing.clientId, clientName: viewing.clientName, phone: viewing.phone, ownerName: viewing.ownerName,
          lines: viewing.lines, discount: viewing.discount, discountPct: viewing.discountPct, note: viewing.note,
        }} />
      )}
      {editing && <OrderEditor order={editing} onClose={() => setEditing(null)} onSaved={load} />}
      {invoiceSeed && <InvoiceEditor seed={invoiceSeed} onClose={() => setInvoiceSeed(null)} onSaved={() => { notify("Facture creee. Retrouvez-la dans l'onglet Factures.") }} />}
    </div>
  )
}
