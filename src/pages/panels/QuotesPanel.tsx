import { useCallback, useEffect, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { ArrowRightCircle } from 'lucide-react'
import { db } from '../../firebase'
import { createOrder } from '../../lib/db'
import { fetchAllQuotes, fetchMyQuotes, linkQuoteToOrder, type QuoteDoc } from '../../lib/quotes'
import { dt } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { QuoteList } from '../../components/QuoteList'

interface Props { ownerUid?: string; admin?: boolean }

export function QuotesPanel({ ownerUid, admin }: Props) {
  const { uid } = useAuth()
  const scope = ownerUid ?? (admin ? undefined : uid ?? undefined)
  const [quotes, setQuotes] = useState<QuoteDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setQuotes(scope ? await fetchMyQuotes(scope) : await fetchAllQuotes()) } catch { setError(true) } finally { setLoading(false) }
  }, [scope])
  useEffect(() => { load() }, [load])

  const convert = async (q: QuoteDoc) => {
    if (!confirm(`Transformer le devis ${q.number} en commande ?`)) return
    const orderId = await createOrder({
      number: q.number.replace(/^DV/, 'CMD'), quoteId: q.id, clientId: q.clientId || '', clientName: q.client, phone: q.phone,
      ownerUid: q.ownerUid, ownerName: q.ownerName, ownerEmail: q.ownerEmail, lines: q.lines,
      subtotal: q.subtotal, discountPct: q.discountPct, discount: q.discount, total: q.total, status: 'nouvelle', note: q.note,
    })
    await linkQuoteToOrder(q.id, orderId)
    await load()
  }

  const remove = async (q: QuoteDoc) => {
    if (!confirm(`Supprimer le devis ${q.number} ?`)) return
    await deleteDoc(doc(db, 'quotes', q.id)); await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {quotes.length} devis — {dt(quotes.reduce((s, q) => s + q.total, 0))}
        <button onClick={load} className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Actualiser</button>
      </div>
      {loading && <div className="p-8 text-center text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger les devis.</div>}
      {!loading && !error && (
        <QuoteList
          quotes={quotes}
          showOwner={admin && !ownerUid}
          onDelete={admin ? remove : undefined}
          extra={q => q.orderId
            ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">Commande creee</span>
            : <button onClick={() => convert(q)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-teal/10"><ArrowRightCircle size={14} /> Commande</button>}
        />
      )}
    </div>
  )
}
