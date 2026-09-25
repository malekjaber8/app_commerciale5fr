import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { dt } from '../lib/format'
import { fmtDate, type QuoteDoc } from '../lib/quotes'

interface Props {
  quotes: QuoteDoc[]
  showOwner?: boolean
  onDelete?: (q: QuoteDoc) => void
}

export function QuoteList({ quotes, showOwner, onDelete }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

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
            <th className="p-3">Date</th>
            {onDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {quotes.map(q => {
            const open = openId === q.id
            return (
              <Fragment key={q.id}>
                <tr onClick={() => setOpenId(open ? null : q.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="pl-3 text-slate-400">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td className="p-3 font-semibold text-navy">{q.number}</td>
                  <td className="p-3">
                    <div>{q.client || '—'}</div>
                    {q.phone && <div className="text-xs text-slate-400">{q.phone}</div>}
                  </td>
                  {showOwner && <td className="p-3 text-slate-600">{q.ownerName || q.ownerEmail}</td>}
                  <td className="p-3 text-right font-bold">{dt(q.total)}</td>
                  <td className="p-3 text-slate-500">{fmtDate(q.createdAt)}</td>
                  {onDelete && (
                    <td className="p-3 text-right">
                      <button onClick={e => { e.stopPropagation(); onDelete(q) }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                    </td>
                  )}
                </tr>
                {open && (
                  <tr className="bg-slate-50">
                    <td />
                    <td colSpan={showOwner ? 6 : 5} className="p-3">
                      <table className="w-full text-xs">
                        <tbody>
                          {q.lines.map((l, i) => (
                            <tr key={i} className="border-b border-slate-200 last:border-0">
                              <td className="py-1.5"><b>{l.name}</b> <span className="text-slate-400">{l.variant}</span></td>
                              <td className="py-1.5 text-right">{l.qty} x {dt(l.unitPrice)}</td>
                              <td className="py-1.5 text-right font-semibold">{dt(l.qty * l.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-2 text-right text-xs text-slate-500">
                        Sous-total {dt(q.subtotal)}{q.discount > 0 && <> — Remise {q.discountPct}% (-{dt(q.discount)})</>}
                      </div>
                      {q.note && <div className="mt-1 text-xs text-slate-500">Note : {q.note}</div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
