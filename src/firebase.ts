import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Ces valeurs ne sont pas secretes : la securite repose sur Firebase Auth + les regles Firestore.
export const firebaseConfig = {
  apiKey: 'AIzaSyAwQ2ToWVvrleu4MSjvAnb6aforvnYmMX0',
  authDomain: 'commercial-5freres.firebaseapp.com',
  projectId: 'commercial-5freres',
  storageBucket: 'commercial-5freres.firebasestorage.app',
  messagingSenderId: '939905488832',
  appId: '1:939905488832:web:aa464a2b5920275fea9a25',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

/**
 * Cree un compte Firebase Auth sans deconnecter l'admin courant
 * (on passe par une instance secondaire de l'application).
 */
export async function createAccount(email: string, password: string): Promise<string> {
  const secondary = initializeApp(firebaseConfig, 'secondary-' + Date.now())
  try {
    const sAuth = getAuth(secondary)
    const cred = await createUserWithEmailAndPassword(sAuth, email, password)
    await signOut(sAuth)
    return cred.user.uid
  } finally {
    await deleteApp(secondary)
  }
}
