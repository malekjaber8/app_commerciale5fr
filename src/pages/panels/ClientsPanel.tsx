import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient, deleteClient, fetchClients, updateClient } from '../../lib/db'
import { useAuth } from '../../store/auth'
import type { Client } from '../../types'
import { ClientModal } from '../../components/ClientModal'
import { Empty, inputCls } from '../../components/ui'

interface Props {
  /** Restreint aux clients d'un commercial (admin : vue detaillee d'un commercial). */
  ownerUid?: string
  ownerName?: string
  admin?: boolean
}

export function ClientsPanel({ ownerUid, ownerName, admin }: Props) {
  const { uid, profile } = useAuth()
  const scope = ownerUid ?? (admin ? undefined : uid ?? undefined)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Client | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setClients(await fetchClients(scope)) } catch { setError(true) } finally { setLoading(false) }
  }, [scope])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? clients.filter(c => `${c.name} ${c.phone} ${c.email} ${c.taxId}`.toLowerCase().includes(q)) : clients
  }, [clients, query])

  const remove = async (c: Client) => {
    if (!confirm(`Supprimer le client ${c.name} ?`)) return
    await deleteClient(c.id)
    await load()
  }

  const owner = { uid: ownerUid ?? uid ?? '', name: ownerName ?? profile?.name ?? '' }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un client..." className={inputCls + ' max-w-sm'} />
        <div className="text-sm text-slate-500">{shown.length} client{shown.length > 1 ? 's' : ''}</div>
        <button onClick={() => setEditing('new')} className="ml-auto flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"><Plus size={15} /> Nouveau client</button>
      </div>

      {loading && <div className="p-8 text-center text-slate-400">Chargement...</div>}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Impossible de charger les clients.</div>}
      {!loading && !error && shown.length === 0 && <Empty text="Aucun client." />}
      {!loading && shown.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="p-3">Client</th><th className="p-3">Contact</th><th className="p-3">Matricule</th>{admin && !ownerUid && <th className="p-3">Commercial</th>}<th /></tr>
            </thead>
            <tbody>
              {shown.map(c => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-3"><div className="font-semibold text-slate-800">{c.name}</div><div className="text-xs text-slate-400">{c.address}</div></td>
                  <td className="p-3 text-slate-600"><div>{c.phone}</div><div className="text-xs text-slate-400">{c.email}</div></td>
                  <td className="p-3 text-slate-500">{c.taxId || '-'}</td>
                  {admin && !ownerUid && <td className="p-3 text-slate-500">{c.ownerName || '-'}</td>}
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(c)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil size={15} /></button>
                      {admin && <button onClick={() => remove(c)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ClientModal
          initial={editing === 'new' ? undefined : editing}
          ownerUid={owner.uid}
          ownerName={owner.name}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing === 'new') await createClient(data)
            else await updateClient(editing.id, data)
            await load()
          }}
        />
      )}
    </div>
  )
}
