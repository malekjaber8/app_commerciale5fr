/**
 * Compte administrateur : identifie par son adresse e-mail.
 * IMPORTANT : cette meme adresse doit figurer dans les regles Firestore (fichier firestore.rules).
 */
export const ADMIN_EMAIL = 'malekjaber955@gmail.com'

/**
 * Les commerciaux se connectent avec un simple nom d'utilisateur. Firebase Auth exige une adresse e-mail :
 * on en fabrique une (jamais utilisee pour envoyer du courrier) a partir du nom d'utilisateur.
 */
export const USERNAME_DOMAIN = '@commerciaux.5freres.app'
export const cleanUsername = (u: string) => u.trim().toLowerCase()
export const isValidUsername = (u: string) => /^[a-z0-9._-]{3,30}$/.test(cleanUsername(u)) && cleanUsername(u) !== OWNER_LOGIN
export const usernameToEmail = (u: string) => cleanUsername(u) + USERNAME_DOMAIN
/** Identifiant saisi a la connexion : un nom d'utilisateur (commercial) ou une vraie adresse e-mail (admin). */
export const OWNER_LOGIN = 'malek'
export const loginToEmail = (id: string) => {
  const clean = cleanUsername(id)
  if (clean === OWNER_LOGIN) return ADMIN_EMAIL // alias : « malek » = le compte proprietaire
  return id.includes('@') ? id.trim() : usernameToEmail(id)
}
/** Nom d'utilisateur lisible a partir de l'e-mail technique (ou l'e-mail tel quel s'il est reel). */
export const emailToLogin = (email: string) => (email.endsWith(USERNAME_DOMAIN) ? email.slice(0, -USERNAME_DOMAIN.length) : email)

/** Vrai uniquement dans l'application bureau (build avec VITE_DESKTOP=1) : la version web n'embarque pas l'admin. */
export const IS_DESKTOP = import.meta.env.VITE_DESKTOP === '1'
