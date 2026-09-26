import { useState } from 'react'
import { Pencil, RotateCcw, Save } from 'lucide-react'
import { articles as baseArticles } from '../lib/catalogue'
import { useSettings } from '../store/settings'
import type { Article } from '../types'
import { inputCls } from './ui'

/** Modification du nom et de la description d'un article du catalogue (application bureau admin ; le site officiel n'est pas touche). */
export function ArticleInfoEditor({ article }: { article: Article }) {
  const { settings, save } = useSettings()
  const base = baseArticles.find(a => a.id === article.id)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(article.name)
  const [desc, setDesc] = useState(article.desc ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const edited = !!settings.edits?.[article.id]

  if (!base) return null

  const write = async (edits: NonNullable<typeof settings.edits>, text: string) => {
    setBusy(true); setMsg(null)
    try { await save({ ...settings, edits }); setMsg({ ok: true, text }) } catch { setMsg({ ok: false, text: "Echec de l'enregistrement." }) } finally { setBusy(false) }
  }

  const submit = () => {
    const n = name.trim()
    if (!n) return setMsg({ ok: false, text: 'Le nom ne peut pas etre vide.' })
    const d = desc.trim()
    const patch: { name?: string; desc?: string } = {}
    if (n !== base.name) patch.name = n
    if (d !== (base.desc ?? '')) patch.desc = d
    const edits = { ...(settings.edits ?? {}) }
    if (Object.keys(patch).length) edits[article.id] = patch; else delete edits[article.id]
    return write(edits, 'Enregistre. Les commerciaux voient le changement immediatement.')
  }

  const reset = () => {
    setName(base.name); setDesc(base.desc ?? '')
    const edits = { ...(settings.edits ?? {}) }
    delete edits[article.id]
    return write(edits, 'Nom et description du site retablis.')
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-teal/50 bg-teal/5 p-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-teal-dark">Admin : nom et description</h3>
        {edited && <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal-dark">Modifie</span>}
        <button onClick={() => setOpen(o => !o)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
          <Pencil size={13} /> {open ? 'Fermer' : 'Modifier'}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-semibold text-slate-600">Nom de l&apos;article
            <input className={inputCls + ' mt-1'} value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Description
            <textarea className={inputCls + ' mt-1 min-h-20'} value={desc} onChange={e => setDesc(e.target.value)} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={submit} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><Save size={14} /> Enregistrer</button>
            <button onClick={reset} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><RotateCcw size={14} /> Nom du site</button>
            {msg && <span className={`text-xs font-medium ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
