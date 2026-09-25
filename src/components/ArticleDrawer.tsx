import { useState } from 'react'
import { Minus, Play, Plus, ShoppingBag, X } from 'lucide-react'
import type { Article } from '../types'
import { asset, dt } from '../lib/format'
import { findCategory } from '../lib/catalogue'
import { useQuote } from '../store/quote'
import { useAuth } from '../store/auth'
import { AdminPriceEditor } from './AdminPriceEditor'

export function ArticleDrawer({ article, onClose }: { article: Article; onClose: () => void }) {
  const { add } = useQuote()
  const { role } = useAuth()
  const [variantIdx, setVariantIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [added, setAdded] = useState(false)

  const images = article.gallery.length ? article.gallery : article.img ? [article.img] : []
  const variant = article.variants[variantIdx]
  const cat = findCategory(article.categoryId)

  const addToQuote = () => {
    if (variant.price == null) return
    add({ articleId: article.id, name: article.name, variant: variant.label, unitPrice: variant.price, qty })
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-dark">{cat?.label}</div>
            <h2 className="text-lg font-bold text-navy">{article.name}</h2>
            <div className="text-xs text-slate-400">Réf. {article.id}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </header>

        <div className="space-y-5 p-5">
          {images.length > 0 && (
            <div>
              <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-50">
                {showVideo && article.video ? (
                  <video src={asset(article.video)} controls autoPlay className="h-full w-full rounded-2xl" />
                ) : (
                  <img src={asset(images[imgIdx])} alt={article.name} className="max-h-full max-w-full object-contain p-3" />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <button key={src} onClick={() => { setImgIdx(i); setShowVideo(false) }}
                    className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${!showVideo && i === imgIdx ? 'border-teal' : 'border-slate-200'}`}>
                    <img src={asset(src)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
                {article.video && (
                  <button onClick={() => setShowVideo(true)}
                    className={`flex h-14 items-center gap-1 rounded-lg border-2 px-3 text-xs font-semibold ${showVideo ? 'border-teal text-teal-dark' : 'border-slate-200 text-slate-600'}`}>
                    <Play size={14} /> Vidéo
                  </button>
                )}
              </div>
            </div>
          )}

          {article.desc && <p className="text-sm text-slate-600">{article.desc}</p>}
          {article.specs && article.specs.length > 0 && (
            <ul className="space-y-1 text-sm text-slate-600">
              {article.specs.map(s => <li key={s}>{s}</li>)}
            </ul>
          )}

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Variantes et prix</h3>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  {article.variants.map((v, i) => (
                    <tr key={v.label + i} onClick={() => setVariantIdx(i)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 ${i === variantIdx ? 'bg-teal/10' : 'hover:bg-slate-50'}`}>
                      <td className="p-2.5">
                        <div className="font-medium text-slate-700">{v.label}</div>
                        {v.code && <div className="text-[11px] text-slate-400">{v.code}</div>}
                      </td>
                      <td className="p-2.5 text-right">
                        {v.oldPrice != null && <div className="text-xs text-slate-400 line-through">{dt(v.oldPrice)}</div>}
                        <div className={`font-bold ${v.oldPrice != null ? 'text-red-600' : 'text-navy'}`}>
                          {dt(v.price)}{article.unit ? ` / ${article.unit}` : ''}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {import.meta.env.VITE_DESKTOP === '1' && role === 'admin' && <AdminPriceEditor article={article} />}
        </div>

        <footer className="mt-auto flex items-center gap-3 border-t border-slate-200 bg-white p-5">
          <div className="flex items-center rounded-xl border border-slate-200">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-2.5 hover:bg-slate-50"><Minus size={14} /></button>
            <input value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 text-center text-sm font-semibold outline-none" />
            <button onClick={() => setQty(q => q + 1)} className="p-2.5 hover:bg-slate-50"><Plus size={14} /></button>
          </div>
          <button onClick={addToQuote} disabled={variant.price == null}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-navy-soft px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-40">
            <ShoppingBag size={16} />
            {added ? 'Ajouté au panier ✓' : variant.price == null ? 'Sur devis' : `Ajouter au panier — ${dt(variant.price * qty)}`}
          </button>
        </footer>
      </aside>
    </div>
  )
}
