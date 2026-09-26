import { Printer, X } from 'lucide-react'
import type { InvoiceDoc } from '../types'
import { TVA_RATE } from '../lib/db'
import { dt } from '../lib/format'

/** Facture imprimable (Ctrl+P / bouton Imprimer -> PDF). */
export function InvoiceView({ invoice, onClose }: { invoice: InvoiceDoc; onClose: () => void }) {
  const date = invoice.createdAt ? invoice.createdAt.toDate().toLocaleDateString('fr-FR') : ''
  const rows = invoice.lines.map(l => {
    const puht = l.unitPrice / (1 + TVA_RATE)
    return { ...l, puht, mntHT: puht * l.qty }
  })

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-600/90 p-4">
      <div className="no-print mx-auto mb-3 flex max-w-3xl justify-end gap-2">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-sm font-bold text-navy"><Printer size={15} /> Imprimer / PDF</button>
        <button onClick={onClose} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700"><X size={15} /> Fermer</button>
      </div>

      <div className="print-area mx-auto max-w-3xl bg-white p-8 text-[13px] text-slate-800 shadow-xl">
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="" className="h-16" />
          <div className="text-right">
            <div className="text-base font-extrabold uppercase">Societe Magasin Les Cinq Freres</div>
            <div className="text-xs font-semibold">Vente produits divers</div>
            <div className="text-[11px] text-slate-600">Avenue Fatouma Bourguiba, La Soukra - 2073 Ariana</div>
            <div className="text-[11px] text-slate-600">TVA : 1544770 SAM 002 | Tel : 29 94 01 86 / 72 58 87 17</div>
            <div className="text-[11px] text-slate-600">www.magasinlescinqfreres.com | contact.gt@smcf.tn</div>
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <div className="w-56 shrink-0 rounded border-2 border-slate-800 p-3 text-center">
            <div className="text-lg font-black tracking-wide">FACTURE</div>
            <div className="mt-1 text-xs">N&deg; <b>{invoice.number}</b></div>
            <div className="text-xs">Date : <b>{date}</b></div>
          </div>
          <div className="flex-1 rounded border border-slate-300 p-3">
            <div className="text-sm font-extrabold uppercase">{invoice.clientName}</div>
            {invoice.address && <div>{invoice.address}</div>}
            <div className="text-xs text-slate-600">
              {invoice.taxId && <>I.F. {invoice.taxId} &nbsp; </>}
              {invoice.phone && <>Tel {invoice.phone}</>}
            </div>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="border border-slate-600 p-1.5 text-left">Designation</th>
              <th className="border border-slate-600 p-1.5">Qte</th>
              <th className="border border-slate-600 p-1.5 text-right">P.U. HT</th>
              <th className="border border-slate-600 p-1.5 text-right">Mnt HT</th>
              <th className="border border-slate-600 p-1.5">TVA</th>
              <th className="border border-slate-600 p-1.5 text-right">P.U. TTC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border border-slate-300 p-1.5">{r.name}{r.variant && <em className="text-slate-500"> — {r.variant}</em>}</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold">{String(r.qty).replace('.', ',')}</td>
                <td className="border border-slate-300 p-1.5 text-right">{dt(r.puht)}</td>
                <td className="border border-slate-300 p-1.5 text-right font-semibold">{dt(r.mntHT)}</td>
                <td className="border border-slate-300 p-1.5 text-center">19.00</td>
                <td className="border border-slate-300 p-1.5 text-right">{dt(r.unitPrice)}</td>
              </tr>
            ))}
            {invoice.discount > 0 && (
              <tr className="bg-slate-50">
                <td className="border border-slate-300 p-1.5 font-semibold">Remise</td>
                <td className="border border-slate-300 p-1.5 text-center">1</td>
                <td className="border border-slate-300 p-1.5 text-right">-{dt(invoice.discount / (1 + TVA_RATE))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-semibold">-{dt(invoice.discount / (1 + TVA_RATE))}</td>
                <td className="border border-slate-300 p-1.5 text-center">19.00</td>
                <td className="border border-slate-300 p-1.5 text-right">-{dt(invoice.discount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 flex gap-4">
          <div className="flex-1 rounded border border-slate-300 p-3 text-xs">
            <div className="mb-1 font-bold">CACHET &amp; SIGNATURE</div>
            {invoice.note && <div className="mt-6 text-slate-600">{invoice.note}</div>}
          </div>
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between border-b border-slate-200 py-1"><span>TOTAL HT</span><b>{dt(invoice.totalHT)}</b></div>
            <div className="flex justify-between border-b border-slate-200 py-1"><span>T.V.A. 19%</span><b>{dt(invoice.tva)}</b></div>
            <div className="flex justify-between border-b border-slate-200 py-1"><span>TIMBRE FISCAL</span><b>{dt(invoice.timbre)}</b></div>
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-base font-black"><span>TOTAL T.T.C.</span><span>{dt(invoice.totalTTC)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
