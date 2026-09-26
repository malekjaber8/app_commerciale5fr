import { useState } from 'react'
import { Minus, Pencil, Play, Plus, RotateCcw, ShoppingBag, Trash2, X, ZoomIn } from 'lucide-react'
import type { Article } from '../types'
import { asset, dt } from '../lib/format'
import { findCategory } from '../lib/catalogue'
import { useQuote } from '../store/quote'
import { useAuth } from '../store/auth'
import { AdminPriceEditor } from './AdminPriceEditor'
import { ImageLightbox } from './ImageLightbox'
import { QtyInput, stepQty } from './QtyInput'
import { ArticleFormModal } from './ArticleFormModal'
import { articleToOverrideRow, deleteProduct, isCustomId, overrideDocId } from '../lib/products'
import { useRemoveArticle } from '../lib/useRemoveArticle'
import { useDialogs } from './Dialogs'
import { useSettings } from '../store/settings'

export function ArticleDrawer({ article, onClose }: { article: Article; onClose: () => void }) {
  const { add } = useQuote()
  const removeArticle = useRemoveArticle()
  const { ask } = useDialogs()
  const { role } = useAuth()
  const { products, overrides } = useSettings()
  const [editing, setEditing] = useState(false)
  const [variantIdx, setVariantIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [zoom, setZoom] = useState(false)

  const images = article.gallery.length ? article.gallery : article.img ? [article.img] : []
  const variant = article.variants[variantIdx]
  const cat = findCategory(article.categoryId)

  const addToQuote = () => {
    if (variant.price == null) return
    add({ articleId: article.id, name: article.name, variant: variant.label, unitPrice: variant.price, qty })
    onClose()
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
                  <button type="button" onClick={() => setZoom(true)} aria-label="Agrandir la photo"
                    className="group relative flex h-full w-full cursor-zoom-in items-center justify-center">
                    <img src={asset(images[imgIdx])} alt={article.name} className="max-h-full max-w-full object-contain p-3" />
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white"><ZoomIn size={13} /> Agrandir</span>
                  </button>
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
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-base">
                <tbody>
                  {article.variants.map((v, i) => (
                    <tr key={v.label + i} onClick={() => setVariantIdx(i)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 ${i === variantIdx ? 'bg-teal/10' : 'hover:bg-slate-50'}`}>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${i === variantIdx ? 'border-teal bg-teal' : 'border-slate-300'}`}>
                            {i === variantIdx && <span className="h-2 w-2 rounded-full bg-white" />}
                          </span>
                          <div>
                            <div className="font-medium text-slate-700">{v.label}</div>
                            {v.code && <div className="text-[11px] text-slate-400">{v.code}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
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

          {import.meta.env.VITE_DESKTOP === '1' && role === 'admin' && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-navy/30 bg-navy/5 p-3">
              <div className="flex-1 text-xs text-slate-600">{isCustomId(article.id) ? 'Article ajoute par vous (absent du site officiel).' : article.edited ? 'Article du site — fiche modifiee par vous.' : 'Article du catalogue du site.'}</div>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"><Pencil size={13} /> Modifier la fiche</button>
              {article.edited && <button onClick={async () => { if (await ask('Rétablir la fiche du site (nom, photos, variantes et prix d’origine) ?', { confirmLabel: 'Rétablir', danger: false })) { await deleteProduct(overrideDocId(article.id)); onClose() } }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"><RotateCcw size={13} /> Fiche du site</button>}
              <button onClick={async () => { if (await removeArticle(article)) onClose() }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={13} /> Supprimer l&apos;article</button>
            </div>
          )}
          {import.meta.env.VITE_DESKTOP === '1' && role === 'admin' && <AdminPriceEditor article={article} />}
          {import.meta.env.VITE_DESKTOP === '1' && editing && (
            <ArticleFormModal initial={isCustomId(article.id) ? products.find(p => p.id === article.id.slice(7)) : overrides.get(article.id) ?? articleToOverrideRow(article)} onClose={() => { setEditing(false); onClose() }} />
          )}
        </div>

        <footer className="sticky bottom-0 mt-auto border-t border-slate-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-3 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-500">Choix : <b className="text-navy">{variant.label}</b></span>
            <span className="shrink-0 text-slate-500">{variant.price != null ? `${dt(variant.price)}${article.unit ? ` / ${article.unit}` : ''}` : 'Sur devis'}</span>
          </div>
          <div className="flex items-stretch gap-3">
            <div className="flex items-center rounded-2xl border-2 border-slate-200">
              <button onClick={() => setQty(q => stepQty(q, -1))} className="flex h-14 w-14 items-center justify-center rounded-l-2xl hover:bg-slate-50 active:bg-slate-100"><Minus size={22} /></button>
              <QtyInput value={qty} onChange={setQty} className="w-20 text-center text-xl font-bold outline-none" />
              <button onClick={() => setQty(q => stepQty(q, 1))} className="flex h-14 w-14 items-center justify-center rounded-r-2xl hover:bg-slate-50 active:bg-slate-100"><Plus size={22} /></button>
            </div>
            <button onClick={addToQuote} disabled={variant.price == null}
              className="flex min-h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal to-navy-soft px-4 text-lg font-extrabold text-white shadow-lg active:scale-[0.99] disabled:opacity-40">
              <ShoppingBag size={24} />
              <span className="text-left leading-tight">
                {variant.price == null ? 'Sur devis' : (<>Ajouter au panier<span className="block text-sm font-semibold opacity-90">{dt(variant.price * qty)}</span></>)}
              </span>
            </button>
          </div>
        </footer>
      </aside>
      {zoom && images.length > 0 && (
        <ImageLightbox images={images} index={imgIdx} alt={article.name} onIndex={i => { setImgIdx(i); setShowVideo(false) }} onClose={() => setZoom(false)} />
      )}
    </div>
  )
}
