import { useState } from 'react'
import { Banknote, Trash2 } from 'lucide-react'
import { PAYMENT_METHOD_LABEL, quotePayment, updateQuote, type Payment, type PaymentMethod, type QuoteDoc } from '../lib/quotes'
import { dt } from '../lib/format'
import { Field, Modal, inputCls } from './ui'
import { useDialogs } from './Dialogs'

const today = () => new Date().toISOString().slice(0, 10)

/** Reglements d'un devis valide : l'admin enregistre les encaissements, le commercial voit « Paye » ou le reste a payer. */
export function PaymentModal({ quote, onClose, onDone }: { quote: QuoteDoc; onClose: () => void; onDone: () => void }) {
  const { ask } = useDialogs()
  const [payments, setPayments] = useState<Payment[]>(quote.payments ?? [])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('especes')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const view = quotePayment({ ...quote, payments })

  const persist = async (next: Payment[]) => {
    setBusy(true); setError('')
    try {
      const paid = Math.round(next.reduce((s, p) => s + p.amount, 0) * 1000) / 1000
      await updateQuote(quote.id, { payments: next, paid })
      setPayments(next)
      onDone()
      return true
    } catch {
      setError("Enregistrement impossible. Verifiez la connexion.")
      return false
    } finally { setBusy(false) }
  }

  const add = async (value: number) => {
    if (!(value > 0)) return setError('Saisissez un montant superieur a 0.')
    const p: Payment = { id: crypto.randomUUID(), amount: Math.round(value * 1000) / 1000, at: new Date(date + 'T12:00:00').getTime(), method, note: note.trim() }
    if (await persist([...payments, p])) { setAmount(''); setNote('') }
  }

  const remove = async (p: Payment) => {
    if (!(await ask(`Supprimer ce reglement de ${dt(p.amount)} ?`, { confirmLabel: 'Supprimer' }))) return
    await persist(payments.filter(x => x.id !== p.id))
  }

  const badge = view.state === 'paye' ? 'bg-green-100 text-green-700' : view.state === 'partiel' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  const label = view.state === 'paye' ? 'Paye' : view.state === 'partiel' ? `Partiel — reste ${dt(view.balance)}` : 'Non paye'

  return (
    <Modal title={`Reglement — ${quote.docNumber && quote.docType !== 'devis' ? quote.docNumber : quote.number}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">{quote.client || 'Sans client'}</div>
            <div className="text-xs text-slate-500">A regler : <b className="text-navy">{dt(view.due)}</b>{quote.docType === 'facture' && ' (timbre inclus)'} — Encaisse : <b className="text-navy">{dt(view.paid)}</b></div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{label}</span>
        </div>

        {payments.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0">
                <div className="w-20 shrink-0 text-xs text-slate-500">{new Date(p.at).toLocaleDateString('fr-FR')}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800">{PAYMENT_METHOD_LABEL[p.method]}</div>
                  {p.note && <div className="truncate text-xs text-slate-400">{p.note}</div>}
                </div>
                <div className="font-bold text-navy">{dt(p.amount)}</div>
                <button onClick={() => remove(p)} disabled={busy} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {view.balance > 0 ? (
          <div className="space-y-3 rounded-xl border-2 border-dashed border-teal/50 bg-teal/5 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Montant (DT)"><input className={inputCls} inputMode="decimal" value={amount} placeholder={String(view.balance)} onChange={e => setAmount(e.target.value)} /></Field>
              <Field label="Mode">
                <select className={inputCls} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                  {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                </select>
              </Field>
              <Field label="Date"><input type="date" className={inputCls} value={date} onChange={e => e.target.value && setDate(e.target.value)} /></Field>
            </div>
            <Field label="Note (n° de cheque, banque... optionnel)"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} /></Field>
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => add(view.balance)} disabled={busy} className="rounded-xl border border-teal px-4 py-2 text-sm font-bold text-teal-dark hover:bg-teal/10 disabled:opacity-60">Regler le solde ({dt(view.balance)})</button>
              <button onClick={() => add(parseFloat(amount.replace(',', '.')))} disabled={busy} className="flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60"><Banknote size={16} /> Enregistrer le reglement</button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-green-50 px-3 py-3 text-center text-sm font-semibold text-green-700">Ce document est entierement regle.</div>
        )}

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex justify-end"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Fermer</button></div>
      </div>
    </Modal>
  )
}
