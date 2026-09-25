import { useEffect, useState } from 'react'
import { fetchMyQuotes, type QuoteDoc } from '../lib/quotes'
import { useAuth } from '../store/auth'
import { QuoteList } from '../components/QuoteList'

export function MyQuotesPage() {
  const { uid } = useAuth()
  const [quotes, setQuotes] = useState<QuoteDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!uid) return
    fetchMyQuotes(uid).then(setQuotes).catch(() => setError(true)).finally(() => setLoading(false))
  }, [uid])

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold text-navy">Mes devis</h1>
      {loading && <div className="p-10 text-center text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger vos devis.</div>}
      {!loading && !error && <QuoteList quotes={quotes} />}
    </div>
  )
}
