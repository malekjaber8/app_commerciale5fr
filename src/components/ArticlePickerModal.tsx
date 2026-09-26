import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useQuote } from '../store/quote'
import { dt } from '../lib/format'
import { Modal, inputCls } from './ui'
import type { DocLine } from '../types'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Ajout d'un article (recherche + variante) : au panier par defaut, ou a un document via onPick (edition admin). */
export function ArticlePickerModal({ onClose, onPick }: { onClose: () => void; onPick?: (line: DocLine) => void }) {
  const { articles } = useSettings()
  const { add } = useQuote()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState('')

  const results = useMemo(() => {
    const q = norm(query.trim())
    if (!q) return []
    return articles.filter(a => norm(`${a.name} ${a.id}`).includes(q)).slice(0, 30)
  }, [articles, query])

  return (
    <Modal title="Ajouter un article" onClose={onClose}>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un article..." className={inputCls + ' pl-9'} />
      </div>
      {!query.trim() && <div className="p-6 text-center text-sm text-slate-400">Tapez le nom d'un article.</div>}
      {query.trim() && results.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Aucun article trouve.</div>}
      <div className="max-h-[55vh] overflow-y-auto">
        {results.map(a => (
          <div key={a.id} className="border-b border-slate-100 last:border-0">
            <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="w-full px-2 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">{a.name}</button>
            {openId === a.id && (
              <div className="mb-2 rounded-xl bg-slate-50 p-2">
                {a.variants.map(v => {
                  const k = `${a.id}|${v.label}`
                  return (
                    <button key={k} disabled={v.price == null}
                      onClick={() => { (onPick ?? add)({ articleId: a.id, name: a.name, variant: v.label, unitPrice: v.price as number, qty: 1 }); setJustAdded(k); setTimeout(() => setJustAdded(''), 1200) }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-teal/10 disabled:opacity-40">
                      <span className="min-w-0 truncate text-slate-700">{v.label}</span>
                      <span className="flex shrink-0 items-center gap-2 font-bold text-navy">
                        {justAdded === k && <Check size={15} className="text-green-600" />}{dt(v.price)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={onClose} className="mt-4 w-full rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white">Terminer</button>
    </Modal>
  )
}
