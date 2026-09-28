import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { DOC_TYPE_LABEL, PAYMENT_METHOD_LABEL, type QuoteDoc } from '../lib/quotes'
import { dt } from '../lib/format'
import { Modal } from './ui'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Row { quote: QuoteDoc; amount: number; method: string; note: string; at: number }

/** Rapport du jour : encaissements du jour choisi, par client, avec le total encaisse. Reserve a l'admin. */
export function DailyReportModal({ quotes, onClose }: { quotes: QuoteDoc[]; onClose: () => void }) {
  const [date, setDate] = useState(todayStr)

  const rows = useMemo<Row[]>(() => {
    const start = new Date(date + 'T00:00:00').getTime()
    const end = new Date(date + 'T23:59:59.999').getTime()
    const out: Row[] = []
    for (const q of quotes) {
      for (const p of q.payments ?? []) {
        if (p.at >= start && p.at <= end) out.push({ quote: q, amount: p.amount, method: PAYMENT_METHOD_LABEL[p.method], note: p.note, at: p.at })
      }
    }
    return out.sort((a, b) => a.at - b.at)
  }, [quotes, date])

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const clientCount = new Set(rows.map(r => r.quote.id)).size
  const label = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Modal title="Rapport du jour" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="no-print flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            Date
            <input type="date" value={date} max={todayStr()} onChange={e => e.target.value && setDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
          </label>
          <button onClick={() => setDate(todayStr())} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-teal-dark hover:bg-slate-50">Aujourd&apos;hui</button>
          <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:opacity-90"><Printer size={15} /> Imprimer</button>
        </div>

        <div className="print-area">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-lg font-extrabold text-navy">Rapport du jour</div>
              <div className="text-sm capitalize text-slate-500">{label}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total encaisse</div>
              <div className="text-2xl font-extrabold text-teal-dark">{dt(total)}</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">Aucun reglement enregistre ce jour-la.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Client</th>
                    <th className="p-3">Document</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Note</th>
                    <th className="p-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const type = r.quote.docType ?? 'devis'
                    const number = type === 'devis' || !r.quote.docNumber ? r.quote.number : r.quote.docNumber
                    return (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-3 font-bold text-navy">{r.quote.client || '—'}</td>
                        <td className="p-3 text-slate-600">{DOC_TYPE_LABEL[type]} <span className="text-slate-400">{number}</span></td>
                        <td className="p-3 text-slate-600">{r.method}</td>
                        <td className="p-3 text-slate-400">{r.note || '—'}</td>
                        <td className="p-3 text-right font-bold text-navy">{dt(r.amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="p-3 font-bold text-navy" colSpan={4}>{rows.length} reglement{rows.length > 1 ? 's' : ''} — {clientCount} client{clientCount > 1 ? 's' : ''}</td>
                    <td className="p-3 text-right text-base font-extrabold text-teal-dark">{dt(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="no-print flex justify-end"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Fermer</button></div>
      </div>
    </Modal>
  )
}
