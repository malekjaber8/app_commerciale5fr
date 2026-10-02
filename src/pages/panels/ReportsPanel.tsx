import { useCallback, useEffect, useState } from 'react'
import { fetchAllQuotes, type QuoteDoc } from '../../lib/quotes'
import { fetchAllCredits, type CreditDoc } from '../../lib/credits'
import { DailyReportContent } from '../../components/DailyReportModal'

/** Onglet Rapport : meme contenu que « Rapport du jour », accessible directement sans passer par Commande du jour, pour n'importe quelle date. */
export function ReportsPanel() {
  const [quotes, setQuotes] = useState<QuoteDoc[]>([])
  const [credits, setCredits] = useState<CreditDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(false) }
    try {
      const [q, c] = await Promise.all([fetchAllQuotes(), fetchAllCredits()])
      setQuotes(q); setCredits(c)
    } catch { if (!silent) setError(true) } finally { if (!silent) setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-8 text-center text-slate-400">Chargement...</div>
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger le rapport.</div>

  return <DailyReportContent quotes={quotes} credits={credits} onVerified={() => load(true)} />
}
