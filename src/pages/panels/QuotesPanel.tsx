import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { Banknote, CheckCircle2, Lock, Pencil } from 'lucide-react'
import { db } from '../../firebase'
import { DOC_TYPE_LABEL, fetchAllQuotes, fetchMyQuotes, quotePayment, type QuoteDoc } from '../../lib/quotes'
import { deleteInvoice } from '../../lib/db'
import { dt } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { useQuote } from '../../store/quote'
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
  const { startEdit, editing: editInfo, lines } = useQuote()
  const navigate = useNavigate()
  const scope = ownerUid ?? (admin ? undefined : uid ?? undefined)
  const [quotes, setQuotes] = useState<QuoteDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<'' | 'attente' | 'valide'>('')
  const [payFilter, setPayFilter] = useState<'' | 'paye' | 'impaye' | 'partiel' | 'nonsolde'>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
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

  // Les deux filtres se combinent : etat (en attente / valide) ET reglement (paye / partiel / non paye...).
  // Un devis encore « en attente » n'a rien encaisse : il compte comme « non paye ».
  const matchesPay = (q: QuoteDoc, f: typeof payFilter) => {
    const st = quotePayment(q).state
    if (!f) return true
    if (f === 'paye') return st === 'paye'
    if (f === 'partiel') return st === 'partiel'
    if (f === 'impaye') return st === 'impaye' || st === 'na'
    return st !== 'paye' // non solde : non paye + partiel
  }
  // Filtre par date de creation du devis (calendrier du/au, jours inclus)
  const inDates = (q: QuoteDoc) => {
    if (!from && !to) return true
    const d = q.createdAt?.toDate()
    if (!d) return false
    if (from && d < new Date(from + 'T00:00:00')) return false
    if (to && d > new Date(to + 'T23:59:59.999')) return false
    return true
  }
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const byEtat = useMemo(() => quotes.filter(q => inDates(q) && (!filter ? true : filter === 'valide' ? q.status === 'valide' : q.status !== 'valide')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotes, filter, from, to])
  const shown = useMemo(() => byEtat.filter(q => matchesPay(q, payFilter)), [byEtat, payFilter])
  const payCount = (f: typeof payFilter) => byEtat.filter(q => matchesPay(q, f)).length
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
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className={inputCls + ' max-w-[210px]'} aria-label="Filtrer par etat">
          <option value="">Tous les etats</option>
          <option value="attente">En attente ({pendingCount})</option>
          <option value="valide">Valides</option>
        </select>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value as typeof payFilter)} className={inputCls + ' max-w-[250px]'} aria-label="Filtrer par reglement">
          <option value="">Tous les reglements</option>
          <option value="paye">Payes ({payCount('paye')})</option>
          <option value="partiel">Partiellement payes ({payCount('partiel')})</option>
          <option value="impaye">Non payes ({payCount('impaye')})</option>
          <option value="nonsolde">Reste a payer : non payes + partiels ({payCount('nonsolde')})</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Du</span>
          <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className={inputCls + ' w-auto!'} aria-label="Date de debut" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">au</span>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className={inputCls + ' w-auto!'} aria-label="Date de fin" />
          <button onClick={() => { const t = todayStr(); setFrom(t); setTo(t) }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-teal-dark hover:bg-slate-50">Aujourd&apos;hui</button>
        </div>
        {(filter || payFilter || from || to) && (
          <button onClick={() => { setFilter(''); setPayFilter(''); setFrom(''); setTo('') }} className="text-xs font-bold text-teal-dark underline">Reinitialiser les filtres</button>
        )}
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
          ) : q => q.status === 'valide'
            ? <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Lock size={12} /> Verrouillé</span>
            : (
              <button onClick={async () => {
                if (editInfo && editInfo.id !== q.id && !(await ask('Une modification est deja en cours sur un autre devis. Elle sera abandonnee.', { confirmLabel: 'Continuer', danger: false }))) return
                if (!editInfo && lines.length > 0 && !(await ask('Votre panier actuel sera remplace par ce devis. Continuer ?', { confirmLabel: 'Continuer', danger: false }))) return
                startEdit(q); navigate('/devis')
              }} className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white"><Pencil size={13} /> Modifier</button>
            )}
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
