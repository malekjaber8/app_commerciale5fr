import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { ADMIN_EMAIL, loginToEmail } from '../config'

export type Role = 'admin' | 'commercial'

export interface Profile {
  role: Role
  name: string
  email: string
  active: boolean
}

type Status = 'loading' | 'out' | 'ready' | 'denied'

interface AuthCtx {
  status: Status
  uid: string | null
  email: string | null
  profile: Profile | null
  role: Role | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  // Filet de securite : si Firebase ne repond pas (reseau coupe), on affiche quand meme la connexion
  useEffect(() => {
    const t = setTimeout(() => setStatus(s => (s === 'loading' ? 'out' : s)), 8000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUid(null); setEmail(null); setProfile(null); setStatus('out')
        return
      }
      setUid(u.uid)
      setEmail(u.email)
      const mail = (u.email || '').toLowerCase()
      if (mail === ADMIN_EMAIL.toLowerCase()) {
        setProfile({ role: 'admin', name: 'Administrateur', email: mail, active: true })
        setStatus('ready')
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid))
        const data = snap.exists() ? (snap.data() as Profile) : null
        if (data && data.active && data.role === 'commercial') {
          setProfile(data)
          setStatus('ready')
        } else {
          setProfile(null)
          setStatus('denied')
        }
      } catch {
        setProfile(null)
        setStatus('denied')
      }
    })
  }, [])

  const value = useMemo<AuthCtx>(() => ({
    status, uid, email, profile,
    role: profile?.role ?? null,
    login: async (id, p) => { await signInWithEmailAndPassword(auth, loginToEmail(id), p) },
    logout: async () => { await signOut(auth) },
  }), [status, uid, email, profile])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth hors AuthProvider')
  return ctx
}

/** Message francais pour une erreur Firebase Auth. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Nom d\'utilisateur ou mot de passe incorrect.'
  if (code.includes('too-many-requests')) return 'Trop de tentatives. Reessayez dans quelques minutes.'
  if (code.includes('network')) return 'Probleme de connexion reseau.'
  if (code.includes('email-already-in-use')) return "Ce nom d'utilisateur existe deja."
  if (code.includes('weak-password')) return 'Mot de passe trop faible (6 caracteres minimum).'
  if (code.includes('invalid-email')) return "Nom d'utilisateur invalide."
  return 'Une erreur est survenue. Reessayez.'
}
