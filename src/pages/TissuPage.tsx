import { useEffect, useState } from 'react'
import { CheckCircle2, Scissors, Undo2, User } from 'lucide-react'
import { useAuth } from '../store/auth'
import { markTissuDone, markTissuPending, watchTissuOrders, type TissuOrderDoc } from '../lib/tissu'

const fmt = (d?: { toDate: () => Date } | null) => d ? d.toDate().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''

/** Session de la personne responsable du tissu : uniquement les commandes qui contiennent du tissu,
 * avec le client et la quantite a preparer/couper — rien d'autre (pas de prix, pas d'autres articles). */
export function TissuPage() {
  const { profile, email } = useAuth()
  const [orders, setOrders] = useState<TissuOrderDoc[] | null>(null)
  const [tab, setTab] = useState<'a_preparer' | 'coupe'>('a_preparer')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => watchTissuOrders(setOrders), [])

  const rows = (orders ?? []).filter(o => o.status === tab)

  const done = async (o: TissuOrderDoc) => {
    setBusy(o.id)
    try { await markTissuDone(o.id, profile?.name || email || 'Tissu') } finally { setBusy(null) }
  }
  const undo = async (o: TissuOrderDoc) => {
    setBusy(o.id)
    try { await markTissuPending(o.id) } finally { setBusy(null) }
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-navy"><Scissors size={22} /> Commandes de tissu</h1>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button onClick={() => setTab('a_preparer')} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === 'a_preparer' ? 'bg-navy text-white' : 'text-slate-500'}`}>A preparer</button>
          <button onClick={() => setTab('coupe')} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === 'coupe' ? 'bg-navy text-white' : 'text-slate-500'}`}>Terminees</button>
        </div>
      </div>

      {orders === null ? (
        <div className="p-10 text-center text-slate-400">Chargement...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          {tab === 'a_preparer' ? 'Aucune commande de tissu a preparer pour le moment.' : 'Aucune commande terminee.'}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(o => (
            <div key={o.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <User size={15} className="text-slate-400" />
                <div className="text-sm font-extrabold text-navy">{o.client || 'Sans client'}</div>
                {o.status === 'coupe' && <div className="ml-auto text-xs text-slate-400">Prepare par {o.preparedBy} — {fmt(o.preparedAt)}</div>}
              </div>
              <div className="divide-y divide-slate-50">
                {o.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <div className="font-semibold text-slate-700">{l.name}</div>
                      <div className="text-xs text-slate-400">{l.variant}</div>
                    </div>
                    <div className="text-lg font-extrabold text-navy">{l.qty}{l.unit ? ` ${l.unit}` : ''}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-slate-100 p-2.5">
                {o.status === 'a_preparer' ? (
                  <button onClick={() => done(o)} disabled={busy === o.id}
                    className="flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                    <CheckCircle2 size={16} /> {busy === o.id ? 'Enregistrement...' : 'Tissu prepare / coupe'}
                  </button>
                ) : (
                  <button onClick={() => undo(o)} disabled={busy === o.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60">
                    <Undo2 size={15} /> Remettre a preparer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
