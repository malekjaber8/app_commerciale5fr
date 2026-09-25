import { useState } from 'react'
import { ORDER_STATUS_LABEL, type OrderDoc, type OrderStatus } from '../types'
import { linesSubtotal, updateOrder } from '../lib/db'
import { dt } from '../lib/format'
import { LinesEditor } from './LinesEditor'
import { Field, Modal, inputCls } from './ui'

export function OrderEditor({ order, onClose, onSaved }: { order: OrderDoc; onClose: () => void; onSaved: () => void }) {
  const [clientName, setClientName] = useState(order.clientName)
  const [phone, setPhone] = useState(order.phone)
  const [note, setNote] = useState(order.note)
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [discountPct, setDiscountPct] = useState(order.discountPct)
  const [lines, setLines] = useState(order.lines)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const subtotal = linesSubtotal(lines)
  const pct = Math.min(100, Math.max(0, discountPct))
  const discount = subtotal * pct / 100

  const save = async () => {
    setBusy(true); setError('')
    try {
      await updateOrder(order.id, {
        clientName: clientName.trim(), phone: phone.trim(), note: note.trim(), status,
        discountPct: pct, lines, subtotal, discount, total: subtotal - discount,
      })
      onSaved(); onClose()
    } catch {
      setError('Enregistrement impossible.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Commande ${order.number}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Client"><input className={inputCls} value={clientName} onChange={e => setClientName(e.target.value)} /></Field>
          <Field label="Telephone"><input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
          <Field label="Statut">
            <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>
              {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map(s => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
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
