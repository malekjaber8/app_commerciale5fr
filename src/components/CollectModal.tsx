import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { quotePayment, updateQuote, type DeclaredCollection, type QuoteDoc } from '../lib/quotes'
import { dt } from '../lib/format'
import { Field, Modal, inputCls } from './ui'

/**
 * Declaration par le commercial d'un argent pris a la livraison (bon de livraison).
 * N'enregistre pas de reglement officiel : l'admin verifie ensuite avec l'argent rapporte, ce qui cree le vrai encaissement.
 */
export function CollectModal({ quote, onClose, onDone }: { quote: QuoteDoc; onClose: () => void; onDone: () => void }) {
  const pay = quotePayment(quote)
  const [amount, setAmount] = useState(String(pay.balance))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const value = parseFloat(amount.replace(',', '.'))
    if (!(value > 0)) return setError('Saisissez un montant superieur a 0.')
    setBusy(true); setError('')
    const entry: DeclaredCollection = { id: crypto.randomUUID(), amount: Math.round(value * 1000) / 1000, at: Date.now(), note: note.trim(), verified: false }
    try {
      await updateQuote(quote.id, { declared: [...(quote.declared ?? []), entry] })
      onDone()
    } catch {
      setError("Enregistrement impossible. Verifiez la connexion.")
      setBusy(false)
    }
  }

  return (
    <Modal title="Argent recu a la livraison" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="truncate text-sm font-semibold text-slate-800">{quote.client || 'Sans client'}</div>
          <div className="text-xs text-slate-500">{quote.docType && quote.docNumber ? quote.docNumber : quote.number} — Reste a payer : <b className="text-navy">{dt(pay.balance)}</b></div>
        </div>
        <Field label="Montant recu (DT)"><input className={inputCls} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
        <Field label="Note (optionnel)"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Espece, cheque remis..." /></Field>
        <p className="rounded-lg bg-teal/10 px-3 py-2 text-xs text-slate-600">Cette declaration reste « en attente » jusqu&apos;a ce que l&apos;administrateur la verifie avec l&apos;argent que vous rapportez.</p>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
          <button onClick={submit} disabled={busy} className="flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60"><Banknote size={16} /> {busy ? 'Enregistrement...' : 'Confirmer'}</button>
        </div>
      </div>
    </Modal>
  )
}
