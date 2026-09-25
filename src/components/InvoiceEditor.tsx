import { useState } from 'react'
import type { DocLine, InvoiceDoc } from '../types'
import { computeInvoiceTotals, createInvoice, updateInvoice, type InvoiceInput } from '../lib/db'
import { dt } from '../lib/format'
import { LinesEditor } from './LinesEditor'
import { Field, Modal, inputCls } from './ui'

export type InvoiceSeed = Omit<InvoiceInput, 'totalHT' | 'tva' | 'timbre' | 'totalTTC' | 'discount'> & { discount: number }

interface Props {
  existing?: InvoiceDoc
  seed?: InvoiceSeed
  onClose: () => void
  onSaved: () => void
}

export function InvoiceEditor({ existing, seed, onClose, onSaved }: Props) {
  const base = (existing ?? seed)!
  const [clientName, setClientName] = useState(base.clientName)
  const [taxId, setTaxId] = useState(base.taxId)
  const [address, setAddress] = useState(base.address)
  const [phone, setPhone] = useState(base.phone)
  const [note, setNote] = useState(base.note)
  const [discount, setDiscount] = useState(base.discount)
  const [lines, setLines] = useState<DocLine[]>(base.lines)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const t = computeInvoiceTotals(lines, discount)

  const save = async () => {
    setBusy(true); setError('')
    const data: InvoiceInput = {
      orderId: base.orderId, clientId: base.clientId, clientName: clientName.trim(), taxId: taxId.trim(),
      address: address.trim(), phone: phone.trim(), ownerUid: base.ownerUid, ownerName: base.ownerName,
      lines, note: note.trim(), discount: t.discount, timbre: t.timbre, totalHT: t.totalHT, tva: t.tva, totalTTC: t.totalTTC,
    }
    try {
      if (existing) await updateInvoice(existing.id, data)
      else await createInvoice(data)
      onSaved(); onClose()
    } catch {
      setError('Enregistrement impossible.')
      setBusy(false)
    }
  }

  return (
    <Modal title={existing ? `Facture ${existing.number}` : 'Nouvelle facture'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client / societe"><input className={inputCls} value={clientName} onChange={e => setClientName(e.target.value)} /></Field>
          <Field label="Matricule fiscale"><input className={inputCls} value={taxId} onChange={e => setTaxId(e.target.value)} /></Field>
          <Field label="Adresse"><input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} /></Field>
          <Field label="Telephone"><input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        </div>
        <LinesEditor lines={lines} onChange={setLines} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Note"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} /></Field>
          <Field label="Remise (montant TTC, DT)">
            <input className={inputCls} defaultValue={discount} onBlur={e => setDiscount(parseFloat(e.target.value.replace(',', '.')) || 0)} />
          </Field>
        </div>
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Total HT</span><span>{dt(t.totalHT)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">TVA 19%</span><span>{dt(t.tva)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Timbre fiscal</span><span>{dt(t.timbre)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-extrabold text-navy"><span>Total TTC</span><span>{dt(t.totalTTC)}</span></div>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
          <button onClick={save} disabled={busy} className="rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Enregistrement...' : 'Enregistrer la facture'}</button>
        </div>
      </div>
    </Modal>
  )
}
