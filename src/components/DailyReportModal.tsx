import { useMemo, useState } from 'react'
import { Banknote, Check, CheckCheck, Printer, X } from 'lucide-react'
import { DOC_TYPE_LABEL, PAYMENT_METHOD_LABEL, quotePayment, updateQuote, type DeclaredCollection, type Payment, type QuoteDoc } from '../lib/quotes'
import { creditPayment, type CreditDoc } from '../lib/credits'
import { dt } from '../lib/format'
import { Modal } from './ui'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Source = 'admin' | 'commercial' | 'credit'
interface Row { client: string; ownerName: string; docLabel: string; docNumber: string; amount: number; method: string; note: string; at: number; source: Source; balance: number }
interface DeclRow { quote: QuoteDoc; entry: DeclaredCollection }

// Avant l'ajout du champ `source`, l'origine se devinait via la note laissee par verify() : on continue
// a la reconnaitre ainsi pour les paiements plus anciens, qui n'ont pas ce champ enregistre.
const guessSource = (p: Payment): Source => p.source ?? (/Verifie \(commercial\)|Verifie partiellement/.test(p.note) ? 'commercial' : 'admin')

const SOURCE_STYLE: Record<Source, { row: string; bar: string; dot: string; label: string }> = {
  admin: { row: 'bg-sky-50/60', bar: 'border-l-4 border-sky-400', dot: 'bg-sky-400', label: 'Regle par l’admin' },
  commercial: { row: 'bg-amber-50/60', bar: 'border-l-4 border-amber-400', dot: 'bg-amber-400', label: 'Rapporte par le commercial' },
  credit: { row: 'bg-violet-50/60', bar: 'border-l-4 border-violet-400', dot: 'bg-violet-400', label: 'Credit ajoute manuellement' },
}

