import { useMemo, useState } from 'react'
import { Pencil, Plus, Printer } from 'lucide-react'
import { DOC_TYPE_LABEL, quotePayment, type QuoteDoc } from '../lib/quotes'
import { creditPayment, type CreditDoc } from '../lib/credits'
import { dt } from '../lib/format'
import { Modal } from './ui'

interface Row { client: string; ownerName: string; docLabel: string; docNumber: string; dateKey: string; dateLabel: string; total: number; paid: number; balance: number; creditRef?: CreditDoc }
interface ClientGroup { client: string; rows: Row[]; total: number; paid: number; balance: number }

/** Regroupe par client (nom normalise : sans accents/casse/espaces superflus), pour fusionner les commandes (BL/facture)
 * et les credits ajoutes manuellement portant le meme nom de client sous un seul total. */
const normClient = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

function groupByClient(rows: Row[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>()
  for (const r of rows) {
    const key = normClient(r.client) || '—'
    let g = map.get(key)
    if (!g) { g = { client: r.client, rows: [], total: 0, paid: 0, balance: 0 }; map.set(key, g) }
    g.rows.push(r)
    g.total += r.total; g.paid += r.paid; g.balance += r.balance
  }
  return [...map.values()]
    .map(g => ({ ...g, rows: g.rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey)) }))
    .sort((a, b) => b.balance - a.balance)
}

interface Props {
  quotes: QuoteDoc[]
  credits: CreditDoc[]
  from?: string
  to?: string
  /** Affiche les actions d'ajout/modification de credit (reservees a l'admin). */
  admin?: boolean
  onAddCredit?: (initialClient?: string) => void
  onEditCredit?: (credit: CreditDoc) => void
}

/** Contenu du rapport de credit : toutes les commandes et credits non soldes, filtres par la plage de dates choisie.
 * Par defaut (aucune date passee), couvre tout l'historique — comme le bouton « Credit » de la liste des devis. */
