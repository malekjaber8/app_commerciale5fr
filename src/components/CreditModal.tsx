import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { Plus, Save, Search, Trash2 } from 'lucide-react'
import { db } from '../firebase'
import { createCredit, creditPayment, deleteCredit, updateCredit, type CreditDoc } from '../lib/credits'
import { useAuth } from '../store/auth'
import { dt } from '../lib/format'
import { useDialogs } from './Dialogs'
import { ClientPickerModal } from './ClientPickerModal'
import { Field, Modal, inputCls } from './ui'

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// parseFloat s'arrete au premier caractere non numerique : un espace (separateur de milliers, ex. "11 681.266")
// tronquerait sinon le montant a "11". On l'enleve avant de parser.
const parseAmt = (s: string) => parseFloat(s.replace(/\s/g, '').replace(',', '.'))

let lineSeq = 0
interface CreditLine { key: number; docDate: string; ref: string; amount: string }
const newLine = (): CreditLine => ({ key: ++lineSeq, docDate: todayStr(), ref: '', amount: '' })

/**
 * Ajout ou modification d'un credit par l'admin (montant du par un client, independant d'un devis de l'app).
 * `ownerUid` fixe : pas de choix de commercial (deja filtre, ex. depuis la fiche d'un commercial).
 * A la creation, plusieurs BL/factures peuvent etre saisis pour le meme client en une seule fois : chacun devient
 * son propre credit (pour garder son solde et sa date modifiables independamment), le total est juste indicatif.
 */
export function CreditModal({ ownerUid, ownerName, existing, initialClient, onClose, onDone }: {
  ownerUid?: string; ownerName?: string; existing?: CreditDoc; initialClient?: string; onClose: () => void; onDone: () => void
}) {
  const { uid, profile, email } = useAuth()
  const { ask } = useDialogs()
  const [commercials, setCommercials] = useState<{ id: string; name: string }[]>([])
  const [assignTo, setAssignTo] = useState(existing?.ownerUid ?? ownerUid ?? '')
  const [client, setClient] = useState(existing?.client ?? initialClient ?? '')
  const [picking, setPicking] = useState(false)
  // Edition : un seul credit (champs a plat). Creation : une ou plusieurs lignes BL, chacune son propre credit.
  const [docDate, setDocDate] = useState(existing?.docDate ?? todayStr())
  const [ref, setRef] = useState(existing?.ref ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [lines, setLines] = useState<CreditLine[]>(() => [newLine()])
  const [note, setNote] = useState(existing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const paidSoFar = existing ? creditPayment(existing).paid : 0
  const linesTotal = Math.round(lines.reduce((s, l) => s + (parseAmt(l.amount) || 0), 0) * 1000) / 1000

  useEffect(() => {
    if (ownerUid) return
    getDocs(query(collection(db, 'users'), where('role', '==', 'commercial'), where('active', '==', true)))
      .then(snap => setCommercials(snap.docs.map(d => ({ id: d.id, name: (d.data().name as string) || '' })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCommercials([]))
  }, [ownerUid])

  const updateLine = (key: number, patch: Partial<CreditLine>) => setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l))
  const addLine = () => setLines(prev => [...prev, newLine()])
  const removeLine = (key: number) => setLines(prev => prev.length > 1 ? prev.filter(l => l.key !== key) : prev)

  const submit = async () => {
    setError('')
    const name = client.trim()
    if (!name) return setError('Le nom du client est obligatoire.')
    if (!assignTo) return setError('Choisissez le commercial concerne.')
    setBusy(true)
    try {
      const targetName = ownerName ?? commercials.find(c => c.id === assignTo)?.name ?? existing?.ownerName ?? ''
      if (existing) {
        const value = parseAmt(amount)
        if (!(value > 0)) { setError('Saisissez un montant superieur a 0.'); setBusy(false); return }
        if (value < paidSoFar) { setError(`Le montant total ne peut pas etre inferieur a ce qui est deja regle (${dt(paidSoFar)}). Pour enregistrer un paiement, utilisez le bouton "Regler", pas ce champ.`); setBusy(false); return }
        await updateCredit(existing.id, { ownerUid: assignTo, ownerName: targetName, client: name, docDate, ref: ref.trim(), amount: Math.round(value * 1000) / 1000, note: note.trim() })
      } else {
        const valid = lines.map(l => ({ ...l, value: Math.round((parseAmt(l.amount) || 0) * 1000) / 1000 })).filter(l => l.value > 0)
        if (valid.length === 0) { setError('Saisissez au moins un montant superieur a 0.'); setBusy(false); return }
        await Promise.all(valid.map(l => createCredit({
          ownerUid: assignTo, ownerName: targetName, client: name, docDate: l.docDate, ref: l.ref.trim(),
          amount: l.value, note: note.trim(), createdByName: profile?.name || email || 'Admin',
        })))
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
        <Field label="Nom du client *">
          <div className="flex gap-2">
            <input className={inputCls} value={client} onChange={e => setClient(e.target.value)} placeholder="Ex : Ghedira Ali" />
            <button type="button" onClick={() => setPicking(true)} title="Choisir un client existant"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Search size={14} /> Choisir</button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Choisissez le client dans la liste pour garder exactement le meme nom que ses BL/factures — sinon ses credits n&apos;apparaitront pas regroupes avec eux dans le rapport.</p>
        </Field>

        {existing ? (
          <>
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
          </>
        ) : (
          <Field label="BL / factures non soldes de ce client *">
            <div className="space-y-2">
              {lines.map(l => (
                <div key={l.key} className="flex items-end gap-2 rounded-xl border border-slate-200 p-2.5">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date</label>
                    <input type="date" className={inputCls} value={l.docDate} onChange={e => updateLine(l.key, { docDate: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">N° BL / facture</label>
                    <input className={inputCls} value={l.ref} onChange={e => updateLine(l.key, { ref: e.target.value })} placeholder="BL-2026-0012" />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Montant (DT)</label>
                    <input className={inputCls} inputMode="decimal" value={l.amount} onChange={e => updateLine(l.key, { amount: e.target.value })} />
                  </div>
                  <button type="button" onClick={() => removeLine(l.key)} disabled={lines.length === 1} title="Retirer cette ligne"
                    className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="flex items-center gap-1.5 rounded-xl border border-dashed border-teal px-3 py-2 text-xs font-bold text-teal-dark hover:bg-teal/10">
                <Plus size={14} /> Ajouter un autre BL / facture
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-500">Total ({lines.filter(l => parseAmt(l.amount) > 0).length} ligne{lines.filter(l => parseAmt(l.amount) > 0).length > 1 ? 's' : ''})</span>
              <span className="text-base font-extrabold text-navy">{dt(linesTotal)}</span>
            </div>
          </Field>
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

      {picking && (
        <ClientPickerModal uid={uid ?? ''} ownerName={profile?.name || ''} searchAll onClose={() => setPicking(false)}
          onPick={c => { setClient(c.name); setPicking(false) }} />
      )}
    </Modal>
  )
}
