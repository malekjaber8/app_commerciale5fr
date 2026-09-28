import { useMemo, useState } from 'react'
import { Banknote, CheckCheck, Printer } from 'lucide-react'
import { DOC_TYPE_LABEL, PAYMENT_METHOD_LABEL, updateQuote, type DeclaredCollection, type Payment, type QuoteDoc } from '../lib/quotes'
import { dt } from '../lib/format'
import { Modal } from './ui'
import { useDialogs } from './Dialogs'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Row { quote: QuoteDoc; amount: number; method: string; note: string; at: number }
interface DeclRow { quote: QuoteDoc; entry: DeclaredCollection }

/** Rapport du jour : encaissements du jour choisi, par client, avec le total encaisse. Reserve a l'admin. */
export function DailyReportModal({ quotes, onClose, onVerified }: { quotes: QuoteDoc[]; onClose: () => void; onVerified?: () => void }) {
  const { ask } = useDialogs()
  const [date, setDate] = useState(todayStr)
  const [busy, setBusy] = useState('')

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

  // Declarations des commerciaux (argent pris a la livraison) pour ce jour-la, a rapprocher de ce qu'ils rapportent
  const declRows = useMemo<DeclRow[]>(() => {
    const start = new Date(date + 'T00:00:00').getTime()
    const end = new Date(date + 'T23:59:59.999').getTime()
    const out: DeclRow[] = []
    for (const q of quotes) {
      for (const entry of q.declared ?? []) {
        if (entry.at >= start && entry.at <= end) out.push({ quote: q, entry })
      }
    }
    return out.sort((a, b) => a.entry.at - b.entry.at)
  }, [quotes, date])
  const pendingByCommercial = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of declRows) if (!r.entry.verified) m.set(r.quote.ownerName || r.quote.ownerEmail, (m.get(r.quote.ownerName || r.quote.ownerEmail) ?? 0) + r.entry.amount)
    return [...m.entries()]
  }, [declRows])

  const verify = async (row: DeclRow) => {
    if (!(await ask(`Confirmer avoir recu ${dt(row.entry.amount)} de ${row.quote.ownerName || row.quote.ownerEmail} pour ${row.quote.client || 'ce client'} ?`, { confirmLabel: 'Verifier', danger: false }))) return
    setBusy(row.entry.id)
    try {
      const payment: Payment = { id: crypto.randomUUID(), amount: row.entry.amount, at: Date.now(), method: 'especes', note: row.entry.note ? `Verifie (commercial) — ${row.entry.note}` : 'Verifie (commercial)' }
      const nextPayments = [...(row.quote.payments ?? []), payment]
      const nextPaid = Math.round(nextPayments.reduce((s, p) => s + p.amount, 0) * 1000) / 1000
      const nextDeclared = (row.quote.declared ?? []).map(d => (d.id === row.entry.id ? { ...d, verified: true, verifiedAt: Date.now(), paymentId: payment.id } : d))
      await updateQuote(row.quote.id, { payments: nextPayments, paid: nextPaid, declared: nextDeclared })
      onVerified?.()
    } finally { setBusy('') }
  }

  return (
    <Modal title="Rapport du jour" onClose={onClose} wide printable>
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
                    <th className="p-3">Commercial</th>
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
                        <td className="p-3 text-slate-600">{r.quote.ownerName || r.quote.ownerEmail}</td>
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
                    <td className="p-3 font-bold text-navy" colSpan={5}>{rows.length} reglement{rows.length > 1 ? 's' : ''} — {clientCount} client{clientCount > 1 ? 's' : ''}</td>
                    <td className="p-3 text-right text-base font-extrabold text-teal-dark">{dt(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {declRows.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-navy">Encaissements declares par les commerciaux (a rapprocher de l&apos;argent rapporte)</h3>
              </div>
              {pendingByCommercial.length > 0 && (
                <div className="no-print mb-3 flex flex-wrap gap-2">
                  {pendingByCommercial.map(([name, amt]) => (
                    <div key={name} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{name} doit rapporter {dt(amt)}</div>
                  ))}
                </div>
              )}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr><th className="p-3">Commercial</th><th className="p-3">Client</th><th className="p-3">Document</th><th className="p-3">Note</th><th className="p-3 text-right">Montant</th><th className="no-print p-3" /></tr>
                  </thead>
                  <tbody>
                    {declRows.map((r, i) => {
                      const type = r.quote.docType ?? 'devis'
                      const number = type === 'devis' || !r.quote.docNumber ? r.quote.number : r.quote.docNumber
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="p-3 font-semibold text-slate-700">{r.quote.ownerName || r.quote.ownerEmail}</td>
                          <td className="p-3 font-bold text-navy">{r.quote.client || '—'}</td>
                          <td className="p-3 text-slate-600">{DOC_TYPE_LABEL[type]} <span className="text-slate-400">{number}</span></td>
                          <td className="p-3 text-slate-400">{r.entry.note || '—'}</td>
                          <td className="p-3 text-right font-bold text-navy">{dt(r.entry.amount)}</td>
                          <td className="no-print p-3 text-right">
                            {r.entry.verified
                              ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700"><CheckCheck size={12} /> Verifie</span>
                              : <button onClick={() => verify(r)} disabled={busy === r.entry.id}
                                  className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"><Banknote size={13} /> Verifier</button>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="no-print flex justify-end"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Fermer</button></div>
      </div>
    </Modal>
  )
}
