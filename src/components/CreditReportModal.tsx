import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { DOC_TYPE_LABEL, quotePayment, type QuoteDoc } from '../lib/quotes'
import { creditPayment, type CreditDoc } from '../lib/credits'
import { dt } from '../lib/format'
import { Modal } from './ui'

interface Row { client: string; ownerName: string; docLabel: string; docNumber: string; dateKey: string; dateLabel: string; total: number; paid: number; balance: number }

/** Contenu du rapport de credit : toutes les commandes et credits non soldes, filtres par la plage de dates choisie. */
export function CreditReportContent({ quotes, credits, from: initialFrom, to: initialTo }: { quotes: QuoteDoc[]; credits: CreditDoc[]; from?: string; to?: string }) {
  const [from, setFrom] = useState(initialFrom ?? '')
  const [to, setTo] = useState(initialTo ?? '')

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const q of quotes) {
      if (q.status !== 'valide') continue
      const pay = quotePayment(q)
      if (pay.state === 'paye') continue
      const d = q.createdAt?.toDate()
      if (!d) continue
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (from && dateKey < from) continue
      if (to && dateKey > to) continue
      const type = q.docType ?? 'devis'
      const number = type === 'devis' || !q.docNumber ? q.number : q.docNumber
      out.push({ client: q.client || '—', ownerName: q.ownerName || q.ownerEmail, docLabel: DOC_TYPE_LABEL[type], docNumber: number, dateKey, dateLabel: d.toLocaleDateString('fr-FR'), total: pay.due, paid: pay.paid, balance: pay.balance })
    }
    for (const c of credits) {
      const pay = creditPayment(c)
      if (pay.state === 'paye') continue
      const dateKey = c.docDate || ''
      if (from && dateKey < from) continue
      if (to && dateKey > to) continue
      out.push({ client: c.client, ownerName: c.ownerName, docLabel: 'Credit', docNumber: c.ref || '—', dateKey, dateLabel: dateKey ? new Date(dateKey + 'T12:00:00').toLocaleDateString('fr-FR') : '—', total: c.amount, paid: pay.paid, balance: pay.balance })
    }
    return out.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }, [quotes, credits, from, to])

  const total = rows.reduce((s, r) => s + r.total, 0)
  const paidTotal = rows.reduce((s, r) => s + r.paid, 0)
  const balanceTotal = rows.reduce((s, r) => s + r.balance, 0)
  const clientCount = new Set(rows.map(r => r.client)).size
  const periodLabel = from && to ? (from === to ? new Date(from + 'T12:00:00').toLocaleDateString('fr-FR') : `du ${new Date(from + 'T12:00:00').toLocaleDateString('fr-FR')} au ${new Date(to + 'T12:00:00').toLocaleDateString('fr-FR')}`)
    : from ? `a partir du ${new Date(from + 'T12:00:00').toLocaleDateString('fr-FR')}`
    : to ? `jusqu'au ${new Date(to + 'T12:00:00').toLocaleDateString('fr-FR')}`
    : 'toutes dates confondues'

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          Du
          <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          au
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
        </label>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }} className="text-xs font-bold text-teal-dark underline">Toutes dates</button>
        )}
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:opacity-90"><Printer size={15} /> Imprimer</button>
      </div>

      <div className="print-area">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-lg font-extrabold text-navy">Rapport de credit</div>
            <div className="text-sm capitalize text-slate-500">{periodLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reste a encaisser</div>
            <div className="text-2xl font-extrabold text-red-600">{dt(balanceTotal)}</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">Aucun credit sur cette periode.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Client</th>
                  <th className="p-3">Commercial</th>
                  <th className="p-3">Document</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Paye</th>
                  <th className="p-3 text-right">Reste</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-3 font-bold text-navy">{r.client}</td>
                    <td className="p-3 text-slate-600">{r.ownerName}</td>
                    <td className="p-3 text-slate-600">{r.docLabel} <span className="text-slate-400">{r.docNumber}</span></td>
                    <td className="p-3 text-slate-500">{r.dateLabel}</td>
                    <td className="p-3 text-right text-slate-600">{dt(r.total)}</td>
                    <td className="p-3 text-right text-slate-600">{dt(r.paid)}</td>
                    <td className="p-3 text-right font-bold text-red-600">{dt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="p-3 font-bold text-navy" colSpan={4}>{rows.length} credit{rows.length > 1 ? 's' : ''} — {clientCount} client{clientCount > 1 ? 's' : ''}</td>
                  <td className="p-3 text-right font-bold text-navy">{dt(total)}</td>
                  <td className="p-3 text-right font-bold text-navy">{dt(paidTotal)}</td>
                  <td className="p-3 text-right text-base font-extrabold text-red-600">{dt(balanceTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/** Rapport de credit en modale : commandes et credits non soldes, filtrables par plage de dates. */
export function CreditReportModal({ quotes, credits, from, to, onClose }: { quotes: QuoteDoc[]; credits: CreditDoc[]; from?: string; to?: string; onClose: () => void }) {
  return (
    <Modal title="Rapport de credit" onClose={onClose} wide printable>
      <div className="space-y-4">
        <CreditReportContent quotes={quotes} credits={credits} from={from} to={to} />
        <div className="no-print flex justify-end"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Fermer</button></div>
      </div>
    </Modal>
  )
}
