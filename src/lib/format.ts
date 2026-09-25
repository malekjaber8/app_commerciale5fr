/** Prix en dinars tunisiens, 3 decimales (millimes). */
export function dt(n: number | null | undefined): string {
  if (n == null) return 'Sur devis'
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' DT'
}

/** Chemin d'image relatif a la racine de l'app (fonctionne sous GitHub Pages et en application bureau). */
export function asset(path: string | null | undefined): string {
  if (!path) return ''
  // Photos des articles ajoutes par l'admin : stockees directement dans la base (data URL)
  if (path.startsWith('data:') || path.startsWith('http')) return path
  return import.meta.env.BASE_URL + encodeURI(path)
}

export function fmtTs(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '-'
  return ts.toDate().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}
