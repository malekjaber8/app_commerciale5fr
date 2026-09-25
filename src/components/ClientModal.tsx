import { useState, type FormEvent } from 'react'
import type { Client } from '../types'
import type { ClientInput } from '../lib/db'
import { Field, Modal, inputCls } from './ui'

interface Props {
  initial?: Client
  ownerUid: string
  ownerName: string
  onSave: (data: ClientInput) => Promise<void>
  onClose: () => void
}

export function ClientModal({ initial, ownerUid, ownerName, onSave, onClose }: Props) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    taxId: initial?.taxId ?? '',
    note: initial?.note ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await onSave({
        ...f, name: f.name.trim(), phone: f.phone.trim(),
        ownerUid: initial?.ownerUid ?? ownerUid,
        ownerName: initial?.ownerName ?? ownerName,
      })
      onClose()
    } catch {
      setError('Enregistrement impossible. Verifiez votre connexion et vos droits.')
      setBusy(false)
    }
  }

  return (
    <Modal title={initial ? 'Modifier le client' : 'Nouveau client'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom / societe *"><input required className={inputCls} value={f.name} onChange={set('name')} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telephone"><input className={inputCls} value={f.phone} onChange={set('phone')} /></Field>
          <Field label="E-mail"><input type="email" className={inputCls} value={f.email} onChange={set('email')} /></Field>
        </div>
        <Field label="Adresse"><input className={inputCls} value={f.address} onChange={set('address')} /></Field>
        <Field label="Matricule fiscale"><input className={inputCls} value={f.taxId} onChange={set('taxId')} /></Field>
        <Field label="Note"><input className={inputCls} value={f.note} onChange={set('note')} /></Field>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
          <button disabled={busy} className="rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  )
}
