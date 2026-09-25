import { useMemo, useState } from 'react'
import { ImagePlus, Layers, PackagePlus, Plus, Trash2, X } from 'lucide-react'
import { categories, childrenOf, topCategories } from '../lib/catalogue'
import { isCustomId, newProductId, resizeImage, saveProduct, type ProductRow } from '../lib/products'
import { dt } from '../lib/format'
import { useSettings } from '../store/settings'
import type { Variant } from '../types'
import { Field, Modal, inputCls } from './ui'

const MAX_PHOTOS = 5
const MAX_CHARS = 850_000 // un document Firestore est limite a 1 Mo

interface VariantRow { label: string; price: string; code: string }

const toRows = (vs: Variant[]): VariantRow[] =>
  vs.length ? vs.map(v => ({ label: v.label, price: v.price != null ? String(v.price) : '', code: v.code ?? '' })) : [{ label: 'Standard', price: '', code: '' }]

const emptyRow = (): VariantRow => ({ label: '', price: '', code: '' })

/**
 * Ajout / modification d'articles par l'admin.
 * Deux modes : « Nouvel article » (fiche complete + photos) ou « Nouvelles dimensions » ajoutees a un article existant
 * (ex : une nouvelle dimension pour Matelas Mousse 28/30).
 */
export function ArticleFormModal({ initial, defaultCategoryId, onClose }: { initial?: ProductRow; defaultCategoryId?: string | null; onClose: () => void }) {
  const { settings, save, articles, products } = useSettings()
  const [mode, setMode] = useState<'new' | 'variants'>('new')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? defaultCategoryId ?? (childrenOf(topCategories[0].id)[0]?.id ?? topCategories[0].id))
  const [targetId, setTargetId] = useState('')
  const [name, setName] = useState(initial?.name ?? '')
  const [desc, setDesc] = useState(initial?.desc ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [rows, setRows] = useState<VariantRow[]>(initial ? toRows(initial.variants) : [mode === 'new' ? { label: 'Standard', price: '', code: '' } : emptyRow()])
  const [images, setImages] = useState<string[]>(initial?.images ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const inCategory = useMemo(() => articles.filter(a => a.categoryId === categoryId), [articles, categoryId])
  const target = inCategory.find(a => a.id === targetId) ?? null

  const patch = (i: number, p: Partial<VariantRow>) => setRows(rs => rs.map((r, k) => (k === i ? { ...r, ...p } : r)))

  const switchMode = (m: 'new' | 'variants') => {
    setMode(m); setError('')
    setRows([m === 'new' ? { label: 'Standard', price: '', code: '' } : emptyRow()])
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setError('')
    const room = MAX_PHOTOS - images.length
    try {
      const added = await Promise.all([...files].slice(0, room).map(f => resizeImage(f)))
      setImages(imgs => [...imgs, ...added])
    } catch { setError("Une photo n'a pas pu etre lue.") }
  }

  const parseVariants = (): Variant[] =>
    rows
      .filter(r => r.label.trim() || r.price.trim())
      .map(r => {
        const price = parseFloat(r.price.replace(',', '.'))
        const v: Variant = { label: r.label.trim() || 'Standard', price: Number.isNaN(price) ? null : price }
        if (r.code.trim()) v.code = r.code.trim()
        return v
      })

  const submit = async () => {
    setError('')
    const variants = parseVariants()
    if (!variants.length) return setError('Ajoutez au moins une variante (avec son prix).')

    if (mode === 'variants') {
      if (!target) return setError("Choisissez l'article auquel ajouter ces dimensions.")
      const taken = new Set(target.variants.map(v => v.label.trim().toLowerCase()))
      const dup = variants.find(v => taken.has(v.label.trim().toLowerCase()) || variants.filter(w => w.label.trim().toLowerCase() === v.label.trim().toLowerCase()).length > 1)
      if (dup) return setError(`La variante « ${dup.label} » existe deja pour cet article.`)
      setBusy(true)
      try {
        if (isCustomId(target.id)) {
          const p = products.find(x => x.id === target.id.slice(7))
          if (!p) throw new Error('missing')
          await saveProduct(p.id, { name: p.name, desc: p.desc, categoryId: p.categoryId, unit: p.unit, images: p.images, variants: [...p.variants, ...variants] })
        } else {
          await save({ ...settings, extraVariants: { ...settings.extraVariants, [target.id]: [...(settings.extraVariants?.[target.id] ?? []), ...variants] } })
        }
        onClose()
      } catch {
        setError('Enregistrement impossible. Verifiez la connexion et les regles Firestore.')
        setBusy(false)
      }
      return
    }

    if (!name.trim()) return setError("Le nom de l'article est obligatoire.")
    if (images.join('').length > MAX_CHARS) return setError('Photos trop lourdes : retirez-en une ou deux.')
    setBusy(true)
    try {
      await saveProduct(initial?.id ?? newProductId(), { name: name.trim(), desc: desc.trim(), categoryId, unit: unit.trim(), variants, images })
      onClose()
    } catch {
      setError('Enregistrement impossible. Verifiez la connexion et les regles Firestore (collection products).')
      setBusy(false)
    }
  }

  const variantRows = (
    <div>
      <div className="mb-1 text-xs font-semibold text-slate-600">{mode === 'variants' ? 'Nouvelles dimensions / variantes et prix TTC (DT)' : 'Variantes et prix TTC (DT)'}</div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={inputCls} value={r.label} onChange={e => patch(i, { label: e.target.value })} placeholder={mode === 'variants' ? 'Dimension (ex : 190×80×14 cm)' : 'Variante (ex : 10 cm, Noir...)'} />
            <input className={inputCls + ' max-w-[130px] text-right'} value={r.price} onChange={e => patch(i, { price: e.target.value })} placeholder="Prix DT" inputMode="decimal" />
            <input className={inputCls + ' max-w-[130px]'} value={r.code} onChange={e => patch(i, { code: e.target.value })} placeholder="Ref." />
            <button onClick={() => setRows(rs => (rs.length > 1 ? rs.filter((_, k) => k !== i) : rs))} className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <button onClick={() => setRows(rs => [...rs, emptyRow()])} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-teal-dark"><Plus size={14} /> Ajouter une variante</button>
      <div className="mt-1 text-[11px] text-slate-400">Laissez le prix vide pour afficher « Sur devis ».</div>
    </div>
  )

  return (
    <Modal title={initial ? "Modifier l'article" : 'Ajouter au catalogue'} onClose={onClose} wide>
      <div className="space-y-4">
        {!initial && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => switchMode('new')} className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left ${mode === 'new' ? 'border-teal bg-teal/10' : 'border-slate-200 hover:bg-slate-50'}`}>
              <PackagePlus size={20} className={mode === 'new' ? 'text-teal-dark' : 'text-slate-400'} />
              <div><div className="text-sm font-bold text-navy">Nouvel article</div><div className="text-xs text-slate-500">Une nouvelle fiche avec photos</div></div>
            </button>
            <button onClick={() => switchMode('variants')} className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left ${mode === 'variants' ? 'border-teal bg-teal/10' : 'border-slate-200 hover:bg-slate-50'}`}>
              <Layers size={20} className={mode === 'variants' ? 'text-teal-dark' : 'text-slate-400'} />
              <div><div className="text-sm font-bold text-navy">Nouvelles dimensions</div><div className="text-xs text-slate-500">A un article existant (ex : mousse 28/30)</div></div>
            </button>
          </div>
        )}

        <Field label="Categorie *">
          <select className={inputCls} value={categoryId} onChange={e => { setCategoryId(e.target.value); setTargetId('') }}>
            {topCategories.map(t => {
              const kids = childrenOf(t.id)
              return kids.length ? (
                <optgroup key={t.id} label={`${t.icon} ${t.label}`}>
                  <option value={t.id}>{t.label} (general)</option>
                  {kids.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </optgroup>
              ) : <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            })}
            {!categories.some(c => c.id === categoryId) && <option value={categoryId}>{categoryId}</option>}
          </select>
        </Field>

        {mode === 'variants' && !initial ? (
          <>
            <Field label="Article existant *">
              <select className={inputCls} value={targetId} onChange={e => setTargetId(e.target.value)}>
                <option value="">{inCategory.length ? 'Choisir dans cette categorie...' : 'Aucun article dans cette categorie'}</option>
                {inCategory.map(a => <option key={a.id} value={a.id}>{a.name} ({a.variants.length} variante{a.variants.length > 1 ? 's' : ''})</option>)}
              </select>
            </Field>
            {target && (
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="mb-1 text-xs font-semibold text-slate-600">Deja dans « {target.name} » :</div>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {target.variants.map(v => (
                    <span key={v.label} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">{v.label} — {dt(v.price)}</span>
                  ))}
                </div>
              </div>
            )}
            {variantRows}
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2"><Field label="Nom de l'article *"><input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Sabot Bois SL010" /></Field></div>
              <Field label="Unite (optionnel)"><input className={inputCls} value={unit} onChange={e => setUnit(e.target.value)} placeholder="piece, m, kg..." /></Field>
            </div>
            <Field label="Description (optionnel)"><textarea rows={2} className={inputCls} value={desc} onChange={e => setDesc(e.target.value)} /></Field>
            {variantRows}
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-600">Photos ({images.length}/{MAX_PHOTOS}) — la premiere sert de photo principale</div>
              <div className="flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setImages(imgs => imgs.filter((_, k) => k !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button>
                  </div>
                ))}
                {images.length < MAX_PHOTOS && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
                    <ImagePlus size={20} /> Ajouter
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
                  </label>
                )}
              </div>
            </div>
          </>
        )}

        <p className="rounded-lg bg-teal/10 px-3 py-2 text-xs text-slate-600">Visible immediatement dans votre application et chez les commerciaux, <b>pas sur le site officiel</b>.</p>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
          <button onClick={submit} disabled={busy} className="rounded-xl bg-navy px-6 py-2 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Enregistrement...' : 'Enregistrer et publier'}</button>
        </div>
      </div>
    </Modal>
  )
}
