import { useState } from 'react'
import { Eye, EyeOff, RotateCcw, Save, Trash2 } from 'lucide-react'
import { articles as baseArticles } from '../lib/catalogue'
import { dt } from '../lib/format'
import { useSettings } from '../store/settings'
import type { Article } from '../types'

/** Edition directe des prix (et de la visibilite) d'un article, reservee a l'application bureau admin. */
export function AdminPriceEditor({ article }: { article: Article }) {
  const { settings, save } = useSettings()
  const base = baseArticles.find(a => a.id === article.id)
  const ov = settings.priceOverrides[article.id] || {}
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(article.variants.map(v => [v.label, v.price != null ? String(v.price) : ''])))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const isHidden = settings.hiddenIds.includes(article.id)
  const extras = settings.extraVariants?.[article.id] ?? []

  if (!base) return null

  const write = async (next: typeof settings, text: string) => {
    setBusy(true); setMsg(null)
    try { await save(next); setMsg({ ok: true, text }) } catch { setMsg({ ok: false, text: 'Echec de l\'enregistrement.' }) } finally { setBusy(false) }
  }

  const savePrices = () => {
    const cur: Record<string, number> = {}
    for (const bv of base.variants) {
      const raw = (vals[bv.label] ?? '').trim().replace(',', '.')
      const val = parseFloat(raw)
      if (raw !== '' && !Number.isNaN(val) && val !== bv.price) cur[bv.label] = val
    }
    const po = { ...settings.priceOverrides }
    if (Object.keys(cur).length) po[article.id] = cur; else delete po[article.id]
    return write({ ...settings, priceOverrides: po }, 'Prix enregistres. Les commerciaux voient le changement immediatement.')
  }

  const reset = () => {
    setVals(Object.fromEntries(base.variants.map(v => [v.label, v.price != null ? String(v.price) : ''])))
    const po = { ...settings.priceOverrides }
    delete po[article.id]
    return write({ ...settings, priceOverrides: po }, 'Prix du site retablis.')
  }

  const writeExtras = (next: typeof extras, text: string) => {
    const ev = { ...settings.extraVariants }
    if (next.length) ev[article.id] = next; else delete ev[article.id]
    return write({ ...settings, extraVariants: ev }, text)
  }
  const editExtraPrice = (label: string, raw: string) => {
    const price = parseFloat(raw.replace(',', '.'))
    const next = extras.map(v => (v.label === label ? { ...v, price: raw.trim() === '' || Number.isNaN(price) ? null : price } : v))
    return writeExtras(next, 'Prix de la variante enregistre.')
  }

  const toggleHidden = () => write({
    ...settings,
    hiddenIds: isHidden ? settings.hiddenIds.filter(x => x !== article.id) : [...settings.hiddenIds, article.id],
  }, isHidden ? 'Article de nouveau visible pour les commerciaux.' : 'Article masque pour les commerciaux.')

  return (
    <div className="rounded-xl border-2 border-dashed border-teal/50 bg-teal/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-teal-dark">Admin : modifier les prix</h3>
        <button onClick={toggleHidden} disabled={busy}
          className={`ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${isHidden ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
          {isHidden ? <><EyeOff size={13} /> Masque</> : <><Eye size={13} /> Visible</>}
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto">
        {base.variants.map(v => (
          <div key={v.label} className="flex items-center gap-2 py-1 text-sm">
            <div className="flex-1 truncate text-slate-700">{v.label}</div>
            <div className="w-24 text-right text-[11px] text-slate-400">Site : {dt(v.price)}</div>
            <input value={vals[v.label] ?? ''} onChange={e => setVals(s => ({ ...s, [v.label]: e.target.value }))} placeholder="DT"
              className={`w-24 rounded-lg border bg-white px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-teal ${ov[v.label] != null ? 'border-teal' : 'border-slate-200'}`} />
          </div>
        ))}
      </div>
      {extras.length > 0 && (
        <div className="mt-3 border-t border-teal/30 pt-2">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-teal-dark">Variantes ajoutees par vous</div>
          {extras.map(v => (
            <div key={v.label} className="flex items-center gap-2 py-1 text-sm">
              <div className="flex-1 truncate text-slate-700">{v.label}</div>
              <input defaultValue={v.price ?? ''} placeholder="Prix DT" onBlur={e => editExtraPrice(v.label, e.target.value)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-teal" />
              <button title="Supprimer cette variante" disabled={busy}
                onClick={() => { if (confirm(`Supprimer la variante « ${v.label} » ?`)) writeExtras(extras.filter(x => x.label !== v.label), 'Variante supprimee.') }}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button onClick={savePrices} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><Save size={14} /> Enregistrer les prix</button>
        <button onClick={reset} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><RotateCcw size={14} /> Prix du site</button>
        {msg && <span className={`text-xs font-medium ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  )
}
