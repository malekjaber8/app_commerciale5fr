import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { Activity, Package, Users } from 'lucide-react'
import { db } from '../../firebase'
import { fetchAllQuotes, type QuoteDoc } from '../../lib/quotes'
import { dt } from '../../lib/format'
import { QuoteList } from '../../components/QuoteList'
import { UsersTab } from './UsersTab'
import { ContentTab } from './ContentTab'

type Tab = 'users' | 'content' | 'quotes'

function QuotesTab() {
  const [quotes, setQuotes] = useState<QuoteDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [owner, setOwner] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setQuotes(await fetchAllQuotes()) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const owners = useMemo(() => [...new Set(quotes.map(q => q.ownerName || q.ownerEmail))], [quotes])
  const shown = owner ? quotes.filter(q => (q.ownerName || q.ownerEmail) === owner) : quotes
  const total = shown.reduce((s, q) => s + q.total, 0)

  const remove = async (q: QuoteDoc) => {
    if (!confirm(`Supprimer le devis ${q.number} ?`)) return
    await deleteDoc(doc(db, 'quotes', q.id))
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={owner} onChange={e => setOwner(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none">
          <option value="">Tous les commerciaux</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="text-sm text-slate-500">{shown.length} devis — total {dt(total)}</div>
        <button onClick={load} className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Actualiser</button>
      </div>
      {loading ? <div className="p-10 text-center text-slate-400">Chargement...</div> : <QuoteList quotes={shown} showOwner onDelete={remove} />}
    </div>
  )
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Commerciaux', icon: Users },
    { id: 'content', label: 'Contenu et prix', icon: Package },
    { id: 'quotes', label: 'Suivi des devis', icon: Activity },
  ]
  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold text-navy">Administration</h1>
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t.id ? 'border-teal text-teal-dark' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'content' && <ContentTab />}
      {tab === 'quotes' && <QuotesTab />}
    </div>
  )
}
