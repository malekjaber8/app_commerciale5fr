import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, EyeOff, Save } from 'lucide-react'
import { articles as baseArticles } from '../../lib/catalogue'
import { dt } from '../../lib/format'
import { useSettings } from '../../store/settings'
import type { Settings } from '../../types'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function ContentTab() {
  const { settings, save } = useSettings()
  const [draft, setDraft] = useState<Settings>(() => JSON.parse(JSON.stringify(settings)))
  const [query, setQuery] = useState('')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const hidden = useMemo(() => new Set(draft.hiddenIds), [draft.hiddenIds])

  const list = useMemo(() => {
    const q = norm(query.trim())
    return baseArticles.filter(a => {
      if (onlyChanged && !hidden.has(a.id) && !draft.priceOverrides[a.id]) return false
      return !q || norm(`${a.name} ${a.id}`).includes(q)
    })
  }, [query, onlyChanged, hidden, draft.priceOverrides])

  const toggleHidden = (id: string) => setDraft(d => ({
    ...d,
    hiddenIds: d.hiddenIds.includes(id) ? d.hiddenIds.filter(x => x !== id) : [...d.hiddenIds, id],
  }))

  const setPrice = (id: string, label: string, base: number | null, raw: string) => setDraft(d => {
    const po = { ...d.priceOverrides }
    const cur = { ...(po[id] || {}) }
    const val = parseFloat(raw.replace(',', '.'))
    if (raw.trim() === '' || Number.isNaN(val) || val === base) delete cur[label]
    else cur[label] = val
    if (Object.keys(cur).length) po[id] = cur; else delete po[id]
    return { ...d, priceOverrides: po }
  })

  const persist = async () => {
    setSaving(true); setMsg(null)
    try {
      await save({ ...draft, maxDiscountPct: Math.min(100, Math.max(0, draft.maxDiscountPct || 0)) })
      setMsg({ ok: true, text: 'Reglages enregistres. Les commerciaux voient les changements immediatement.' })
    } catch {
      setMsg({ ok: false, text: 'Echec de l\'enregistrement. Verifiez les regles Firestore.' })
    } finally { setSaving(false) }
  }

  const changes = draft.hiddenIds.length + Object.keys(draft.priceOverrides).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Remise maximale autorisee (%)
          <input type="number" min={0} max={100} value={draft.maxDiscountPct}
            onChange={e => setDraft(d => ({ ...d, maxDiscountPct: parseFloat(e.target.value) || 0 }))}
            className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal" />
        </label>
        <div className="text-xs text-slate-500">{draft.hiddenIds.length} article(s) masque(s), {Object.keys(draft.priceOverrides).length} prix ajuste(s)</div>
        <button onClick={persist} disabled={saving} className="ml-auto flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {msg && <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un article..."
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyChanged} onChange={e => setOnlyChanged(e.target.checked)} className="accent-teal" />
          Seulement les modifies ({changes})
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {list.slice(0, 200).map(a => {
          const isHidden = hidden.has(a.id)
          const open = openId === a.id
          const ov = draft.priceOverrides[a.id]
          return (
            <div key={a.id} className="border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => setOpenId(open ? null : a.id)} className="text-slate-400">
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${isHidden ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{a.name}</div>
                  <div className="text-[11px] text-slate-400">{a.id}{ov ? ' — prix ajuste' : ''}</div>
                </div>
                <button onClick={() => toggleHidden(a.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${isHidden ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {isHidden ? <><EyeOff size={14} /> Masque</> : <><Eye size={14} /> Visible</>}
                </button>
              </div>
              {open && (
                <div className="bg-slate-50 px-12 pb-3">
                  <div className="mb-1 text-[11px] text-slate-400">Laissez vide pour garder le prix du site.</div>
                  {a.variants.map(v => (
                    <div key={v.label} className="flex items-center gap-3 py-1 text-sm">
                      <div className="flex-1 truncate text-slate-700">{v.label}</div>
                      <div className="w-28 text-right text-xs text-slate-400">Site : {dt(v.price)}</div>
                      <input defaultValue={ov?.[v.label] ?? ''} placeholder="Prix DT"
                        onBlur={e => setPrice(a.id, v.label, v.price, e.target.value)}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-teal" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {list.length > 200 && <div className="p-3 text-center text-xs text-slate-400">200 premiers resultats affiches sur {list.length} — affinez la recherche.</div>}
        {list.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Aucun article.</div>}
      </div>
    </div>
  )
}