/** Contenu du rapport (date + tableaux), reutilise dans la modale et dans l'onglet Rapport en page entiere. */
export function DailyReportContent({ quotes, credits, onVerified, onClose }: { quotes: QuoteDoc[]; credits: CreditDoc[]; onVerified?: () => void; onClose?: () => void }) {
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
          out.push({ client: q.client || '—', ownerName: q.ownerName || q.ownerEmail, docLabel: DOC_TYPE_LABEL[type], docNumber: number, amount: p.amount, method: PAYMENT_METHOD_LABEL[p.method], note: p.note, at: p.at, source: guessSource(p), balance: quotePayment(q).balance })
        }
      }
    }
    for (const c of credits) {
      for (const p of c.payments ?? []) {
        if (p.at >= start && p.at <= end) {
          out.push({ client: c.client, ownerName: c.ownerName, docLabel: 'Credit', docNumber: c.ref || '—', amount: p.amount, method: PAYMENT_METHOD_LABEL[p.method], note: p.note, at: p.at, source: 'credit', balance: creditPayment(c).balance })
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
    for (const r of declRows) {
      if (r.entry.verified) continue
      const balance = quotePayment(r.quote).balance
      if (balance <= 0) continue // deja regle par ailleurs : rien a rapporter pour cette declaration
      const name = r.quote.ownerName || r.quote.ownerEmail
      m.set(name, (m.get(name) ?? 0) + Math.min(r.entry.amount, balance))
    }
    return [...m.entries()]
  }, [declRows])

  const startVerify = (row: DeclRow) => {
    const balance = quotePayment(row.quote).balance
    setVerifying(row.entry.id)
    setVerifyAmount(String(balance > 0 ? Math.min(row.entry.amount, balance) : row.entry.amount))
  }
  const cancelVerify = () => { setVerifying(null); setVerifyAmount('') }

  const verify = async (row: DeclRow) => {
    const value = parseFloat(verifyAmount.replace(',', '.'))
    if (!(value > 0)) return
    setBusy(row.entry.id)
    try {
      const partial = Math.round(value * 1000) / 1000 < row.entry.amount
      const payment: Payment = {
        id: crypto.randomUUID(), amount: Math.round(value * 1000) / 1000, at: Date.now(), method: 'especes', source: 'commercial',
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

  // Le devis est deja entierement regle par un autre reglement (ex : bouton Reglement manuel) : la declaration
  // n'a plus de montant a encaisser. On la cloture sans creer de nouveau paiement, pour eviter un doublon.
  const reconcile = async (row: DeclRow) => {
    setBusy(row.entry.id)
    try {
      const nextDeclared = (row.quote.declared ?? []).map(d => (d.id === row.entry.id ? { ...d, verified: true, verifiedAt: Date.now(), verifiedAmount: 0 } : d))
      await updateQuote(row.quote.id, { declared: nextDeclared })
      onVerified?.()
    } finally { setBusy('') }
  }

  return (
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                {(Object.keys(SOURCE_STYLE) as Source[]).map(s => (
                  <span key={s} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${SOURCE_STYLE[s].dot}`} />{SOURCE_STYLE[s].label}</span>
                ))}
              </div>
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
                    <tr key={i} className={`border-t border-slate-100 ${SOURCE_STYLE[r.source].row}`}>
                      <td className={`p-3 font-bold text-navy ${SOURCE_STYLE[r.source].bar}`}>{r.client}</td>
                      <td className="p-3 text-slate-600">{r.ownerName}</td>
                      <td className="p-3 text-slate-600">{r.docLabel} <span className="text-slate-400">{r.docNumber}</span></td>
                      <td className="p-3 text-slate-600">{r.method}</td>
                      <td className="p-3 text-slate-400">{r.note || '—'}</td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-navy">{dt(r.amount)}</div>
                        {r.balance > 0 && <div className="text-[10px] font-bold text-red-600">Reste : {dt(r.balance)}</div>}
                      </td>
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
                      const balance = quotePayment(r.quote).balance
                      const alreadySettled = !r.entry.verified && balance <= 0
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="p-3 font-semibold text-slate-700">{r.quote.ownerName || r.quote.ownerEmail}</td>
                          <td className="p-3 font-bold text-navy">{r.quote.client || '—'}</td>
                          <td className="p-3 text-slate-600">{DOC_TYPE_LABEL[type]} <span className="text-slate-400">{number}</span></td>
                          <td className="p-3 text-slate-400">{r.entry.note || '—'}</td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-navy">{dt(r.entry.amount)}</div>
                            {!r.entry.verified && <div className={`text-[10px] font-semibold ${alreadySettled ? 'text-green-600' : 'text-slate-400'}`}>Reste sur le devis : {dt(balance)}</div>}
                          </td>
                          <td className="no-print p-3 text-right">
                            {r.entry.verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">
                                <CheckCheck size={12} /> Verifie {r.entry.verifiedAmount != null && r.entry.verifiedAmount > 0 && r.entry.verifiedAmount !== r.entry.amount ? `(${dt(r.entry.verifiedAmount)})` : r.entry.verifiedAmount === 0 ? '(deja regle)' : ''}
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
                            ) : alreadySettled ? (
                              <button onClick={() => reconcile(r)} disabled={busy === r.entry.id} title="Le devis est deja entierement regle : ne cree pas de nouveau paiement"
                                className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 disabled:opacity-60"><CheckCheck size={13} /> Deja regle</button>
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

        {onClose && (
          <div className="no-print flex justify-end"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Fermer</button></div>
        )}
    </div>
  )
}

/** Rapport du jour en modale (ouvert depuis la liste des devis). */
export function DailyReportModal({ quotes, credits, onClose, onVerified }: { quotes: QuoteDoc[]; credits: CreditDoc[]; onClose: () => void; onVerified?: () => void }) {
  return (
    <Modal title="Rapport du jour" onClose={onClose} wide printable>
      <DailyReportContent quotes={quotes} credits={credits} onVerified={onVerified} onClose={onClose} />
    </Modal>
  )
}
