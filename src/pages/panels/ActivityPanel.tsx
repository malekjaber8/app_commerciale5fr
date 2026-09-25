import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, RefreshCw, ShoppingCart, UserSquare2 } from 'lucide-react'
import { fetchClients, fetchOrders } from '../../lib/db'
import { fetchAllQuotes, fetchMyQuotes } from '../../lib/quotes'
import { dt } from '../../lib/format'
import { ORDER_STATUS_LABEL } from '../../types'
import { Empty, inputCls } from '../../components/ui'

type Kind = 'quote' | 'order' | 'client'
interface Event { id: string; kind: Kind; at: Date; ownerUid: string; ownerName: string; title: string; detail: string; amount: number | null }

const KIND_META: Record<Kind, { label: string; icon: typeof FileText; cls: string }> = {
  quote: { label: 'Devis', icon: FileText, cls: 'bg-sky-100 text-sky-700' },
  order: { label: 'Commande', icon: ShoppingCart, cls: 'bg-emerald-100 text-emerald-700' },
  client: { label: 'Client', icon: UserSquare2, cls: 'bg-violet-100 text-violet-700' },
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Journal d'activite : tout ce que les commerciaux ont cree (devis, commandes, clients) pour une journee donnee. */
export function ActivityPanel({ ownerUid }: { ownerUid?: string }) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [who, setWho] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const [quotes, orders, clients] = await Promise.all([
        ownerUid ? fetchMyQuotes(ownerUid) : fetchAllQuotes(),
        fetchOrders(ownerUid),
        fetchClients(ownerUid),
      ])
      const out: Event[] = []
      for (const q of quotes) if (q.createdAt) out.push({
        id: 'q' + q.id, kind: 'quote', at: q.createdAt.toDate(), ownerUid: q.ownerUid, ownerName: q.ownerName || q.ownerEmail,
        title: `${q.number} — ${q.client || 'sans client'}`, detail: `${q.lines.length} ligne(s)${q.discountPct ? `, remise ${q.discountPct}%` : ''}`, amount: q.total,
      })
      for (const o of orders) if (o.createdAt) out.push({
        id: 'o' + o.id, kind: 'order', at: o.createdAt.toDate(), ownerUid: o.ownerUid, ownerName: o.ownerName || o.ownerEmail,
        title: `${o.number} — ${o.clientName || 'sans client'}`, detail: ORDER_STATUS_LABEL[o.status], amount: o.total,
      })
      for (const c of clients) if (c.createdAt) out.push({
        id: 'c' + c.id, kind: 'client', at: c.createdAt.toDate(), ownerUid: c.ownerUid, ownerName: c.ownerName,
        title: c.name, detail: c.phone || 'nouveau client', amount: null,
      })
      setEvents(out)
    } catch { setError(true) } finally { setLoading(false) }
  }, [ownerUid])
  useEffect(() => { load() }, [load])

  const dayEvents = useMemo(() => events.filter(e => dayKey(e.at) === day).sort((a, b) => b.at.getTime() - a.at.getTime()), [events, day])

  const people = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of dayEvents) m.set(e.ownerUid, e.ownerName || e.ownerUid)
    return [...m.entries()]
  }, [dayEvents])

  const shown = who ? dayEvents.filter(e => e.ownerUid === who) : dayEvents

  const summary = useMemo(() => people.map(([uid, name]) => {
    const mine = dayEvents.filter(e => e.ownerUid === uid)
    const times = mine.map(e => e.at.getTime())
    return {
      uid, name,
      quotes: mine.filter(e => e.kind === 'quote').length,
      orders: mine.filter(e => e.kind === 'order').length,
      clients: mine.filter(e => e.kind === 'client').length,
      amount: mine.filter(e => e.kind === 'quote').reduce((s, e) => s + (e.amount ?? 0), 0),
      first: new Date(Math.min(...times)), last: new Date(Math.max(...times)),
    }
  }), [people, dayEvents])

  const shift = (n: number) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); setDay(dayKey(d)) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => shift(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">&larr;</button>
        <input type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} className={inputCls + ' w-auto'} />
        <button onClick={() => shift(1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">&rarr;</button>
        <button onClick={() => setDay(dayKey(new Date()))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Aujourd'hui</button>
        {!ownerUid && people.length > 1 && (
          <select value={who} onChange={e => setWho(e.target.value)} className={inputCls + ' w-auto'}>
            <option value="">Tous les commerciaux</option>
            {people.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
          </select>
        )}
        <button onClick={load} className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"><RefreshCw size={14} /> Actualiser</button>
      </div>

      {loading && <div className="p-8 text-center text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger l'activite.</div>}

      {!loading && !error && summary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map(s => (
            <button key={s.uid} onClick={() => !ownerUid && setWho(who === s.uid ? '' : s.uid)}
              className={`rounded-2xl border bg-white p-4 text-left ${who === s.uid ? 'border-teal ring-2 ring-teal/30' : 'border-slate-200'}`}>
              <div className="font-bold text-navy">{s.name}</div>
              <div className="text-xs text-slate-400">Actif de {hhmm(s.first)} a {hhmm(s.last)}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xl font-extrabold text-sky-700">{s.quotes}</div><div className="text-[11px] text-slate-500">devis</div></div>
                <div><div className="text-xl font-extrabold text-emerald-700">{s.orders}</div><div className="text-[11px] text-slate-500">commandes</div></div>
                <div><div className="text-xl font-extrabold text-violet-700">{s.clients}</div><div className="text-[11px] text-slate-500">clients</div></div>
              </div>
              <div className="mt-2 text-xs text-slate-500">Devis du jour : <b className="text-navy">{dt(s.amount)}</b></div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && shown.length === 0 && <Empty text="Aucune activite ce jour-la." />}
      {!loading && shown.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {shown.map(e => {
            const m = KIND_META[e.kind]
            return (
              <div key={e.id} className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0">
                <div className="w-12 shrink-0 text-sm font-bold text-navy">{hhmm(e.at)}</div>
                <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${m.cls}`}><m.icon size={13} /> {m.label}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{e.title}</div>
                  <div className="truncate text-xs text-slate-400">{!ownerUid && `${e.ownerName} — `}{e.detail}</div>
                </div>
                {e.amount != null && <div className="shrink-0 text-sm font-bold text-navy">{dt(e.amount)}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
