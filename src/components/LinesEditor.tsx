import { useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import type { DocLine } from '../types'
import { dt } from '../lib/format'
import { inputCls } from './ui'
import { QtyInput } from './QtyInput'
import { ArticlePickerModal } from './ArticlePickerModal'

/** Tableau de lignes modifiable : designation, variante, prix unitaire, quantite. */
export function LinesEditor({ lines, onChange }: { lines: DocLine[]; onChange: (l: DocLine[]) => void }) {
  const [picking, setPicking] = useState(false)
  const addFromCatalogue = (line: DocLine) => {
    const i = lines.findIndex(l => l.articleId === line.articleId && l.variant === line.variant)
    onChange(i >= 0 ? lines.map((l, k) => (k === i ? { ...l, qty: Math.round((l.qty + 1) * 1000) / 1000 } : l)) : [...lines, line])
  }
  const patch = (i: number, p: Partial<DocLine>) => onChange(lines.map((l, k) => (k === i ? { ...l, ...p } : l)))
  const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isNaN(n) ? 0 : n }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-2">Designation</th><th className="p-2">Variante</th><th className="w-28 p-2">P.U. TTC</th><th className="w-20 p-2">Qte</th><th className="w-28 p-2 text-right">Montant</th><th className="w-8" /></tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-1.5"><input className={inputCls} value={l.name} onChange={e => patch(i, { name: e.target.value })} /></td>
                <td className="p-1.5"><input className={inputCls} value={l.variant} onChange={e => patch(i, { variant: e.target.value })} /></td>
                <td className="p-1.5"><input className={inputCls + ' text-right'} defaultValue={l.unitPrice} key={'p' + i + l.articleId} onBlur={e => patch(i, { unitPrice: num(e.target.value) })} /></td>
                <td className="p-1.5"><QtyInput className={inputCls + ' text-center'} value={l.qty} onChange={n => patch(i, { qty: n })} /></td>
                <td className="p-1.5 text-right font-semibold">{dt(l.unitPrice * l.qty)}</td>
                <td className="p-1.5"><button onClick={() => onChange(lines.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => setPicking(true)}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white hover:opacity-90">
          <Search size={14} /> Ajouter un article du catalogue
        </button>
        <button onClick={() => onChange([...lines, { articleId: 'CUSTOM', name: 'Nouvelle ligne', variant: '', unitPrice: 0, qty: 1 }])}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <Plus size={14} /> Ajouter une ligne libre
        </button>
      </div>
      {picking && <ArticlePickerModal onClose={() => setPicking(false)} onPick={addFromCatalogue} />}
    </div>
  )
}
