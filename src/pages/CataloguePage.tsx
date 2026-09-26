import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, PackagePlus, Search, X } from 'lucide-react'
import { categoryScope, childrenOf, findCategory, topCategories } from '../lib/catalogue'
import { useSettings } from '../store/settings'
import { useAuth } from '../store/auth'
import type { Article } from '../types'
import { ArticleCard } from '../components/ArticleCard'
import { useRemoveArticle } from '../lib/useRemoveArticle'
import { ArticleDrawer } from '../components/ArticleDrawer'
import { ArticleFormModal } from '../components/ArticleFormModal'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function CataloguePage() {
  const { articles } = useSettings()
  const { role } = useAuth()
  const removeArticle = useRemoveArticle()
  const [adding, setAdding] = useState(false)
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

  const select = (id: string | null, close = false) => { setCatId(id); if (close) setMenuOpen(false) }
  const toggle = (id: string, single: boolean) => setExpanded(prev => {
    if (single) return prev.has(id) ? new Set() : new Set([id])
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  /**
   * Menu des categories. En mode tablette (`touch`), le menu reste ouvert tant qu'on n'a pas fait le choix final :
   * toucher une categorie qui a des sous-categories la deplie, on choisit ensuite la sous-categorie (ou « Tout »).
   */
  const renderSidebar = (touch: boolean) => (
    <nav className={touch ? 'space-y-1 p-3' : 'space-y-0.5 p-3'}>
      <button onClick={() => select(null, touch)}
        className={`flex w-full items-center justify-between rounded-lg px-3 ${touch ? 'py-3.5 text-base' : 'py-2 text-sm'} font-semibold ${catId === null ? 'bg-teal/15 text-teal-dark' : 'text-slate-700 hover:bg-slate-100'}`}>
        <span>Tous les articles</span><span className="text-xs text-slate-400">{articles.length}</span>
      </button>
      {topCategories.map(c => {
        const kids = childrenOf(c.id)
        const isOpen = touch
          ? (expanded.size ? expanded.has(c.id) : kids.length > 0 && (catId === c.id || kids.some(k => k.id === catId)))
          : expanded.has(c.id) || kids.some(k => k.id === catId)
        const active = catId === c.id
        return (
          <div key={c.id}>
            <button
              onClick={() => {
                if (!kids.length) return select(c.id, touch)
                if (touch) setExpanded(isOpen ? new Set(['none']) : new Set([c.id]))
                else { select(c.id); toggle(c.id, false) }
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 text-left font-medium ${touch ? 'py-3.5 text-base' : 'py-2 text-sm'} ${active && !touch ? 'bg-teal/15 text-teal-dark' : isOpen && touch ? 'bg-slate-100 text-navy' : 'text-slate-700 hover:bg-slate-100'}`}>
              <span className={touch ? 'text-xl' : ''}>{c.icon}</span>
              <span className="flex-1">{c.label}</span>
              <span className="text-xs text-slate-400">{countIn(c.id)}</span>
              {kids.length > 0 && (isOpen ? <ChevronDown size={touch ? 18 : 14} /> : <ChevronRight size={touch ? 18 : 14} />)}
            </button>
            {isOpen && (
              <div className={touch ? 'mb-1 ml-4 mt-1 space-y-1 border-l-2 border-teal/30 pl-2' : ''}>
                {touch && (
                  <button onClick={() => select(c.id, true)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-[15px] font-semibold ${catId === c.id ? 'bg-teal/15 text-teal-dark' : 'text-navy hover:bg-slate-100'}`}>
                    <span>Tout : {c.label}</span><span className="text-xs text-slate-400">{countIn(c.id)}</span>
                  </button>
                )}
                {kids.map(k => (
                  <button key={k.id} onClick={() => select(k.id, touch)}
                    className={`flex items-center justify-between rounded-lg px-3 text-left ${touch ? 'w-full py-3 text-[15px]' : 'ml-6 w-[calc(100%-1.5rem)] py-1.5 text-[13px]'} ${catId === k.id ? 'bg-teal/15 font-semibold text-teal-dark' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <span>{k.icon} {k.label}</span><span className="text-xs text-slate-400">{countIn(k.id)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  const currentLabel = catId ? findCategory(catId)?.label : null

  return (
    <div className="flex h-full">
      <aside className="no-print hidden w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:block">{renderSidebar(false)}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-base font-bold text-navy">Catégories</span>
              <button onClick={() => setMenuOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderSidebar(true)}</div>
          </aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white p-4">
          <button onClick={() => setMenuOpen(true)} className="max-w-[60%] truncate rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold lg:hidden">{currentLabel ? `☰ ${currentLabel}` : '☰ Catégories'}</button>
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
          {import.meta.env.VITE_DESKTOP === '1' && role === 'admin' && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow"><PackagePlus size={16} /> Ajouter un article</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {list.length === 0 ? (
            <div className="mt-20 text-center text-slate-400">Aucun article trouvé.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {list.map(a => <ArticleCard key={a.id} article={a} onOpen={() => setOpen(a)}
                onDelete={import.meta.env.VITE_DESKTOP === '1' && role === 'admin' && !a.hidden ? () => { removeArticle(a) } : undefined} />)}
            </div>
          )}
        </div>
      </section>

      {import.meta.env.VITE_DESKTOP === '1' && adding && <ArticleFormModal defaultCategoryId={catId} onClose={() => setAdding(false)} />}
      {open && <ArticleDrawer key={open.id} article={articles.find(a => a.id === open.id) ?? open} onClose={() => setOpen(null)} />}
    </div>
  )
}
