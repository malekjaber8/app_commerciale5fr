/**
 * Compte administrateur : identifie par son adresse e-mail.
 * IMPORTANT : cette meme adresse doit figurer dans les regles Firestore (fichier firestore.rules).
 */
export const ADMIN_EMAIL = 'malekjaber955@gmail.com'

/** Vrai uniquement dans l'application bureau (build avec VITE_DESKTOP=1) : la version web n'embarque pas l'admin. */
export const IS_DESKTOP = import.meta.env.VITE_DESKTOP === '1'
