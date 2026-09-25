import { useState, type FormEvent } from 'react'
import { LogIn } from 'lucide-react'
import { authErrorMessage, useAuth } from '../store/auth'
import { IS_DESKTOP } from '../config'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-navy via-navy to-navy-soft p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <img src={import.meta.env.BASE_URL + 'logo.png'} alt="Les Cinq Freres" className="mx-auto mb-3 h-14" />
        <h1 className="text-center text-lg font-bold text-navy">{IS_DESKTOP ? 'Administration' : 'Espace Commercial'}</h1>
        <p className="mb-5 text-center text-xs text-slate-500">Acces reserve. Connectez-vous avec votre compte.</p>

        <label className="mb-1 block text-xs font-semibold text-slate-600">Adresse e-mail</label>
        <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal" />

        <label className="mb-1 block text-xs font-semibold text-slate-600">Mot de passe</label>
        <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal" />

        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}

        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-navy-soft py-3 text-sm font-bold text-white shadow disabled:opacity-60">
          <LogIn size={16} /> {busy ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}

export function DeniedPage() {
  const { logout, email } = useAuth()
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-lg">
        <div className="mb-2 text-3xl">🔒</div>
        <h1 className="text-lg font-bold text-navy">Acces non autorise</h1>
        <p className="mt-2 text-sm text-slate-500">
          Le compte <b>{email}</b> n&apos;a pas (ou plus) acces a cet espace. Contactez l&apos;administrateur.
        </p>
        <button onClick={logout} className="mt-5 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white">Se deconnecter</button>
      </div>
    </div>
  )
}

export function AdminOnlyPage() {
  const { logout, email } = useAuth()
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-lg">
        <div className="mb-2 text-3xl">🛡️</div>
        <h1 className="text-lg font-bold text-navy">Application reservee a l&apos;administrateur</h1>
        <p className="mt-2 text-sm text-slate-500">Le compte <b>{email}</b> n&apos;est pas administrateur. Les commerciaux utilisent le lien web.</p>
        <button onClick={logout} className="mt-5 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white">Se deconnecter</button>
      </div>
    </div>
  )
}
