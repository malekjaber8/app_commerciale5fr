import { useEffect, useState } from 'react'
import { doc as fsDoc, getDoc } from 'firebase/firestore'
import { Printer, X } from 'lucide-react'
import { db } from '../firebase'
import { TIMBRE, TVA_RATE } from '../lib/db'
import { useSettings } from '../store/settings'
import { isCustomId } from '../lib/products'
import type { Client, DocLine } from '../types'

export interface SalesDoc {
  kind: 'devis' | 'commande' | 'bon_livraison' | 'facture'
  number: string
  date: Date | null
  clientId?: string
  clientName: string
  phone: string
  ownerName: string
  lines: DocLine[]
  /** Remise TTC en DT. */
  discount: number
  discountPct: number
  note: string
}

const BLUE = '#14607f'
const TITLE = { devis: 'DEVIS', commande: 'BON DE COMMANDE', bon_livraison: 'BON DE LIVRAISON', facture: 'FACTURE' }

const num = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/** Devis / bon de commande imprimable, sur le modele du bon de livraison de la societe. */
export function SalesDocView({ doc, onClose }: { doc: SalesDoc; onClose: () => void }) {
  const [client, setClient] = useState<Client | null>(null)
  const { articles } = useSettings()

  // Feuille A4 sans marges navigateur, uniquement pendant l'affichage de ce document
  useEffect(() => {
    const st = document.createElement('style')
    st.textContent = '@page { size: A4; margin: 0; }'
    document.head.appendChild(st)
    return () => { st.remove() }
  }, [])

  useEffect(() => {
    if (!doc.clientId) return
    getDoc(fsDoc(db, 'clients', doc.clientId)).then(s => { if (s.exists()) setClient(s.data() as Client) }).catch(() => { /* sans fiche client */ })
  }, [doc.clientId])

  const rows = doc.lines.map(l => {
    const puht = l.unitPrice / (1 + TVA_RATE)
    const code = articles.find(a => a.id === l.articleId)?.variants.find(v => v.label === l.variant)?.code || (isCustomId(l.articleId) ? '' : l.articleId)
    return { ...l, code, puht, mntHT: puht * l.qty }
  })
  const subTTC = doc.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  const netTTC = subTTC - doc.discount
  const totalHT = subTTC / (1 + TVA_RATE)
  const discountHT = doc.discount / (1 + TVA_RATE)
  const netHT = netTTC / (1 + TVA_RATE)
  const tva = netTTC - netHT
  const timbre = doc.kind === 'facture' ? TIMBRE : 0

  const th = 'border border-slate-800 px-2 py-2 text-[13px] font-bold'
  const thS = 'border border-slate-800 px-1.5 py-1 text-[11px] font-bold'
  const td = 'border-x border-slate-800 px-2 py-2'

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-600/90 p-4">
      <div className="no-print mx-auto mb-3 flex max-w-4xl justify-end gap-2">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-sm font-bold text-navy"><Printer size={15} /> Imprimer / PDF</button>
        <button onClick={onClose} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700"><X size={15} /> Fermer</button>
      </div>

      <div className="print-area mx-auto flex max-w-4xl flex-col bg-white p-8 text-[12px] text-slate-900 shadow-xl" style={{ minHeight: '296mm', boxSizing: 'border-box' }}>
        <div className="flex items-start justify-between">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="" className="h-32" />
          <div className="text-right text-[15px] leading-snug" style={{ color: BLUE }}>
            <div className="text-2xl font-black uppercase">Societe Magasin Les Cinq Freres</div>
            <div>Vente produits divers</div>
            <div>Avenue Fatouma Bourguiba, La Soukra - 2073 Ariana</div>
            <div><b>TVA :</b> 1544770 SAM 002 &nbsp; <b>Tel :</b> 29 94 01 86 / 72 58 87 17</div>
            <div><b>Web:</b> www.magasinlescinqfreres.com / <b>e-mail:</b> contact.gt@smcf.tn</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border border-slate-800 px-3 py-2 text-[13px]">
          <span><b>COMMERCIAL :</b> {doc.ownerName || '-'}</span>
          <span><b>POINT DE VENTE :</b> ARIANA</span>
          <span>Page 1 / 1</span>
        </div>

        <div className="mt-3 flex gap-2 text-[14px]">
          <div className="w-[44%] shrink-0 border border-slate-800">
            <div className="p-3 text-center text-3xl" style={{ color: BLUE }}>{TITLE[doc.kind]}</div>
            <div className="flex justify-between px-3 pb-3">
              <div><div>Num&eacute;ro</div><div className="font-bold" style={{ color: BLUE }}>{doc.number}</div></div>
              <div className="text-right"><div>Date</div><div className="font-bold" style={{ color: BLUE }}>{doc.date ? doc.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</div></div>
            </div>
          </div>
          <div className="min-h-[130px] flex-1 border border-slate-800 p-3">
            <div className="text-lg font-black uppercase">{doc.clientName || '-'}</div>
            {client?.address && <div className="mt-1">{client.address}</div>}
            <div className="mt-3 flex justify-between text-[13px]">
              <span>{client?.taxId && <><b>I.F.</b> {client.taxId}</>}</span>
              <span>{(client?.phone || doc.phone) && <><b>TEL</b> {client?.phone || doc.phone}</>}</span>
            </div>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse border border-slate-800 text-[13px]">
          <thead>
            <tr>
              <th className={th + ' text-left'}>R&eacute;f&eacute;rence</th>
              <th className={th + ' text-left'}>D&eacute;signation</th>
              <th className={th}>Qt&eacute;</th>
              <th className={th + ' text-right'}>P.U. HT</th>
              <th className={th + ' text-right'}>Mnt H.T</th>
              <th className={th}>TVA</th>
              <th className={th + ' text-right'}>P.U. TTC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={td}>{r.code}</td>
                <td className={td}>{r.name}{r.variant && r.variant !== 'Standard' && <span> — {r.variant}</span>}</td>
                <td className={td + ' text-center font-bold'}>{r.qty}</td>
                <td className={td + ' text-right'}>{num(r.puht)}</td>
                <td className={td + ' text-right'}>{num(r.mntHT)}</td>
                <td className={td + ' text-center'}>19.00</td>
                <td className={td + ' text-right font-bold'}>{num(r.unitPrice)}</td>
              </tr>
            ))}
            <tr><td className="border-t border-slate-800" colSpan={7} /></tr>
          </tbody>
        </table>

        {/* espace libre : le pied de page (taxes, cachet, totaux) reste en bas de la feuille A4 */}
        <div className="min-h-8 flex-1" />

        <div className="mt-3 flex gap-2">
          <div className="w-[44%] shrink-0">
            <table className="w-full border-collapse border border-slate-800 text-[11px]">
              <thead>
                <tr><th className={thS + ' text-left'}>Taxe</th><th className={thS + ' text-right'}>Base</th><th className={thS + ' text-right'}>Montant</th></tr>
              </thead>
              <tbody>
                <tr><td className="px-1.5 py-1 font-bold">19.00</td><td className="px-1.5 py-1 text-right">{num(netHT)}</td><td className="px-1.5 py-1 text-right">{num(tva)}</td></tr>
              </tbody>
            </table>
            <div className="mt-2 min-h-[90px] border border-slate-800 p-2">
              <div className="text-center font-bold" style={{ color: BLUE }}>CACHET &amp; SIGNATURE</div>
            </div>
          </div>
          <div className="flex-1 border border-slate-800 p-2 text-[11px]">
            <div className="flex justify-between py-1"><span className="font-bold">TOTAL HT</span><b>{num(totalHT)}</b></div>
            {doc.discount > 0 && <div className="flex justify-between py-1"><span>REMISE {doc.discountPct ? `${doc.discountPct}%` : ''}</span><span>-{num(discountHT)}</span></div>}
            <div className="flex justify-between py-1"><span>TOTAL HT (NET)</span><b>{num(netHT)}</b></div>
            <div className="flex justify-between py-1"><span>T.V.A.</span><b>{num(tva)}</b></div>
            {timbre > 0 && <div className="flex justify-between py-1"><span>TIMBRE FISCAL</span><b>{num(timbre)}</b></div>}
            <div className="mt-1 flex justify-between border-t-2 border-slate-800 py-1.5 text-sm font-black" style={{ color: BLUE }}><span>TOTAL T.T.C.</span><span>{num(netTTC + timbre)}</span></div>
          </div>
        </div>

        {doc.note && <p className="mt-3 whitespace-pre-line text-[11px] text-slate-700"><b>Note :</b> {doc.note}</p>}
        <p className="mt-3 text-[10px] text-slate-500">
          Prix en dinars tunisiens. Frais de livraison non inclus.{doc.kind === 'devis' && ' Devis valable 15 jours.'}
        </p>
      </div>
    </div>
  )
}

