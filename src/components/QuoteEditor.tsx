import { useState } from 'react'
import { linesSubtotal } from '../lib/db'
import { updateQuote, type QuoteDoc } from '../lib/quotes'
import { dt } from '../lib/format'
import { LinesEditor } from './LinesEditor'
import { Field, Modal, inputCls } from './ui'

/** Modification d'un devis par l'admin : client, lignes (prix, quantites), note, remise. */
export function QuoteEditor({ quote, onClose, onSaved }: { quote: QuoteDoc; onClose: () => void; onSaved: () => void }) {
  const [client, setClient] = useState(quote.client)
  const [phone, setPhone] = useState(quote.phone)
  const [note, setNote] = useState(quote.note)
  const [discountPct, setDiscountPct] = useState(quote.discountPct)
  const [lines, setLines] = useState(quote.lines.map(l => ({ ...l })))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const subtotal = linesSubtotal(lines)
  const pct = Math.min(100, Math.max(0, discountPct))
  const discount = subtotal * pct / 100

  const save = async () => {
    setBusy(true); setError('')
    try {
      await updateQuote(quote.id, {
        client: client.trim(), phone: phone.trim(), note: note.trim(), discountPct: pct,
        lines, subtotal, discount, total: subtotal - discount,
      })
      onSaved(); onClose()
    } catch {
      setError('Enregistrement impossible.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Modifier le devis ${quote.number}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client"><input className={inputCls} value={client} onChange={e => setClient(e.target.value)} /></Field>
          <Field label="Telephone"><input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        </div>
        <LinesEditor lines={lines} onChange={setLines} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Note"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} /></Field>
          <Field label="Remise (%)"><input type="number" min={0} max={100} className={inputCls} value={discountPct} onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)} /></Field>
        </div>
        <div className="text-right text-sm">
          <div className="text-slate-500">Sous-total : {dt(subtotal)}{discount > 0 && ` — remise ${pct}% : -${dt(discount)}`}</div>
          <div className="text-lg font-extrabold text-navy">Total : {dt(subtotal - discount)}</div>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
          <button onClick={save} disabled={busy} className="rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </div>
    </Modal>
  )
}
