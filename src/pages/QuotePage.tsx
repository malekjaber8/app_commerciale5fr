import { useState } from 'react'
import { ArrowLeft, Minus, Plus, Printer, Save, Trash2, UserCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuote } from '../store/quote'
import { useAuth } from '../store/auth'
import { useSettings } from '../store/settings'
import { saveQuote, updateQuote } from '../lib/quotes'
import { dt } from '../lib/format'
import { ClientPickerModal, type PickedClient } from '../components/ClientPickerModal'
import { ArticlePickerModal } from '../components/ArticlePickerModal'
import { useDialogs } from '../components/Dialogs'

const TVA = 0.19

/** Parcours : 1) panier  2) affecter a un client  3) verification du devis (quantites, articles, note)  4) enregistrement. */
export function QuotePage() {
  const { lines, setQty, remove, clear, total, editing } = useQuote()
  const { ask } = useDialogs()
  const { uid, email, profile, role } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [step, setStep] = useState<'cart' | 'review'>(editing ? 'review' : 'cart')
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [client, setClient] = useState<PickedClient | null>(editing ? { id: editing.clientId, name: editing.client, phone: editing.phone } : null)
  const [note, setNote] = useState(editing?.note ?? '')
  const [discountPct, setDiscountPct] = useState(editing?.discountPct ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [number] = useState(() => editing ? editing.number :
    'DV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000))

  // Le plafond de remise fixe par l'admin s'applique aux commerciaux (pas a l'admin)
  const maxPct = role === 'admin' ? 100 : settings.maxDiscountPct
  const pct = Math.min(maxPct, Math.max(0, discountPct))
  const discount = total * (pct / 100)
  const net = total - discount
  const date = new Date().toLocaleDateString('fr-FR')

  const save = async () => {
    if (!uid || !client) return
    setError('')
    setSaving(true)
    try {
      const fields = {
        client: client.name, phone: client.phone, clientId: client.id, note: note.trim(), discountPct: pct,
        lines: lines.map(({ articleId, name, variant, unitPrice, qty }) => ({ articleId, name, variant, unitPrice, qty })),
        subtotal: total, discount, total: net,
      }
      if (editing) {
        await updateQuote(editing.id, fields)
        clear()
        navigate('/mes-devis')
        return
      }
      await saveQuote({
        number, ownerUid: uid, ownerName: profile?.name || '', ownerEmail: email || '', clientId: client.id,
        client: client.name, phone: client.phone, note: note.trim(), discountPct: pct,
        lines: lines.map(({ articleId, name, variant, unitPrice, qty }) => ({ articleId, name, variant, unitPrice, qty })),
        subtotal: total, discount, total: net,
      })
      clear()
      navigate('/mes-devis')
    } catch {
      setError(editing
        ? "Modification impossible : le devis a peut-etre ete valide par l'administrateur entre-temps, ou la connexion est coupee."
        : "Impossible d'enregistrer le devis. Verifiez votre connexion.")
    } finally {
      setSaving(false)
    }
  }

  const qtyControl = (key: string, qty: number) => (
    <div className="flex items-center justify-center gap-1">
      <button onClick={() => setQty(key, qty - 1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100"><Minus size={14} /></button>
      <span className="w-9 text-center font-semibold">{qty}</span>
      <button onClick={() => setQty(key, qty + 1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100"><Plus size={14} /></button>
    </div>
  )

  if (lines.length === 0 && !adding) {
    return (
      <div className="mx-auto mt-24 max-w-md px-4 text-center">
        <p className="text-slate-500">Votre panier est vide.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/" className="rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-navy">Parcourir le catalogue</Link>
          {step === 'review' && <button onClick={() => setAdding(true)} className="rounded-xl border border-navy px-5 py-2.5 text-sm font-bold text-navy">Ajouter un article</button>}
        </div>
      </div>
    )
  }

  /* ───────── etape 1 : panier ───────── */
  if (step === 'cart') {
    return (
      <div className="mx-auto h-full max-w-3xl overflow-y-auto p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-navy">Mon panier</h1>
          <div className="flex gap-2">
            <Link to="/" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Plus size={15} /> Ajouter des articles</Link>
            <button onClick={async () => { if (await ask('Vider le panier ?', { confirmLabel: 'Vider' })) clear() }} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Trash2 size={15} /> Vider</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          {lines.map(l => (
            <div key={l.key} className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{l.name}</div>
                <div className="truncate text-xs text-slate-400">{l.variant} — {dt(l.unitPrice)}</div>
              </div>
              {qtyControl(l.key, l.qty)}
              <div className="w-24 text-right text-sm font-bold text-navy">{dt(l.unitPrice * l.qty)}</div>
              <button onClick={() => remove(l.key)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 mt-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div>
            <div className="text-xs text-slate-500">Total TTC</div>
            <div className="text-xl font-extrabold text-navy">{dt(total)}</div>
          </div>
          <button onClick={() => setPicking(true)} className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal to-navy-soft px-6 py-3.5 text-sm font-bold text-white shadow">
            <UserRound size={17} /> Affecter a un client
          </button>
        </div>

        {picking && uid && (
          <ClientPickerModal uid={uid} ownerName={profile?.name || ''} onClose={() => setPicking(false)}
            onPick={c => { setClient(c); setPicking(false); setStep('review') }} />
        )}
      </div>
    )
  }

  /* ───────── etape 3 : verification du devis ───────── */
  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto p-4 sm:p-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <button onClick={() => { clear(); navigate('/mes-devis') }} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy"><ArrowLeft size={16} /> Annuler la modification</button>
        ) : (
          <button onClick={() => setStep('cart')} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy"><ArrowLeft size={16} /> Retour au panier</button>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-navy bg-white px-4 py-2 text-sm font-bold text-navy">
            <Printer size={15} /> Imprimer / PDF
          </button>
          <button onClick={save} disabled={saving || lines.length === 0} className="flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
            <Save size={15} /> {saving ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : 'Enregistrer le devis'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="no-print mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Modification du devis <b>{number}</b> — possible tant que l&apos;administrateur ne l&apos;a pas valide. Ajoutez des articles depuis le catalogue ou avec le bouton ci-dessous.
        </div>
      )}
      <div className="no-print mb-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <UserCheck size={18} className="shrink-0 text-teal-dark" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-800">{client?.name}</div>
            <div className="text-xs text-slate-500">{client?.phone}</div>
          </div>
          <button onClick={() => setPicking(true)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Changer de client</button>
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Note / conditions (optionnel)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Remise (%)
          <input type="number" min={0} max={maxPct} value={discountPct}
            onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)}
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal" />
          <span className="text-xs text-slate-400">(max {maxPct}%)</span>
        </label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-lg font-extrabold text-navy">Société Magasin Les Cinq Frères</div>
            <div className="text-xs text-slate-500">Matières premières pour tapisserie — Tunisie</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-bold text-navy">DEVIS {number}</div>
            <div className="text-slate-500">{date}</div>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-700">{client?.name}</div>
          <div className="text-slate-500">{client?.phone}</div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-navy text-left text-xs uppercase text-slate-500">
              <th className="py-2">Désignation</th>
              <th className="py-2 text-right">P.U.</th>
              <th className="py-2 text-center">Qté</th>
              <th className="py-2 text-right">Montant</th>
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.key} className="border-b border-slate-100">
                <td className="py-2.5">
                  <div className="font-medium text-slate-800">{l.name}</div>
                  <div className="text-xs text-slate-400">{l.variant}</div>
                </td>
                <td className="py-2.5 text-right">{dt(l.unitPrice)}</td>
                <td className="py-2.5">
                  <div className="no-print">{qtyControl(l.key, l.qty)}</div>
                  <div className="hidden text-center print:block">{l.qty}</div>
                </td>
                <td className="py-2.5 text-right font-semibold">{dt(l.unitPrice * l.qty)}</td>
                <td className="no-print py-2.5 pl-2">
                  <button onClick={() => remove(l.key)} className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={() => setAdding(true)} className="no-print mt-3 flex items-center gap-2 rounded-xl border border-dashed border-teal px-4 py-2.5 text-sm font-bold text-teal-dark hover:bg-teal/10">
          <Plus size={15} /> Ajouter un article
        </button>

        <div className="ml-auto mt-5 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span>{dt(total)}</span></div>
          {discount > 0 && (
            <div className="flex justify-between text-green-700"><span>Remise ({pct}%)</span><span>-{dt(discount)}</span></div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-navy">
            <span>Total TTC</span><span>{dt(net)}</span>
          </div>
          <div className="text-right text-[11px] text-slate-400">dont TVA {Math.round(TVA * 100)}% : {dt(net - net / (1 + TVA))}</div>
        </div>

        {note && <p className="mt-5 whitespace-pre-line text-xs text-slate-500">{note}</p>}
        <p className="mt-6 text-[11px] text-slate-400">Prix en dinars tunisiens, TTC. Frais de livraison non inclus. Devis valable 15 jours.</p>
      </div>

      <div className="no-print mt-4 flex justify-end">
        <button onClick={save} disabled={saving || lines.length === 0} className="flex items-center gap-2 rounded-xl bg-navy px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
          <Save size={16} /> {saving ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : 'Enregistrer le devis'}
        </button>
      </div>

      {adding && <ArticlePickerModal onClose={() => setAdding(false)} />}
      {picking && uid && (
        <ClientPickerModal uid={uid} ownerName={profile?.name || ''} onClose={() => setPicking(false)}
          onPick={c => { setClient(c); setPicking(false) }} />
      )}
    </div>
  )
}
