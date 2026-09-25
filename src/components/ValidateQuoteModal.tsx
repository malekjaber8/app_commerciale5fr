import { useState } from 'react'
import { doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { CheckCircle2, FileText, Receipt, Truck, Undo2 } from 'lucide-react'
import { db } from '../firebase'
import { computeInvoiceTotals, createInvoice, nextDeliveryNumber } from '../lib/db'
import { DOC_TYPE_LABEL, updateQuote, type DocType, type QuoteDoc } from '../lib/quotes'
import { dt } from '../lib/format'
import type { Client } from '../types'
import { Modal } from './ui'

const CHOICES: { type: DocType; icon: typeof FileText; hint: string }[] = [
  { type: 'devis', icon: FileText, hint: 'Le devis est confirme tel quel.' },
  { type: 'bon_livraison', icon: Truck, hint: 'Numero BL-AAAA-NNNN attribue automatiquement.' },
  { type: 'facture', icon: Receipt, hint: 'Facture FAC-AAAA-NNNN creee (TVA 19 % + timbre 1 DT).' },
]

/** Validation d'un devis par l'admin : choix de la nature du document, puis le commercial voit « Valide ». */
export function ValidateQuoteModal({ quote, onClose, onDone }: { quote: QuoteDoc; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<DocType>(quote.docType ?? 'devis')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = !!quote.invoiceId
  const validated = quote.status === 'valide'

  const validate = async () => {
    setBusy(true); setError('')
    try {
      const base = { status: 'valide', docType: type, validatedAt: serverTimestamp() }
      if (type === 'devis') {
        await updateQuote(quote.id, { ...base, docNumber: '' })
      } else if (type === 'bon_livraison') {
        const docNumber = quote.docType === 'bon_livraison' && quote.docNumber ? quote.docNumber : await nextDeliveryNumber()
        await updateQuote(quote.id, { ...base, docNumber })
      } else {
        let client: Client | null = null
        if (quote.clientId) {
          try { const s = await getDoc(doc(db, 'clients', quote.clientId)); if (s.exists()) client = s.data() as Client } catch { /* facture sans fiche client */ }
        }
        const lines = quote.lines.map(l => ({ ...l }))
        const t = computeInvoiceTotals(lines, quote.discount)
        const invoiceId = await createInvoice({
          orderId: '', clientId: quote.clientId || '', clientName: client?.name || quote.client, taxId: client?.taxId || '',
          address: client?.address || '', phone: client?.phone || quote.phone, ownerUid: quote.ownerUid, ownerName: quote.ownerName,
          lines, note: quote.note, ...t,
        })
        const inv = await getDoc(doc(db, 'invoices', invoiceId))
        await updateQuote(quote.id, { ...base, docNumber: (inv.data()?.number as string) || '', invoiceId })
      }
      onDone(); onClose()
    } catch {
      setError('Validation impossible. Verifiez la connexion et les regles Firestore.')
      setBusy(false)
    }
  }

  const backToPending = async () => {
    if (!window.confirm('Remettre ce devis en attente ? Le commercial ne verra plus « Valide ».')) return
    setBusy(true); setError('')
    try {
      await updateQuote(quote.id, { status: 'attente', docType: 'devis', docNumber: '', validatedAt: null })
      onDone(); onClose()
    } catch {
      setError('Operation impossible.')
      setBusy(false)
    }
  }

  return (
    <Modal title={`Valider le devis ${quote.number}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-800">{quote.client || 'Sans client'}</div>
          <div className="text-slate-500">{quote.lines.length} ligne(s) — <b className="text-navy">{dt(quote.total)}</b> TTC</div>
        </div>

        {locked ? (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Une facture ({quote.docNumber}) a deja ete emise pour ce devis. Elle se gere dans l&apos;onglet Factures.
          </div>
        ) : (
          <>
            <div className="text-sm font-semibold text-slate-700">Ce devis devient :</div>
            <div className="space-y-2">
              {CHOICES.map(c => (
                <button key={c.type} onClick={() => setType(c.type)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left ${type === c.type ? 'border-teal bg-teal/10' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <c.icon size={20} className={type === c.type ? 'text-teal-dark' : 'text-slate-400'} />
                  <div>
                    <div className="text-sm font-bold text-navy">{c.type === 'devis' ? 'Rester un devis' : DOC_TYPE_LABEL[c.type]}</div>
                    <div className="text-xs text-slate-500">{c.hint}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Le commercial verra aussitot « Valide » et le type choisi. Pensez a modifier le devis avant si necessaire.</p>
          </>
        )}

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {validated && !locked && (
            <button onClick={backToPending} disabled={busy} className="mr-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><Undo2 size={14} /> Remettre en attente</button>
          )}
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annuler</button>
          {!locked && (
            <button onClick={validate} disabled={busy} className="flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
              <CheckCircle2 size={16} /> {busy ? 'Validation...' : 'Confirmer'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
