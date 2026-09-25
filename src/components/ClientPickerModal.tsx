import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { createClient, fetchClients } from '../lib/db'
import { ClientModal } from './ClientModal'
import { Modal, inputCls } from './ui'

export interface PickedClient { id: string; name: string; phone: string }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Choix du client d'un devis : liste avec recherche, ou creation d'un nouveau client. */
export function ClientPickerModal({ uid, ownerName, onPick, onClose }: {
  uid: string; ownerName: string; onPick: (c: PickedClient) => void; onClose: () => void
}) {
  const [clients, setClients] = useState<Awaited<ReturnType<typeof fetchClients>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchClients(uid).then(setClients).catch(() => setError(true)).finally(() => setLoading(false))
  }, [uid])

  const shown = useMemo(() => {
    const q = norm(query.trim())
    return q ? clients.filter(c => norm(`${c.name} ${c.phone} ${c.address}`).includes(q)) : clients
  }, [clients, query])

  return (
    <Modal title="Affecter a un client" onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un client (nom, telephone)..." className={inputCls + ' pl-9'} />
        </div>
        <button onClick={() => setCreating(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-bold text-navy">
          <Plus size={15} /> Nouveau
        </button>
      </div>

      {loading && <div className="p-6 text-center text-sm text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Impossible de charger vos clients.</div>}
      {!loading && !error && clients.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Vous n'avez pas encore de client.
          <button onClick={() => setCreating(true)} className="mt-3 block w-full rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white">Ajouter mon premier client</button>
        </div>
      )}
      {!loading && clients.length > 0 && shown.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Aucun client ne correspond.</div>}
      <div className="max-h-[55vh] overflow-y-auto">
        {shown.map(c => (
          <button key={c.id} onClick={() => onPick({ id: c.id, name: c.name, phone: c.phone })}
            className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-2 py-3 text-left last:border-0 hover:bg-teal/10">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">{c.name}</div>
              <div className="truncate text-xs text-slate-400">{c.address || '—'}</div>
            </div>
            <div className="shrink-0 text-sm text-slate-500">{c.phone}</div>
          </button>
        ))}
      </div>

      {creating && (
        <ClientModal ownerUid={uid} ownerName={ownerName} onClose={() => setCreating(false)}
          onSave={async data => {
            const id = await createClient(data)
            onPick({ id, name: data.name, phone: data.phone })
          }} />
      )}
    </Modal>
  )
}
