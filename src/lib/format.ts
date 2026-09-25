/** Prix en dinars tunisiens, 3 décimales (millimes). */
export function dt(n: number | null | undefined): string {
  if (n == null) return 'Sur devis'
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' DT'
}

/** Chemin d'image relatif à la racine de l'app (fonctionne sous GitHub Pages). */
export function asset(path: string | null | undefined): string {
  if (!path) return ''
  return import.meta.env.BASE_URL + encodeURI(path)
}
