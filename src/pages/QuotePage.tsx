import { useEffect, useState } from 'react'
import { Minus, Plus, Printer, Save, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuote } from '../store/quote'
import { useAuth } from '../store/auth'
import { useSettings } from '../store/settings'
import { saveQuote } from '../lib/quotes'
import { fetchClients } from '../lib/db'
import type { Client } from '../types'
import { dt } from '../lib/format'

const TVA = 0.19

export function QuotePage() {
  const { lines, setQty, remove, clear, total } = useQuote()
  const { uid, email, profile, role } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [client, setClient] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [discountPct, setDiscountPct] = useState(0)
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [number] = useState(() =>
    'DV-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000))

  useEffect(() => {
    if (uid) fetchClients(uid).then(setClients).catch(() => setClients([]))
  }, [uid])

  const pickClient = (id: string) => {
    setClientId(id)
    const c = clients.find(x => x.id === id)
    if (c) { setClient(c.name); setPhone(c.phone) }
  }

  // Le plafond de remise fixe par l'admin s'applique aux commerciaux (pas a l'admin)
  const maxPct = role === 'admin' ? 100 : settings.maxDiscountPct
  const pct = Math.min(maxPct, Math.max(0, discountPct))
  const discount = total * (pct / 100)
  const net = total - discount
  const date = new Date().toLocaleDateString('fr-FR')

  const save = async () => {
    if (!uid) return
    setError('')
    setSaving(true)
    try {
      await saveQuote({
        number, ownerUid: uid, ownerName: profile?.name || '', ownerEmail: email || '', clientId,
        client: client.trim(), phone: phone.trim(), note: note.trim(), discountPct: pct,
        lines: lines.map(({ articleId, name, variant, unitPrice, qty }) => ({ articleId, name, variant, unitPrice, qty })),
        subtotal: total, discount, total: net,
      })
      clear()
      navigate('/mes-devis')
    } catch {
      setError('Impossible d\'enregistrer le devis. Verifiez votre connexion.')
    } finally {
      setSaving(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto mt-24 max-w-md text-center">
        <p className="text-slate-500">Votre devis est vide.</p>
        <Link to="/" className="mt-4 inline-block rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-navy">Parcourir le catalogue</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto p-4 sm:p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Nouveau devis</h1>
        <div className="flex gap-2">
          <button onClick={clear} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <Trash2 size={15} /> Vider
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-navy bg-white px-4 py-2 text-sm font-bold text-navy">
            <Printer size={15} /> Imprimer / PDF
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            <Save size={15} /> {saving ? 'Enregistrement...' : 'Enregistrer le devis'}
          </button>
        </div>
      </div>

      <div className="no-print mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <select value={clientId} onChange={e => pickClient(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal sm:col-span-2">
          <option value="">Client enregistre (optionnel)...</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={client} onChange={e => { setClient(e.target.value); setClientId('') }} placeholder="Nom du client / société"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note / conditions (optionnel)"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Remise (%)
          <input type="number" min={0} max={maxPct} value={discountPct}
            onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)}
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal" />
          <span className="text-xs text-slate-400">(max {maxPct}%)</span>
        </label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 sm:col-span-2">{error}</div>}
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

        {(client || phone) && (
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="font-semibold text-slate-700">{client}</div>
            <div className="text-slate-500">{phone}</div>
          </div>
        )}

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
                  <div className="no-print flex items-center justify-center gap-1">
                    <button onClick={() => setQty(l.key, l.qty - 1)} className="rounded p-1 hover:bg-slate-100"><Minus size={13} /></button>
                    <span className="w-8 text-center font-semibold">{l.qty}</span>
                    <button onClick={() => setQty(l.key, l.qty + 1)} className="rounded p-1 hover:bg-slate-100"><Plus size={13} /></button>
                  </div>
                  <div className="hidden text-center print:block">{l.qty}</div>
                </td>
                <td className="py-2.5 text-right font-semibold">{dt(l.unitPrice * l.qty)}</td>
                <td className="no-print py-2.5 pl-2">
                  <button onClick={() => remove(l.key)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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

        {note && <p className="mt-5 text-xs text-slate-500">{note}</p>}
        <p className="mt-6 text-[11px] text-slate-400">Prix en dinars tunisiens, TTC. Frais de livraison non inclus. Devis valable 15 jours.</p>
      </div>
    </div>
  )
}
