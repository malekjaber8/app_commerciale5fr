import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, FileSpreadsheet, Loader2, Search, Upload, X } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useQuote } from '../store/quote'
import { dt } from '../lib/format'
import { Modal, inputCls } from './ui'
import { bestMatch, buildCatalogueOptions, parseInvoiceRows, MATCH_THRESHOLD, type CatalogueOption, type ParsedLine } from '../lib/importOrder'

interface ReviewRow {
  id: string
  parsed: ParsedLine
  query: string
  selected: CatalogueOption | null
  score: number
  skip: boolean
}

const confidenceStyle = (score: number, hasSelection: boolean) => {
  if (!hasSelection) return { label: 'Aucune correspondance — choisissez un article', cls: 'border-red-300 bg-red-50' }
  if (score >= 0.6) return { label: 'Correspondance probable', cls: 'border-green-300 bg-green-50' }
  if (score >= MATCH_THRESHOLD) return { label: 'À vérifier', cls: 'border-amber-300 bg-amber-50' }
  return { label: 'Faible confiance — à vérifier', cls: 'border-amber-300 bg-amber-50' }
}

/** Import d'une commande depuis un fichier Excel/CSV : parse les lignes, propose une correspondance catalogue
 * par ligne (a verifier/corriger), puis ajoute les lignes confirmees au panier comme un ajout manuel. */
