import { useState, type ReactNode } from 'react'
import { Printer, Trash2 } from 'lucide-react'
import { SalesDocView } from './SalesDocView'
import { dt } from '../lib/format'
import { fmtDate, quoteStateLabel, type QuoteDoc } from '../lib/quotes'

interface Props {
  quotes: QuoteDoc[]
  showOwner?: boolean
  onDelete?: (q: QuoteDoc) => void
  extra?: (q: QuoteDoc) => ReactNode
}

export function QuoteList({ quotes, showOwner, onDelete, extra }: Props) {
  const [viewing, setViewing] = useState<QuoteDoc | null>(null)

  if (quotes.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">Aucun devis pour le moment.</div>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="w-8" />
            <th className="p-3">Devis</th>
            <th className="p-3">Client</th>
            {showOwner && <th className="p-3">Commercial</th>}
            <th className="p-3 text-right">Total</th>
            <th className="p-3">Etat</th>
            <th className="p-3">Date</th>
            {(onDelete || extra) && <th />}
          </tr>
        </thead>
        <tbody>
          {quotes.map(q => {
            return (
                <tr key={q.id} onClick={() => setViewing(q)} title="Ouvrir le devis" className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="pl-3 text-slate-400"><Printer size={14} /></td>
                  <td className="p-3 font-semibold text-navy">{q.number}</td>
                  <td className="p-3">
                    <div>{q.client || '—'}</div>
                    {q.phone && <div className="text-xs text-slate-400">{q.phone}</div>}
                  </td>
                  {showOwner && <td className="p-3 text-slate-600">{q.ownerName || q.ownerEmail}</td>}
                  <td className="p-3 text-right font-bold">{dt(q.total)}</td>
                  <td className="p-3">
                    {(() => {
                      const st = quoteStateLabel(q)
                      return (
                        <div>
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${st.pending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{st.label}</span>
                          {st.number && <div className="mt-1 text-[11px] text-slate-400">{st.number}</div>}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="p-3 text-slate-500">{fmtDate(q.createdAt)}</td>
                  {(onDelete || extra) && (
                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {extra?.(q)}
                        {onDelete && <button onClick={() => onDelete(q)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
            )
          })}
        </tbody>
      </table>
      {viewing && (
        <SalesDocView onClose={() => setViewing(null)} doc={{
          kind: viewing.status === 'valide' ? (viewing.docType ?? 'devis') : 'devis',
          number: viewing.status === 'valide' && viewing.docType && viewing.docType !== 'devis' && viewing.docNumber ? viewing.docNumber : viewing.number, date: viewing.createdAt ? viewing.createdAt.toDate() : null,
          clientId: viewing.clientId, clientName: viewing.client, phone: viewing.phone, ownerName: viewing.ownerName,
          lines: viewing.lines, discount: viewing.discount, discountPct: viewing.discountPct, note: viewing.note,
        }} />
      )}
    </div>
  )
}
