import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { KeyRound, Trash2, UserPlus } from 'lucide-react'
import { auth, createAccount, db } from '../../firebase'
import { authErrorMessage, type Profile } from '../../store/auth'

interface UserRow extends Profile { id: string }

export function UsersTab({ onOpen }: { onOpen: (u: { id: string; name: string; email: string }) => void }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const snap = await getDocs(collection(db, 'users'))
    setUsers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Profile) })))
    setLoading(false)
  }, [])

  useEffect(() => { load().catch(() => setLoading(false)) }, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      const uid = await createAccount(email.trim(), password)
      await setDoc(doc(db, 'users', uid), {
        role: 'commercial', name: name.trim(), email: email.trim().toLowerCase(), active: true, createdAt: serverTimestamp(),
      })
      setMsg({ ok: true, text: `Compte cree pour ${email.trim()}. Communiquez-lui son mot de passe.` })
      setName(''); setEmail(''); setPassword('')
      await load()
    } catch (err) {
      setMsg({ ok: false, text: authErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (u: UserRow) => {
    await updateDoc(doc(db, 'users', u.id), { active: !u.active })
    await load()
  }

  const remove = async (u: UserRow) => {
    if (!confirm(`Supprimer l'acces de ${u.name || u.email} ? (le compte de connexion reste visible dans la console Firebase)`)) return
    await deleteDoc(doc(db, 'users', u.id))
    await load()
  }

  const reset = async (u: UserRow) => {
    try {
      await sendPasswordResetEmail(auth, u.email)
      setMsg({ ok: true, text: `E-mail de reinitialisation envoye a ${u.email}.` })
    } catch (err) {
      setMsg({ ok: false, text: authErrorMessage(err) })
    }
  }

  const input = 'rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal'

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy"><UserPlus size={16} /> Nouveau commercial</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" className={input} />
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Adresse e-mail" className={input} />
          <input required minLength={6} type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (6 car. min.)" className={input} />
        </div>
        <button disabled={busy} className="mt-3 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {busy ? 'Creation...' : 'Creer le compte'}
        </button>
      </form>

      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Nom</th><th className="p-3">E-mail</th><th className="p-3">Statut</th><th /></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="p-6 text-center text-slate-400">Chargement...</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">Aucun commercial pour le moment.</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${u.active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {u.active ? 'Actif' : 'Suspendu'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onOpen({ id: u.id, name: u.name, email: u.email })} className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">Voir l'activite</button>
                    <button onClick={() => toggle(u)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                      {u.active ? 'Suspendre' : 'Reactiver'}
                    </button>
                    <button onClick={() => reset(u)} title="Reinitialiser le mot de passe" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><KeyRound size={15} /></button>
                    <button onClick={() => remove(u)} title="Supprimer l'acces" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
