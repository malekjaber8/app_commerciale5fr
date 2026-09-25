import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { categoryScope, childrenOf, topCategories } from '../lib/catalogue'
import { useSettings } from '../store/settings'
import type { Article } from '../types'
import { ArticleCard } from '../components/ArticleCard'
import { ArticleDrawer } from '../components/ArticleDrawer'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function CataloguePage() {
  const { articles } = useSettings()
  const [catId, setCatId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [promoOnly, setPromoOnly] = useState(false)
  const [open, setOpen] = useState<Article | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const list = useMemo(() => {
    const q = norm(query.trim())
    const scope = catId ? new Set(categoryScope(catId)) : null
    return articles.filter(a => {
      if (scope && !scope.has(a.categoryId)) return false
      if (promoOnly && !a.promo) return false
      if (q && !norm(`${a.name} ${a.id} ${a.desc}`).includes(q)) return false
      return true
    })
  }, [articles, catId, query, promoOnly])

  const countIn = (id: string) => {
    const scope = new Set(categoryScope(id))
    return articles.filter(a => scope.has(a.categoryId)).length
  }

  const select = (id: string | null) => { setCatId(id); setMenuOpen(false) }
  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const sidebar = (
    <nav className="space-y-0.5 p-3">
      <button onClick={() => select(null)}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${catId === null ? 'bg-teal/15 text-teal-dark' : 'text-slate-700 hover:bg-slate-100'}`}>
        <span>Tous les articles</span><span className="text-xs text-slate-400">{articles.length}</span>
      </button>
      {topCategories.map(c => {
        const kids = childrenOf(c.id)
        const isOpen = expanded.has(c.id) || kids.some(k => k.id === catId)
        return (
          <div key={c.id}>
            <div className="flex items-center">
              <button onClick={() => { select(c.id); if (kids.length) toggle(c.id) }}
                className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${catId === c.id ? 'bg-teal/15 text-teal-dark' : 'text-slate-700 hover:bg-slate-100'}`}>
                <span>{c.icon}</span>
                <span className="flex-1">{c.label}</span>
                <span className="text-xs text-slate-400">{countIn(c.id)}</span>
                {kids.length > 0 && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
              </button>
            </div>
            {isOpen && kids.map(k => (
              <button key={k.id} onClick={() => select(k.id)}
                className={`ml-6 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px] ${catId === k.id ? 'bg-teal/15 font-semibold text-teal-dark' : 'text-slate-600 hover:bg-slate-100'}`}>
                <span>{k.icon} {k.label}</span><span className="text-xs text-slate-400">{countIn(k.id)}</span>
              </button>
            ))}
          </div>
        )
      })}
    </nav>
  )

  return (
    <div className="flex h-full">
      <aside className="no-print hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="h-full w-72 overflow-y-auto bg-white" onClick={e => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white p-4">
          <button onClick={() => setMenuOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold lg:hidden">Catégories</button>
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un article, une référence..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-teal" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={14} /></button>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={promoOnly} onChange={e => setPromoOnly(e.target.checked)} className="accent-red-600" />
            Promos uniquement
          </label>
          <div className="text-sm text-slate-500">{list.length} article{list.length > 1 ? 's' : ''}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {list.length === 0 ? (
            <div className="mt-20 text-center text-slate-400">Aucun article trouvé.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {list.map(a => <ArticleCard key={a.id} article={a} onOpen={() => setOpen(a)} />)}
            </div>
          )}
        </div>
      </section>

      {open && <ArticleDrawer key={open.id} article={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
