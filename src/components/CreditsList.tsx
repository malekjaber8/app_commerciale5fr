import { CheckCircle2, Pencil, RotateCcw } from 'lucide-react'
import type { CreditDoc } from '../lib/credits'
import { dt } from '../lib/format'

/** Liste des credits ajoutes a la main : une fiche par credit, avec les actions admin (modifier, marquer regle). */
export function CreditsList({ credits, showOwner, admin, onEdit, onTogglePaid }: {
  credits: CreditDoc[]; showOwner?: boolean; admin?: boolean
  onEdit?: (c: CreditDoc) => void; onTogglePaid?: (c: CreditDoc) => void
}) {
  const fmtDate = (s: string) => {
    if (!s) return '—'
    const [y, m, d] = s.split('-')
    return y && m && d ? `${d}/${m}/${y}` : s
  }

  if (credits.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Aucun credit pour le moment.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {credits.map(c => (
        <div key={c.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3 last:border-0 ${c.paid ? 'opacity-60' : ''}`}>
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-extrabold text-navy ${c.paid ? 'line-through' : ''}`}>{c.client}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span>{fmtDate(c.docDate)}</span>
              {c.ref && <><span>·</span><span>{c.ref}</span></>}
              {showOwner && <><span>·</span><span>{c.ownerName}</span></>}
            </div>
            {c.note && <div className="mt-0.5 text-xs text-slate-400">{c.note}</div>}
          </div>
          <div className={`shrink-0 text-base font-extrabold ${c.paid ? 'text-slate-400 line-through' : 'text-red-600'}`}>{dt(c.amount)}</div>
          {c.paid ? (
            <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Regle</span>
          ) : (
            <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">A payer</span>
          )}
          {admin && (
            <div className="flex shrink-0 items-center gap-1.5">
              <button title="Modifier" onClick={() => onEdit?.(c)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil size={14} /></button>
              <button title={c.paid ? 'Remettre a payer' : 'Marquer regle'} onClick={() => onTogglePaid?.(c)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${c.paid ? 'border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-teal text-white hover:opacity-90'}`}>
                {c.paid ? <><RotateCcw size={13} /> Rouvrir</> : <><CheckCircle2 size={13} /> Regle</>}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
