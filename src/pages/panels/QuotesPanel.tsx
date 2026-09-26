import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { Banknote, CheckCircle2, Pencil } from 'lucide-react'
import { db } from '../../firebase'
import { DOC_TYPE_LABEL, fetchAllQuotes, fetchMyQuotes, quotePayment, type QuoteDoc } from '../../lib/quotes'
import { deleteInvoice } from '../../lib/db'
import { dt } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { QuoteList } from '../../components/QuoteList'
import { inputCls } from '../../components/ui'
import { useDialogs } from '../../components/Dialogs'

// Fenetres d'administration : presentes uniquement dans l'application bureau (absentes du build web)
const QuoteEditor = import.meta.env.VITE_DESKTOP === '1' ? lazy(() => import('../../components/QuoteEditor').then(m => ({ default: m.QuoteEditor }))) : null
const ValidateQuoteModal = import.meta.env.VITE_DESKTOP === '1' ? lazy(() => import('../../components/ValidateQuoteModal').then(m => ({ default: m.ValidateQuoteModal }))) : null

const PaymentModal = import.meta.env.VITE_DESKTOP === '1' ? lazy(() => import('../../components/PaymentModal').then(m => ({ default: m.PaymentModal }))) : null

interface Props { ownerUid?: string; admin?: boolean }

export function QuotesPanel({ ownerUid, admin }: Props) {
  const { uid } = useAuth()
  const { ask } = useDialogs()
  const scope = ownerUid ?? (admin ? undefined : uid ?? undefined)
  const [quotes, setQuotes] = useState<QuoteDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<'' | 'attente' | 'valide'>('')
  const [editing, setEditing] = useState<QuoteDoc | null>(null)
  const [validating, setValidating] = useState<QuoteDoc | null>(null)
  const [paying, setPaying] = useState<QuoteDoc | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(false) }
    try { setQuotes(scope ? await fetchMyQuotes(scope) : await fetchAllQuotes()) } catch { if (!silent) setError(true) } finally { if (!silent) setLoading(false) }
  }, [scope])
  useEffect(() => { load() }, [load])

  // Le commercial voit la validation sans rien faire : rafraichissement automatique toutes les 45 s et au retour sur l'application
  useEffect(() => {
    if (admin) return
    const tick = () => { if (document.visibilityState === 'visible') load(true) }
    const timer = setInterval(tick, 45000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [admin, load])

  const shown = useMemo(() => quotes.filter(q => {
    if (!filter) return true
    return filter === 'valide' ? q.status === 'valide' : q.status !== 'valide'
  }), [quotes, filter])
  const outstanding = shown.reduce((s, q) => s + (quotePayment(q).state === 'na' ? 0 : quotePayment(q).balance), 0)
  const pendingCount = quotes.filter(q => q.status !== 'valide').length

  const remove = async (q: QuoteDoc) => {
    const type = q.status === 'valide' ? (q.docType ?? 'devis') : 'devis'
    const label = DOC_TYPE_LABEL[type].toLowerCase()
    const number = type === 'devis' || !q.docNumber ? q.number : q.docNumber
    const extra = q.invoiceId ? "\n\nLa facture correspondante sera aussi supprimee de l'onglet Factures." : ''
    if (!(await ask(`Supprimer definitivement le ${label} ${number} (${q.client || 'sans client'}) ?${extra}`, { confirmLabel: 'Supprimer' }))) return
    if (q.invoiceId) { try { await deleteInvoice(q.invoiceId) } catch { /* facture deja supprimee */ } }
    await deleteDoc(doc(db, 'quotes', q.id)); await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className={inputCls + ' max-w-[200px]'}>
          <option value="">Tous les devis</option>
          <option value="attente">En attente ({pendingCount})</option>
          <option value="valide">Valides</option>
        </select>
        <span>{shown.length} devis — {dt(shown.reduce((s, q) => s + q.total, 0))}{outstanding > 0 && <> — <b className="text-red-600">reste a encaisser : {dt(outstanding)}</b></>}</span>
        <button onClick={() => load()} className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Actualiser</button>
      </div>
      {loading && <div className="p-8 text-center text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger les devis.</div>}
      {!loading && !error && (
        <QuoteList
          quotes={shown}
          showOwner={admin && !ownerUid}
          onDelete={admin ? remove : undefined}
          extra={admin ? q => (
            <>
              <button title="Modifier le devis" onClick={() => setEditing(q)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil size={15} /></button>
              {q.status === 'valide' && (
                <button title="Reglement" onClick={() => setPaying(q)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-green-50 hover:text-green-700"><Banknote size={15} /></button>
              )}
              <button onClick={() => setValidating(q)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${q.status === 'valide' ? 'border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-navy text-white hover:opacity-90'}`}>
                <CheckCircle2 size={14} /> {q.status === 'valide' ? 'Type' : 'Valider'}
              </button>
            </>
          ) : undefined}
        />
      )}
      <Suspense fallback={null}>
        {editing && QuoteEditor && <QuoteEditor quote={editing} onClose={() => setEditing(null)} onSaved={() => load()} />}
        {paying && PaymentModal && <PaymentModal quote={paying} onClose={() => setPaying(null)} onDone={() => load(true)} />}
        {validating && ValidateQuoteModal && <ValidateQuoteModal quote={validating} onClose={() => setValidating(null)} onDone={() => load()} />}
      </Suspense>
    </div>
  )
}
