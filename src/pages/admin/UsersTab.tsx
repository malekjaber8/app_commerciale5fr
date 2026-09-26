import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { KeyRound, Trash2, UserPlus } from 'lucide-react'
import { auth, createAccount, db } from '../../firebase'
import { authErrorMessage, useAuth, type Profile, type Role } from '../../store/auth'
import { useDialogs } from '../../components/Dialogs'
import { USERNAME_DOMAIN, cleanUsername, emailToLogin, isValidUsername, usernameToEmail } from '../../config'

interface UserRow extends Profile { id: string }

export function UsersTab({ onOpen }: { onOpen: (u: { id: string; name: string; email: string }) => void }) {
  const { isOwner } = useAuth()
  const { ask } = useDialogs()
  const [role, setRole] = useState<Role>('commercial')
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
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
      if (!isValidUsername(username)) {
        setMsg({ ok: false, text: "Nom d'utilisateur : 3 a 30 caracteres, lettres minuscules, chiffres, point, tiret ou underscore (sans espace)." })
        return
      }
      const login = cleanUsername(username)
      const mail = usernameToEmail(login)
      const uid = await createAccount(mail, password)
      await setDoc(doc(db, 'users', uid), {
        role: isOwner ? role : 'commercial', name: name.trim(), username: login, email: mail, active: true, createdAt: serverTimestamp(),
      })
      setMsg({ ok: true, text: `Compte ${isOwner && role === 'admin' ? 'administrateur ' : ''}cree. Nom d'utilisateur : ${login} — communiquez-lui son mot de passe.` })
      setName(''); setUsername(''); setPassword('')
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
    if (!(await ask(`Supprimer l'acces de ${u.name || u.email} ? (le compte de connexion reste visible dans la console Firebase)`, { confirmLabel: 'Supprimer' }))) return
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
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy"><UserPlus size={16} /> Nouveau compte</h3>
        {isOwner && (
          <div className="mb-3 flex gap-2">
            {(['commercial', 'admin'] as Role[]).map(r => (
              <button type="button" key={r} onClick={() => setRole(r)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-bold ${role === r ? 'border-teal bg-teal/10 text-navy' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                {r === 'commercial' ? 'Commercial' : 'Administrateur'}
              </button>
            ))}
            {role === 'admin' && <span className="self-center text-xs text-slate-500">Acces complet : tout ce que vous pouvez faire, sauf gerer les autres administrateurs.</span>}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" className={input} />
          <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="Nom d'utilisateur (ex: houssem)" autoCapitalize="none" className={input} />
          <input required minLength={6} type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (6 car. min.)" className={input} />
        </div>
        <button disabled={busy} className="mt-3 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {busy ? 'Creation...' : role === 'admin' && isOwner ? "Creer l'administrateur" : 'Creer le compte'}
        </button>
      </form>

      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Nom</th><th className="p-3">Nom d'utilisateur</th><th className="p-3">Role</th><th className="p-3">Statut</th><th /></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-6 text-center text-slate-400">Chargement...</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400">Aucun compte pour le moment.</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-slate-600">{emailToLogin(u.email)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${u.role === 'admin' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}>{u.role === 'admin' ? 'Admin' : 'Commercial'}</span>
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${u.active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {u.active ? 'Actif' : 'Suspendu'}
                  </span>
                </td>
                <td className="p-3">
                  {u.role === 'admin' && !isOwner ? <div className="text-right text-xs text-slate-400">Reserve au proprietaire</div> : (
                  <div className="flex justify-end gap-1">
                    {u.role !== 'admin' && <button onClick={() => onOpen({ id: u.id, name: u.name, email: u.email })} className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">Voir l'activite</button>}
                    <button onClick={() => toggle(u)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                      {u.active ? 'Suspendre' : 'Reactiver'}
                    </button>
                    {!u.email.endsWith(USERNAME_DOMAIN) && (
                      <button onClick={() => reset(u)} title="Reinitialiser le mot de passe" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><KeyRound size={15} /></button>
                    )}
                    <button onClick={() => remove(u)} title="Supprimer l'acces" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
