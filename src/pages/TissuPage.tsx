import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Scissors, Undo2, User } from 'lucide-react'
import { useAuth } from '../store/auth'
import { Modal } from '../components/ui'
import { markTissuDone, markTissuPending, watchTissuOrders, type TissuLine, type TissuOrderDoc } from '../lib/tissu'

const fmt = (d?: { toDate: () => Date } | null) => d ? d.toDate().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''
const fmtDate = (d?: { toDate: () => Date } | null) => d ? d.toDate().toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }) : ''

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayKey = () => dayKey(new Date())
const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return dayKey(date)
}
const fmtDayLabel = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
}

/** Session de la personne responsable du tissu : uniquement les commandes qui contiennent du tissu,
 * avec le client et la quantite a preparer/couper — rien d'autre (pas de prix, pas d'autres articles). */
export function TissuPage() {
  const { profile, email } = useAuth()
  const [orders, setOrders] = useState<TissuOrderDoc[] | null>(null)
  const [tab, setTab] = useState<'a_preparer' | 'coupe'>('a_preparer')
  const [busy, setBusy] = useState<string | null>(null)
  const [day, setDay] = useState(todayKey)
  const [confirming, setConfirming] = useState<TissuOrderDoc | null>(null)
  const [cutVals, setCutVals] = useState<string[]>([])
  const [ruptured, setRuptured] = useState<boolean[]>([])
  const [splitRoll, setSplitRoll] = useState<boolean[]>([])
  const [rollVals, setRollVals] = useState<{ existing: string; new: string }[]>([])

  useEffect(() => watchTissuOrders(setOrders), [])

  const rows = (orders ?? []).filter(o => o.status === tab && (!o.createdAt || dayKey(o.createdAt.toDate()) === day))

  const openConfirm = (o: TissuOrderDoc) => {
    setConfirming(o)
    setCutVals(o.lines.map(l => String(l.cutQty ?? l.qty)))
    setRuptured(o.lines.map(l => !!l.ruptured))
    setSplitRoll(o.lines.map(l => l.qtyExistingRoll != null || l.qtyNewRoll != null))
    setRollVals(o.lines.map(l => ({ existing: l.qtyExistingRoll != null ? String(l.qtyExistingRoll) : '', new: l.qtyNewRoll != null ? String(l.qtyNewRoll) : '' })))
  }
  const confirmDone = async () => {
    if (!confirming) return
    const lines: TissuLine[] = confirming.lines.map((l, i) => {
      if (ruptured[i]) return { ...l, cutQty: 0, ruptured: true, qtyExistingRoll: undefined, qtyNewRoll: undefined }
      if (splitRoll[i]) {
        const ve = parseFloat(rollVals[i].existing.replace(',', '.'))
        const vn = parseFloat(rollVals[i].new.replace(',', '.'))
        const qtyExistingRoll = Number.isFinite(ve) ? ve : 0
        const qtyNewRoll = Number.isFinite(vn) ? vn : 0
        return { ...l, cutQty: qtyExistingRoll + qtyNewRoll, ruptured: false, qtyExistingRoll, qtyNewRoll }
      }
      const v = parseFloat(cutVals[i].replace(',', '.'))
      return { ...l, cutQty: Number.isFinite(v) ? v : l.qty, ruptured: false, qtyExistingRoll: undefined, qtyNewRoll: undefined }
    }).map(l => {
      // Firestore refuse un champ a `undefined` : on ne garde ces cles que si elles sont definies
      const { qtyExistingRoll, qtyNewRoll, ...rest } = l
      return { ...rest, ...(qtyExistingRoll != null ? { qtyExistingRoll } : {}), ...(qtyNewRoll != null ? { qtyNewRoll } : {}) }
    })
    setBusy(confirming.id)
    try {
      await markTissuDone(confirming.id, profile?.name || email || 'Tissu', lines)
      setConfirming(null)
    } finally { setBusy(null) }
  }
  const undo = async (o: TissuOrderDoc) => {
    setBusy(o.id)
    try { await markTissuPending(o.id) } finally { setBusy(null) }
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto p-3 sm:p-6">
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-navy sm:text-xl"><Scissors size={20} className="shrink-0 sm:hidden" /><Scissors size={22} className="hidden shrink-0 sm:block" /> Commandes de tissu</h1>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex sm:w-auto">
          <button onClick={() => setTab('a_preparer')} className={`rounded-lg px-3 py-2 text-sm font-bold sm:py-1.5 ${tab === 'a_preparer' ? 'bg-navy text-white' : 'text-slate-500'}`}>A preparer</button>
          <button onClick={() => setTab('coupe')} className={`rounded-lg px-3 py-2 text-sm font-bold sm:py-1.5 ${tab === 'coupe' ? 'bg-navy text-white' : 'text-slate-500'}`}>Terminees</button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setDay(d => addDays(d, -1))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 active:bg-slate-100">
          <ChevronLeft size={18} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-bold capitalize text-navy">
          <CalendarDays size={15} className="shrink-0 text-slate-400" /> <span className="truncate">{fmtDayLabel(day)}</span>
        </div>
        <button onClick={() => setDay(d => addDays(d, 1))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 active:bg-slate-100">
          <ChevronRight size={18} />
        </button>
        {day !== todayKey() && (
          <button onClick={() => setDay(todayKey())} className="shrink-0 rounded-xl bg-navy px-3 py-2 text-xs font-bold text-white">Aujourd'hui</button>
        )}
      </div>

      {orders === null ? (
        <div className="p-10 text-center text-slate-400">Chargement...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          {tab === 'a_preparer' ? 'Aucune commande de tissu a preparer ce jour.' : 'Aucune commande terminee ce jour.'}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(o => (
            <div key={o.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4">
                <User size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1 truncate text-sm font-extrabold text-navy">{o.client || 'Sans client'}</div>
                {o.invoiceCode && (
                  <div className="shrink-0 rounded-full bg-teal/15 px-2 py-0.5 text-xs font-bold text-teal-dark">{o.invoiceCode}</div>
                )}
                <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <CalendarDays size={13} /> {fmtDate(o.createdAt)}
                </div>
              </div>
              {o.status === 'coupe' && (
                <div className="border-b border-slate-100 px-3 py-1.5 text-xs text-slate-400 sm:px-4">
                  Prepare par {o.preparedBy} — {fmt(o.preparedAt)}
                </div>
              )}
              <div className="divide-y divide-slate-50">
                {o.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-3 text-sm sm:px-4">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-700">{l.name}</div>
                      <div className="truncate text-xs text-slate-400">{l.variant}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-extrabold text-navy">{l.qty}{l.unit ? ` ${l.unit}` : ''}</div>
                      {o.status === 'coupe' && (l.ruptured ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-red-600"><AlertTriangle size={12} /> rupture</div>
                      ) : l.qtyExistingRoll != null ? (
                        <div className="text-xs font-semibold text-teal-dark">{l.qtyExistingRoll}{l.unit} (en cours) + {l.qtyNewRoll}{l.unit} (nouveau)</div>
                      ) : l.cutQty != null && l.cutQty !== l.qty && (
                        <div className="text-xs font-semibold text-teal-dark">coupe : {l.cutQty}{l.unit ? ` ${l.unit}` : ''}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-slate-100 p-2.5">
                {o.status === 'a_preparer' ? (
                  <button onClick={() => openConfirm(o)} disabled={busy === o.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:w-auto sm:py-2">
                    <CheckCircle2 size={16} /> {busy === o.id ? 'Enregistrement...' : 'Tissu prepare / coupe'}
                  </button>
                ) : (
                  <button onClick={() => undo(o)} disabled={busy === o.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-60 sm:w-auto sm:py-2">
                    <Undo2 size={15} /> Remettre a preparer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirming && (
        <Modal title="Quantite de tissu coupee" onClose={() => setConfirming(null)}>
          <div className="space-y-3">
            <div className="text-sm text-slate-500">{confirming.client || 'Sans client'}</div>
            {confirming.lines.map((l, i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-2.5">
                <div className="mb-2 min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-700">{l.name}</div>
                  <div className="truncate text-xs text-slate-400">{l.variant} — commande : {l.qty}{l.unit ? ` ${l.unit}` : ''}</div>
                </div>
                {!ruptured[i] && !splitRoll[i] && (
                  <div className="flex items-center gap-2">
                    <input type="number" inputMode="decimal" step="any" value={cutVals[i] ?? ''}
                      onChange={e => setCutVals(v => v.map((x, j) => j === i ? e.target.value : x))}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm font-bold text-navy outline-none focus:border-teal" />
                    {l.unit && <span className="shrink-0 text-sm text-slate-400">{l.unit}</span>}
                    <button type="button" onClick={() => setSplitRoll(v => v.map((x, j) => j === i ? !x : x))}
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">2 rouleaux</button>
                  </div>
                )}
                {!ruptured[i] && splitRoll[i] && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-32 shrink-0 text-xs text-slate-500">Rouleau en cours</span>
                      <input type="number" inputMode="decimal" step="any" value={rollVals[i]?.existing ?? ''}
                        onChange={e => setRollVals(v => v.map((x, j) => j === i ? { ...x, existing: e.target.value } : x))}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm font-bold text-navy outline-none focus:border-teal" />
                      {l.unit && <span className="shrink-0 text-sm text-slate-400">{l.unit}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-32 shrink-0 text-xs text-slate-500">Nouveau rouleau</span>
                      <input type="number" inputMode="decimal" step="any" value={rollVals[i]?.new ?? ''}
                        onChange={e => setRollVals(v => v.map((x, j) => j === i ? { ...x, new: e.target.value } : x))}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm font-bold text-navy outline-none focus:border-teal" />
                      {l.unit && <span className="shrink-0 text-sm text-slate-400">{l.unit}</span>}
                    </div>
                    <button type="button" onClick={() => setSplitRoll(v => v.map((x, j) => j === i ? !x : x))}
                      className="text-xs font-semibold text-slate-400 underline">Revenir a un seul rouleau</button>
                  </div>
                )}
                <button type="button" onClick={() => setRuptured(v => v.map((x, j) => j === i ? !x : x))}
                  className={`mt-2 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold ${ruptured[i] ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 text-red-600'}`}>
                  <AlertTriangle size={13} /> Rupture de stock
                </button>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirming(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
              <button onClick={confirmDone} disabled={busy === confirming.id}
                className="flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                <CheckCircle2 size={16} /> {busy === confirming.id ? 'Enregistrement...' : 'Valider'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