export function CreditReportContent({ quotes, credits, from: initialFrom, to: initialTo, admin, onAddCredit, onEditCredit }: Props) {
  const [from, setFrom] = useState(initialFrom ?? '')
  const [to, setTo] = useState(initialTo ?? '')

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const q of quotes) {
      if (q.status !== 'valide') continue
      const pay = quotePayment(q)
      if (pay.state === 'paye') continue
      const d = q.createdAt?.toDate()
      if (!d) continue
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (from && dateKey < from) continue
      if (to && dateKey > to) continue
      const type = q.docType ?? 'devis'
      const number = type === 'devis' || !q.docNumber ? q.number : q.docNumber
      out.push({ client: q.client || '—', ownerName: q.ownerName || q.ownerEmail, docLabel: DOC_TYPE_LABEL[type], docNumber: number, dateKey, dateLabel: d.toLocaleDateString('fr-FR'), total: pay.due, paid: pay.paid, balance: pay.balance })
    }
    // Les credits ajoutes manuellement sont toujours inclus, meme sans BL/facture correspondant pour ce client :
    // ils forment alors leur propre groupe (cree par nom de client lors du regroupement ci-dessous).
    for (const c of credits) {
      const pay = creditPayment(c)
      if (pay.state === 'paye') continue
      const dateKey = c.docDate || ''
      if (from && dateKey < from) continue
      if (to && dateKey > to) continue
      out.push({ client: c.client, ownerName: c.ownerName, docLabel: 'Credit', docNumber: c.ref || '—', dateKey, dateLabel: dateKey ? new Date(dateKey + 'T12:00:00').toLocaleDateString('fr-FR') : '—', total: c.amount, paid: pay.paid, balance: pay.balance, creditRef: c })
    }
    return out.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }, [quotes, credits, from, to])

  const total = rows.reduce((s, r) => s + r.total, 0)
  const paidTotal = rows.reduce((s, r) => s + r.paid, 0)
  const balanceTotal = rows.reduce((s, r) => s + r.balance, 0)
  const groups = useMemo(() => groupByClient(rows), [rows])
  const clientCount = groups.length
  const periodLabel = from && to ? (from === to ? new Date(from + 'T12:00:00').toLocaleDateString('fr-FR') : `du ${new Date(from + 'T12:00:00').toLocaleDateString('fr-FR')} au ${new Date(to + 'T12:00:00').toLocaleDateString('fr-FR')}`)
    : from ? `a partir du ${new Date(from + 'T12:00:00').toLocaleDateString('fr-FR')}`
    : to ? `jusqu'au ${new Date(to + 'T12:00:00').toLocaleDateString('fr-FR')}`
    : 'toutes dates confondues'

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          Du
          <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          au
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
        </label>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }} className="text-xs font-bold text-teal-dark underline">Toutes dates</button>
        )}
        {admin && onAddCredit && (
          <button onClick={() => onAddCredit()} className="no-print flex items-center gap-1.5 rounded-xl border border-teal px-3 py-2 text-xs font-bold text-teal-dark hover:bg-teal/10"><Plus size={14} /> Ajouter un credit</button>
        )}
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:opacity-90"><Printer size={15} /> Imprimer</button>
      </div>

      <div className="print-area">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="text-lg font-extrabold text-navy">Rapport de credit</div>
            <div className="text-sm capitalize text-slate-500">{periodLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reste a encaisser</div>
            <div className="text-2xl font-extrabold text-red-600">{dt(balanceTotal)}</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">Aucun credit sur cette periode.</div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.client} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                  <div className="text-sm font-extrabold text-navy">{g.client}</div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total du par ce client</div>
                      <div className="text-base font-extrabold text-red-600">{dt(g.balance)}</div>
                    </div>
                    {admin && onAddCredit && (
                      <button onClick={() => onAddCredit(g.client)} title="Ajouter un credit pour ce client"
                        className="no-print rounded-lg border border-slate-200 bg-white p-1.5 text-teal-dark hover:bg-teal/10"><Plus size={14} /></button>
                    )}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-1.5 font-semibold">Commercial</th>
                      <th className="px-4 py-1.5 font-semibold">Document</th>
                      <th className="px-4 py-1.5 font-semibold">Date</th>
                      <th className="px-4 py-1.5 text-right font-semibold">Total</th>
                      <th className="px-4 py-1.5 text-right font-semibold">Paye</th>
                      <th className="px-4 py-1.5 text-right font-semibold">Reste</th>
                      {admin && <th className="no-print px-4 py-1.5" />}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-600">{r.ownerName}</td>
                        <td className="px-4 py-2 text-slate-600">{r.docLabel} <span className="text-slate-400">{r.docNumber}</span></td>
                        <td className="px-4 py-2 text-slate-500">{r.dateLabel}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{dt(r.total)}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{dt(r.paid)}</td>
                        <td className="px-4 py-2 text-right font-bold text-red-600">{dt(r.balance)}</td>
                        {admin && (
                          <td className="no-print px-4 py-2 text-right">
                            {r.creditRef && onEditCredit && (
                              <button onClick={() => onEditCredit(r.creditRef as CreditDoc)} title="Modifier ce credit"
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={13} /></button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {g.rows.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                        <td className="px-4 py-2 font-bold text-navy" colSpan={3}>{g.rows.length} documents non soldes</td>
                        <td className="px-4 py-2 text-right font-bold text-navy">{dt(g.total)}</td>
                        <td className="px-4 py-2 text-right font-bold text-navy">{dt(g.paid)}</td>
                        <td className="px-4 py-2 text-right font-extrabold text-red-600">{dt(g.balance)}</td>
                        {admin && <td className="no-print" />}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-2xl border-2 border-navy bg-slate-50 px-4 py-3">
              <div className="text-sm font-bold text-navy">{rows.length} document{rows.length > 1 ? 's' : ''} — {clientCount} client{clientCount > 1 ? 's' : ''}</div>
              <div className="flex gap-6 text-right">
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</div><div className="text-sm font-bold text-navy">{dt(total)}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Paye</div><div className="text-sm font-bold text-navy">{dt(paidTotal)}</div></div>
                <div><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reste</div><div className="text-base font-extrabold text-red-600">{dt(balanceTotal)}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Rapport de credit en modale : commandes et credits non soldes, filtrables par plage de dates (toutes dates par defaut). */
export function CreditReportModal({ quotes, credits, from, to, admin, onAddCredit, onEditCredit, onClose }: Props & { onClose: () => void }) {
  return (
    <Modal title="Rapport de credit" onClose={onClose} wide printable>
      <div className="space-y-4">
        <CreditReportContent quotes={quotes} credits={credits} from={from} to={to} admin={admin} onAddCredit={onAddCredit} onEditCredit={onEditCredit} />
        <div className="no-print flex justify-end"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Fermer</button></div>
      </div>
    </Modal>
  )
}
