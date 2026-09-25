import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { collection, getDocs, query as fsQuery, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { deleteInvoice, fetchInvoices } from '../../lib/db'
import { updateQuote } from '../../lib/quotes'
import { dt, fmtTs } from '../../lib/format'
import type { InvoiceDoc } from '../../types'
import { InvoiceEditor } from '../../components/InvoiceEditor'
import { InvoiceView } from '../../components/InvoiceView'
import { Empty, inputCls } from '../../components/ui'

export function InvoicesPanel({ ownerUid }: { ownerUid?: string }) {
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState<InvoiceDoc | null>(null)
  const [editing, setEditing] = useState<InvoiceDoc | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { const all = await fetchInvoices(); setInvoices(ownerUid ? all.filter(i => i.ownerUid === ownerUid) : all) } catch { setError(true) } finally { setLoading(false) }
  }, [ownerUid])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? invoices.filter(i => `${i.number} ${i.clientName} ${i.taxId}`.toLowerCase().includes(q)) : invoices
  }, [invoices, query])

  const remove = async (i: InvoiceDoc) => {
    if (!confirm(`Supprimer definitivement la facture ${i.number} (${i.clientName}) ?

Le devis d'origine repassera « En attente » chez le commercial.`)) return
    await deleteInvoice(i.id)
    // Le devis lie a cette facture redevient « en attente » (il ne pointe plus vers une facture supprimee)
    try {
      const linked = await getDocs(fsQuery(collection(db, 'quotes'), where('invoiceId', '==', i.id)))
      await Promise.all(linked.docs.map(d => updateQuote(d.id, { status: 'attente', docType: 'devis', docNumber: '', invoiceId: '', validatedAt: null })))
    } catch { /* aucun devis lie */ }
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (numero, client)..." className={inputCls + ' max-w-sm'} />
        <div className="text-sm text-slate-500">{shown.length} facture{shown.length > 1 ? 's' : ''} — {dt(shown.reduce((s, i) => s + i.totalTTC, 0))} TTC</div>
        <div className="ml-auto text-xs text-slate-400">Pour creer une facture : onglet Devis, bouton Valider, puis Facture.</div>
      </div>

      {loading && <div className="p-8 text-center text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger les factures.</div>}
      {!loading && !error && shown.length === 0 && <Empty text="Aucune facture." />}
      {!loading && shown.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="p-3">Facture</th><th className="p-3">Client</th><th className="p-3">Commercial</th><th className="p-3 text-right">Total TTC</th><th className="p-3">Date</th><th /></tr>
            </thead>
            <tbody>
              {shown.map(i => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="p-3 font-semibold text-navy">{i.number}</td>
                  <td className="p-3">{i.clientName}<div className="text-xs text-slate-400">{i.taxId}</div></td>
                  <td className="p-3 text-slate-500">{i.ownerName || '-'}</td>
                  <td className="p-3 text-right font-bold">{dt(i.totalTTC)}</td>
                  <td className="p-3 text-slate-500">{fmtTs(i.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button title="Voir / imprimer" onClick={() => setViewing(i)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Eye size={15} /></button>
                      <button title="Modifier" onClick={() => setEditing(i)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil size={15} /></button>
                      <button title="Supprimer" onClick={() => remove(i)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <InvoiceView invoice={viewing} onClose={() => setViewing(null)} />}
      {editing && <InvoiceEditor existing={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  )
}
