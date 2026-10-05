import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { Save, Trash2 } from 'lucide-react'
import { db } from '../firebase'
import { createCredit, creditPayment, deleteCredit, updateCredit, type CreditDoc } from '../lib/credits'
import { useAuth } from '../store/auth'
import { dt } from '../lib/format'
import { useDialogs } from './Dialogs'
import { Field, Modal, inputCls } from './ui'

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/**
 * Ajout ou modification d'un credit par l'admin (montant du par un client, independant d'un devis de l'app).
 * `ownerUid` fixe : pas de choix de commercial (deja filtre, ex. depuis la fiche d'un commercial).
 */
export function CreditModal({ ownerUid, ownerName, existing, onClose, onDone }: {
  ownerUid?: string; ownerName?: string; existing?: CreditDoc; onClose: () => void; onDone: () => void
}) {
  const { profile, email } = useAuth()
  const { ask } = useDialogs()
  const [commercials, setCommercials] = useState<{ id: string; name: string }[]>([])
  const [assignTo, setAssignTo] = useState(existing?.ownerUid ?? ownerUid ?? '')
  const [client, setClient] = useState(existing?.client ?? '')
  const [docDate, setDocDate] = useState(existing?.docDate ?? todayStr())
  const [ref, setRef] = useState(existing?.ref ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const paidSoFar = existing ? creditPayment(existing).paid : 0

  useEffect(() => {
    if (ownerUid) return
    getDocs(query(collection(db, 'users'), where('role', '==', 'commercial'), where('active', '==', true)))
      .then(snap => setCommercials(snap.docs.map(d => ({ id: d.id, name: (d.data().name as string) || '' })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCommercials([]))
  }, [ownerUid])

  const submit = async () => {
    setError('')
    const name = client.trim()
    if (!name) return setError('Le nom du client est obligatoire.')
    if (!assignTo) return setError('Choisissez le commercial concerne.')
    const value = parseFloat(amount.replace(',', '.'))
    if (!(value > 0)) return setError('Saisissez un montant superieur a 0.')
    if (value < paidSoFar) return setError(`Le montant total ne peut pas etre inferieur a ce qui est deja regle (${dt(paidSoFar)}). Pour enregistrer un paiement, utilisez le bouton "Regler", pas ce champ.`)
    setBusy(true)
    try {
      const targetName = ownerName ?? commercials.find(c => c.id === assignTo)?.name ?? existing?.ownerName ?? ''
      if (existing) {
        await updateCredit(existing.id, { ownerUid: assignTo, ownerName: targetName, client: name, docDate, ref: ref.trim(), amount: Math.round(value * 1000) / 1000, note: note.trim() })
      } else {
        await createCredit({
          ownerUid: assignTo, ownerName: targetName, client: name, docDate, ref: ref.trim(),
          amount: Math.round(value * 1000) / 1000, note: note.trim(), createdByName: profile?.name || email || 'Admin',
        })
      }
      onDone()
    } catch {
      setError('Enregistrement impossible. Verifiez la connexion et les regles Firestore.')
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!existing) return
    if (!(await ask(`Supprimer definitivement ce credit de ${existing.client} (${existing.amount} DT) ?`, { confirmLabel: 'Supprimer' }))) return
    setBusy(true); setError('')
    try { await deleteCredit(existing.id); onDone() }
    catch { setError('Suppression impossible. Verifiez la connexion.'); setBusy(false) }
  }

  return (
    <Modal title={existing ? 'Modifier le credit' : 'Ajouter un credit'} onClose={onClose}>
      <div className="space-y-4">
        {!ownerUid && (
          <Field label="Commercial concerne *">
            <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className={inputCls}>
              <option value="">{commercials.length ? 'Choisir un commercial...' : 'Aucun commercial actif'}</option>
              {commercials.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Nom du client *"><input className={inputCls} value={client} onChange={e => setClient(e.target.value)} placeholder="Ex : Ghedira Ali" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date du BL / facture"><input type="date" className={inputCls} value={docDate} onChange={e => setDocDate(e.target.value)} /></Field>
          <Field label="N° BL / facture (optionnel)"><input className={inputCls} value={ref} onChange={e => setRef(e.target.value)} placeholder="BL-2026-0012" /></Field>
        </div>
        <Field label="Montant total du credit (DT) *">
          <input className={inputCls} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
        </Field>
        {paidSoFar > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Deja regle : <b>{dt(paidSoFar)}</b>. Ce champ est le <b>montant total</b> du du par le client, pas un reglement — pour enregistrer un paiement, fermez cette fenetre et utilisez le bouton « Regler ».
          </p>
        )}
        <Field label="Note (optionnel)"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Raison, accord particulier..." /></Field>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {existing && (
            <button onClick={remove} disabled={busy} className="mr-auto flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 size={15} /> Supprimer</button>
          )}
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
          <button onClick={submit} disabled={busy} className="flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60"><Save size={15} /> {busy ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </div>
    </Modal>
  )
}
