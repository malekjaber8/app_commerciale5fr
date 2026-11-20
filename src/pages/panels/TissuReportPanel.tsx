import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Save, Scissors, X } from 'lucide-react'
import { setTissuInvoiceCode, setTissuVerified, watchTissuOrders, type TissuOrderDoc } from '../../lib/tissu'
import { useAuth } from '../../store/auth'
import { Empty, inputCls } from '../../components/ui'

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Champ independant (etat local) pour ne pas perdre la saisie en cours quand le flux temps reel rafraichit la liste. */
function InvoiceCodeField({ order }: { order: TissuOrderDoc }) {
  const [value, setValue] = useState(order.invoiceCode ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = value !== (order.invoiceCode ?? '')

  const save = async (code: string) => {
    setSaving(true)
    try { await setTissuInvoiceCode(order.id, code.trim()); setValue(code.trim()) } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2.5">
      <span className="shrink-0 text-xs font-semibold text-slate-500">Code facture/BL :</span>
      <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && save(value)}
        placeholder="ex. BL-0245" className={inputCls + ' h-8 max-w-[160px] py-1'} />
      {dirty && (
        <button onClick={() => save(value)} disabled={saving} className="flex shrink-0 items-center gap-1 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60">
          <Save size={13} /> {saving ? '...' : 'Envoyer'}
        </button>
      )}
      {!dirty && value && (
        <button onClick={() => save('')} disabled={saving} title="Supprimer le code" className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 disabled:opacity-60">
          <X size={13} /> Supprimer
        </button>
      )}
    </div>
  )
}

/** Rapport journalier des commandes de tissu traitees (preparees/coupees), avec verification par l'admin. */
export function TissuReportPanel() {
  const { profile, email } = useAuth()
  const [orders, setOrders] = useState<TissuOrderDoc[] | null>(null)
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => watchTissuOrders(setOrders), [])

  const shown = useMemo(() => (orders ?? [])
    .filter(o => o.preparedAt && dayKey(o.preparedAt.toDate()) === day)
    .sort((a, b) => (b.preparedAt?.toDate().getTime() ?? 0) - (a.preparedAt?.toDate().getTime() ?? 0)),
  [orders, day])

  const shift = (n: number) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); setDay(dayKey(d)) }

  const toggleVerified = async (o: TissuOrderDoc) => {
    setBusy(o.id)
    try { await setTissuVerified(o.id, !o.verified, profile?.name || email || 'Admin') } finally { setBusy(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => shift(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">&larr;</button>
        <input type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} className={inputCls + ' w-auto'} />
        <button onClick={() => shift(1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">&rarr;</button>
        <button onClick={() => setDay(dayKey(new Date()))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Aujourd'hui</button>
      </div>

      {orders === null && <div className="p-8 text-center text-slate-400">Chargement...</div>}
      {orders !== null && shown.length === 0 && <Empty text="Aucune commande de tissu traitee ce jour-la." />}

      {shown.length > 0 && (
        <div className="space-y-3">
          {shown.map(o => (
            <div key={o.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <Scissors size={15} className="shrink-0 text-slate-400" />
                <div className="text-sm font-extrabold text-navy">{o.client || 'Sans client'}</div>
                <div className="text-xs text-slate-400">— {o.preparedBy} a {o.preparedAt ? hhmm(o.preparedAt.toDate()) : ''}</div>
                <button onClick={() => toggleVerified(o)} disabled={busy === o.id}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${o.verified ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                  <CheckCircle2 size={14} /> {o.verified ? 'Verifie' : 'Marquer verifie'}
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {o.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-700">{l.name}</div>
                      <div className="truncate text-xs text-slate-400">{l.variant} — commande : {l.qty}{l.unit ? ` ${l.unit}` : ''}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      {l.ruptured ? (
                        <div className="flex items-center gap-1 text-sm font-bold text-red-600"><AlertTriangle size={14} /> Rupture</div>
                      ) : (
                        <div className="text-lg font-extrabold text-navy">{l.cutQty ?? l.qty}{l.unit ? ` ${l.unit}` : ''}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <InvoiceCodeField order={o} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