export function ImportOrderModal({ onClose }: { onClose: () => void }) {
  const { articles } = useSettings()
  const { add } = useQuote()
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [openRow, setOpenRow] = useState<string | null>(null)

  const options = useMemo(() => buildCatalogueOptions(articles), [articles])

  const onFile = async (file: File) => {
    setFileName(file.name)
    setError('')
    setLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][]
      const parsed = parseInvoiceRows(matrix)
      if (parsed.length === 0) { setError("Aucune ligne d'article reconnue dans ce fichier."); setRows(null); return }
      setRows(parsed.map((p, i) => {
        const m = bestMatch(p.designation, options)
        const selected = m && m.score >= MATCH_THRESHOLD ? m.option : null
        return {
          id: `${i}-${p.code ?? p.designation}`,
          parsed: p,
          query: selected ? `${selected.name} — ${selected.variant}` : p.designation,
          selected,
          score: m?.score ?? 0,
          skip: false,
        }
      }))
    } catch {
      setError("Impossible de lire ce fichier. Verifiez qu'il s'agit bien d'un fichier Excel (.xls/.xlsx) ou CSV.")
      setRows(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredOptions = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter(o => `${o.name} ${o.variant}`.toLowerCase().includes(q)).slice(0, 8)
  }

  const setRow = (id: string, patch: Partial<ReviewRow>) => setRows(prev => prev && prev.map(r => r.id === id ? { ...r, ...patch } : r))

  const activeRows = (rows ?? []).filter(r => !r.skip)
  const readyCount = activeRows.filter(r => r.selected).length
  const canImport = rows !== null && activeRows.length > 0 && readyCount === activeRows.length

  const doImport = () => {
    if (!rows) return
    for (const r of rows) {
      if (r.skip || !r.selected) continue
      add({ articleId: r.selected.articleId, name: r.selected.name, variant: r.selected.variant, unitPrice: r.selected.unitPrice, qty: r.parsed.qty })
    }
    onClose()
  }

  return (
    <Modal title="Importer une commande" onClose={onClose} wide>
      <div className="space-y-4">
        {!rows && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center">
            <FileSpreadsheet size={36} className="text-slate-300" />
            <p className="text-sm text-slate-500">Choisissez un fichier Excel (.xls, .xlsx) ou CSV contenant la liste des articles de la commande.</p>
            <input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            <button onClick={() => fileInput.current?.click()} disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {loading ? 'Lecture...' : 'Choisir un fichier'}
            </button>
            {fileName && !loading && <p className="text-xs text-slate-400">{fileName}</p>}
            {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"><AlertTriangle size={14} /> {error}</div>}
          </div>
        )}

        {rows && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-slate-500">{fileName} — {rows.length} ligne{rows.length > 1 ? 's' : ''} detectee{rows.length > 1 ? 's' : ''}</div>
              <button onClick={() => { setRows(null); setFileName(''); setError('') }} className="text-xs font-bold text-teal-dark underline">Choisir un autre fichier</button>
            </div>

            <div className="space-y-2">
              {rows.map(r => {
                const conf = confidenceStyle(r.score, !!r.selected)
                return (
                  <div key={r.id} className={`rounded-xl border p-3 ${r.skip ? 'border-slate-200 bg-slate-50 opacity-60' : conf.cls}`}>
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-navy">{r.parsed.designation}</div>
                        <div className="text-xs text-slate-500">
                          {r.parsed.code && <>Code fichier {r.parsed.code} — </>}
                          Qté {r.parsed.qty} — Prix fichier (HT) {dt(r.parsed.filePriceHT)}
                        </div>
                        {!r.skip && <div className="mt-1 text-[11px] font-semibold text-slate-500">{conf.label}</div>}
                      </div>
                      <button onClick={() => setRow(r.id, { skip: !r.skip })}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                        {r.skip ? 'Reactiver' : 'Ignorer'}
                      </button>
                    </div>

                    {!r.skip && r.selected && openRow !== r.id && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                          <Check size={15} className="shrink-0 text-green-600" />
                          <span className="min-w-0 truncate font-semibold text-slate-700">{r.selected.name} <span className="text-slate-400">— {r.selected.variant}</span></span>
                          <span className="shrink-0 font-bold text-navy">{dt(r.selected.unitPrice)}</span>
                        </div>
                        <button onClick={() => setOpenRow(r.id)} className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal-dark hover:bg-slate-50">Changer</button>
                      </div>
                    )}

                    {!r.skip && (!r.selected || openRow === r.id) && (
                      <div className="mt-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            autoFocus={openRow === r.id}
                            value={r.query}
                            onChange={e => { setOpenRow(r.id); setRow(r.id, { query: e.target.value, selected: null }) }}
                            placeholder="Tapez le nom de l'article du catalogue..."
                            className={inputCls + ' pl-8 text-sm'} />
                        </div>
                        <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                          {filteredOptions(r.query).map(o => (
                            <button key={o.key} onClick={() => setRow(r.id, { selected: o, query: `${o.name} — ${o.variant}` })}
                              className="flex w-full items-center justify-between gap-2 border-b border-slate-50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-teal/10">
                              <span className="min-w-0 truncate text-slate-700">{o.name} <span className="text-slate-400">— {o.variant}</span></span>
                              <span className="shrink-0 font-bold text-navy">{dt(o.unitPrice)}</span>
                            </button>
                          ))}
                          {filteredOptions(r.query).length === 0 && <div className="px-3 py-3 text-center text-xs text-slate-400">Aucun article trouve. Essayez un autre mot-cle.</div>}
                        </div>
                        {r.selected && (
                          <button onClick={() => setOpenRow(null)} className="mt-1 text-xs font-semibold text-slate-400 underline">Fermer sans changer</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!canImport && activeRows.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                <AlertTriangle size={14} /> Choisissez un article pour chaque ligne (ou ignorez-la) avant d&apos;importer.
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">{readyCount} / {activeRows.length} ligne{activeRows.length > 1 ? 's' : ''} prete{activeRows.length > 1 ? 's' : ''}</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
                <button onClick={doImport} disabled={!canImport}
                  className="flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                  <Upload size={15} /> Importer {activeRows.length > 0 ? `${activeRows.length} article${activeRows.length > 1 ? 's' : ''}` : ''}
                </button>
              </div>
            </div>
          </>
        )}

        {!rows && (
          <div className="flex justify-end"><button onClick={onClose} className="flex items-center gap-2 text-sm font-semibold text-slate-500"><X size={14} /> Fermer</button></div>
        )}
      </div>
    </Modal>
  )
}
