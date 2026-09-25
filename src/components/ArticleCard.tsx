import { Flame, ImageOff } from 'lucide-react'
import type { Article } from '../types'
import { asset, dt } from '../lib/format'

export function ArticleCard({ article, onOpen }: { article: Article; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal hover:shadow-md"
    >
      <div className="relative flex h-40 items-center justify-center bg-slate-50">
        {article.img ? (
          <img src={asset(article.img)} alt={article.name} loading="lazy"
               className="max-h-full max-w-full object-contain p-3 transition group-hover:scale-105" />
        ) : (
          <ImageOff className="text-slate-300" />
        )}
        {article.promo && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            <Flame size={11} /> Promo
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-semibold text-navy">{article.name}</div>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          {article.variants.length > 1 && article.priceFrom != null && (
            <span className="text-[11px] text-slate-500">dès</span>
          )}
          <span className={`text-base font-bold ${article.promo ? 'text-red-600' : 'text-teal-dark'}`}>
            {dt(article.priceFrom)}
          </span>
          {article.promo && article.oldPrice != null && (
            <span className="text-xs text-slate-400 line-through">{dt(article.oldPrice)}</span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">{article.id}</div>
      </div>
    </button>
  )
}
