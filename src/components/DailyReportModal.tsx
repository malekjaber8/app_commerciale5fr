import { useMemo, useState } from 'react'
import { Banknote, Check, CheckCheck, Printer, X } from 'lucide-react'
import { DOC_TYPE_LABEL, PAYMENT_METHOD_LABEL, updateQuote, type DeclaredCollection, type Payment, type QuoteDoc } from '../lib/quotes'
import type { CreditDoc } from '../lib/credits'
import { dt } from '../lib/format'
import { Modal } from './ui'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Row { client: string; ownerName: string; docLabel: string; docNumber: string; amount: number; method: string; note: string; at: number }
interface DeclRow { quote: QuoteDoc; entry: DeclaredCollection }

/** Rapport du jour : encaissements du jour choisi (devis et credits), par client, avec le total encaisse. Reserve a l'admin. */
export function DailyReportModal({ quotes, credits, onClose, onVerified }: { quotes: QuoteDoc[]; credits: CreditDoc[]; onClose: () => void; onVerified?: () => void }) {
  const [date, setDate] = useState(todayStr)
  const [busy, setBusy] = useState('')
  // Verification d'une declaration : l'admin peut confirmer un montant different de celui declare (reglement partiel)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verifyAmount, setVerifyAmount] = useState('')

  const rows = useMemo<Row[]>(() => {
    const start = new Date(date + 'T00:00:00').getTime()
    const end = new Date(date + 'T23:59:59.999').getTime()
    const out: Row[] = []
    for (const q of quotes) {
      for (const p of q.payments ?? []) {
        if (p.at >= start && p.at <= end) {
          const type = q.docType ?? 'devis'
          const number = type === 'devis' || !q.docNumber ? q.number : q.docNumber
          out.push({ client: q.client || '—', ownerName: q.ownerName || q.ownerEmail, docLabel: DOC_TYPE_LABEL[type], docNumber: number, amount: p.amount, method: PAYMENT_METHOD_LABEL[p.method], note: p.note, at: p.at })
        }
      }
    }
    for (const c of credits) {
      for (const p of c.payments ?? []) {
        if (p.at >= start && p.at <= end) {
          out.push({ client: c.client, ownerName: c.ownerName, docLabel: 'Credit', docNumber: c.ref || '—', amount: p.amount, method: PAYMENT_METHOD_LABEL[p.method], note: p.note, at: p.at })
        }
      }
    }
    return out.sort((a, b) => a.at - b.at)
  }, [quotes, credits, date])

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const clientCount = new Set(rows.map(r => r.client)).size
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

  const startVerify = (row: DeclRow) => { setVerifying(row.entry.id); setVerifyAmount(String(row.entry.amount)) }
  const cancelVerify = () => { setVerifying(null); setVerifyAmount('') }

  const verify = async (row: DeclRow) => {
    const value = parseFloat(verifyAmount.replace(',', '.'))
    if (!(value > 0)) return
    setBusy(row.entry.id)
    try {
      const partial = Math.round(value * 1000) / 1000 < row.entry.amount
      const payment: Payment = {
        id: crypto.randomUUID(), amount: Math.round(value * 1000) / 1000, at: Date.now(), method: 'especes',
        note: [row.entry.note, partial ? `Verifie partiellement (declare ${dt(row.entry.amount)})` : 'Verifie (commercial)'].filter(Boolean).join(' — '),
      }
      const nextPayments = [...(row.quote.payments ?? []), payment]
      const nextPaid = Math.round(nextPayments.reduce((s, p) => s + p.amount, 0) * 1000) / 1000
      const nextDeclared = (row.quote.declared ?? []).map(d => (d.id === row.entry.id ? { ...d, verified: true, verifiedAt: Date.now(), verifiedAmount: payment.amount, paymentId: payment.id } : d))
      await updateQuote(row.quote.id, { payments: nextPayments, paid: nextPaid, declared: nextDeclared })
      cancelVerify()
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
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-3 font-bold text-navy">{r.client}</td>
                      <td className="p-3 text-slate-600">{r.ownerName}</td>
                      <td className="p-3 text-slate-600">{r.docLabel} <span className="text-slate-400">{r.docNumber}</span></td>
                      <td className="p-3 text-slate-600">{r.method}</td>
                      <td className="p-3 text-slate-400">{r.note || '—'}</td>
                      <td className="p-3 text-right font-bold text-navy">{dt(r.amount)}</td>
                    </tr>
                  ))}
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
                    <tr><th className="p-3">Commercial</th><th className="p-3">Client</th><th className="p-3">Document</th><th className="p-3">Note</th><th className="p-3 text-right">Declare</th><th className="no-print p-3">Verification</th></tr>
                  </thead>
                  <tbody>
                    {declRows.map((r, i) => {
                      const type = r.quote.docType ?? 'devis'
                      const number = type === 'devis' || !r.quote.docNumber ? r.quote.number : r.quote.docNumber
                      const isVerifying = verifying === r.entry.id
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="p-3 font-semibold text-slate-700">{r.quote.ownerName || r.quote.ownerEmail}</td>
                          <td className="p-3 font-bold text-navy">{r.quote.client || '—'}</td>
                          <td className="p-3 text-slate-600">{DOC_TYPE_LABEL[type]} <span className="text-slate-400">{number}</span></td>
                          <td className="p-3 text-slate-400">{r.entry.note || '—'}</td>
                          <td className="p-3 text-right font-bold text-navy">{dt(r.entry.amount)}</td>
                          <td className="no-print p-3 text-right">
                            {r.entry.verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">
                                <CheckCheck size={12} /> Verifie {r.entry.verifiedAmount != null && r.entry.verifiedAmount !== r.entry.amount ? `(${dt(r.entry.verifiedAmount)})` : ''}
                              </span>
                            ) : isVerifying ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-[11px] text-slate-500">Recu</span>
                                <input autoFocus value={verifyAmount} onChange={e => setVerifyAmount(e.target.value)} inputMode="decimal"
                                  className="w-20 rounded-lg border border-teal px-2 py-1 text-right text-xs font-bold outline-none" />
                                <button onClick={() => verify(r)} disabled={busy === r.entry.id} title="Confirmer"
                                  className="rounded-lg bg-navy p-1.5 text-white disabled:opacity-60"><Check size={14} /></button>
                                <button onClick={cancelVerify} title="Annuler" className="rounded-lg border border-slate-200 p-1.5 text-slate-500"><X size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => startVerify(r)}
                                className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"><Banknote size={13} /> Verifier</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="no-print mt-1.5 text-[11px] text-slate-400">« Verifier » laisse indiquer le montant reellement rapporte : s&apos;il est inferieur au montant declare, le reste reste du sur le devis.</p>
            </div>
          )}
        </div>

        <div className="no-print flex justify-end"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Fermer</button></div>
      </div>
    </Modal>
  )
}
