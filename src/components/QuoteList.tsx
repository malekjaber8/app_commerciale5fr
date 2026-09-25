import { useState, type CSSProperties, type ReactNode } from 'react'
import { Printer, Trash2 } from 'lucide-react'
import { SalesDocView } from './SalesDocView'
import { dt } from '../lib/format'
import { DOC_TYPE_LABEL, fmtDate, quotePayment, type QuoteDoc } from '../lib/quotes'

interface Props {
  quotes: QuoteDoc[]
  showOwner?: boolean
  onDelete?: (q: QuoteDoc) => void
  extra?: (q: QuoteDoc) => ReactNode
}

const head = 'text-[11px] font-bold uppercase tracking-wide text-slate-500'

function StateCell({ q }: { q: QuoteDoc }) {
  if (q.status !== 'valide') return <span className="inline-block whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">En attente</span>
  const type = q.docType ?? 'devis'
  const number = type === 'devis' ? q.number : q.docNumber || q.number
  return (
    <div>
      <span className="inline-block whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Validé</span>
      <div className="mt-1 text-xs font-semibold text-slate-600">{DOC_TYPE_LABEL[type]}</div>
      <div className="text-[11px] text-slate-400">{number}</div>
    </div>
  )
}

function PaymentCell({ q }: { q: QuoteDoc }) {
  const pay = quotePayment(q)
  if (pay.state === 'na') return <span className="text-slate-300">—</span>
  if (pay.state === 'paye') return <span className="inline-block whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Payé</span>
  if (pay.state === 'partiel') {
    return (
      <div>
        <span className="inline-block whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Partiel</span>
        <div className="mt-1 text-xs font-bold text-red-600">Reste {dt(pay.balance)}</div>
        <div className="text-[11px] text-slate-400">Payé {dt(pay.paid)}</div>
      </div>
    )
  }
  return (
    <div>
      <span className="inline-block whitespace-nowrap rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Non payé</span>
      <div className="mt-1 text-xs font-bold text-red-600">Reste {dt(pay.balance)}</div>
    </div>
  )
}

/** Liste des devis : une ligne par devis, colonnes alignees (grille) sur tablette/PC, empilee sur petit ecran. */
export function QuoteList({ quotes, showOwner, onDelete, extra }: Props) {
  const [viewing, setViewing] = useState<QuoteDoc | null>(null)
  const hasActions = !!(onDelete || extra)

  if (quotes.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">Aucun devis pour le moment.</div>
  }

  const cols = [
    'minmax(0,2fr)', // client
    showOwner ? 'minmax(0,1.1fr)' : null, // commercial
    'minmax(0,1.75fr)', // devis + date
    'minmax(0,1.45fr)', // total
    'minmax(0,1.4fr)', // etat
    'minmax(0,1.4fr)', // reglement
    hasActions ? (extra ? '170px' : '40px') : null, // actions (largeur fixe : colonnes alignees avec l'en-tete)
  ].filter(Boolean).join(' ')
  const style = { '--cols': cols } as CSSProperties
  const grid = 'grid items-center gap-x-5 gap-y-2 px-5 md:[grid-template-columns:var(--cols)]'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" style={style}>
      <div className={`${grid} hidden border-b border-slate-200 bg-slate-50 py-3 md:grid`}>
        <div className={head}>Client</div>
        {showOwner && <div className={head}>Commercial</div>}
        <div className={head}>Devis</div>
        <div className={`${head} text-right`}>Total</div>
        <div className={head}>État</div>
        <div className={head}>Règlement</div>
        {hasActions && <div />}
      </div>

      {quotes.map(q => (
        <div key={q.id} onClick={() => setViewing(q)} title="Ouvrir le document"
          className={`${grid} cursor-pointer border-b border-slate-100 py-4 last:border-0 hover:bg-teal/5`}>
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold text-navy">{q.client || '—'}</div>
            {q.phone && <div className="text-xs text-slate-500">{q.phone}</div>}
          </div>
          {showOwner && <div className="text-sm font-medium text-slate-600">{q.ownerName || q.ownerEmail}</div>}
          <div>
            <div className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-700"><Printer size={13} className="shrink-0 text-slate-400" />{q.number}</div>
            <div className="text-xs text-slate-400">{fmtDate(q.createdAt)}</div>
          </div>
          <div className="whitespace-nowrap text-base font-extrabold text-navy md:text-right">{dt(q.total)}</div>
          <div><StateCell q={q} /></div>
          <div><PaymentCell q={q} /></div>
          {hasActions && (
            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
              {extra?.(q)}
              {onDelete && <button onClick={() => onDelete(q)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>}
            </div>
          )}
        </div>
      ))}

      {viewing && (
        <SalesDocView onClose={() => setViewing(null)} doc={{
          kind: viewing.status === 'valide' ? (viewing.docType ?? 'devis') : 'devis',
          number: viewing.status === 'valide' && viewing.docType && viewing.docType !== 'devis' && viewing.docNumber ? viewing.docNumber : viewing.number,
          date: viewing.createdAt ? viewing.createdAt.toDate() : null,
          clientId: viewing.clientId, clientName: viewing.client, phone: viewing.phone, ownerName: viewing.ownerName,
          lines: viewing.lines, discount: viewing.discount, discountPct: viewing.discountPct, note: viewing.note,
        }} />
      )}
    </div>
  )
}
