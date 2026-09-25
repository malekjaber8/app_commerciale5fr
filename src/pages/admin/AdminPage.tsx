import { useState } from 'react'
import { ArrowLeft, Activity, Clock, FileText, Package, Receipt, ShoppingCart, Users, UserSquare2 } from 'lucide-react'
import { UsersTab } from './UsersTab'
import { ContentTab } from './ContentTab'
import { ClientsPanel } from '../panels/ClientsPanel'
import { OrdersPanel } from '../panels/OrdersPanel'
import { QuotesPanel } from '../panels/QuotesPanel'
import { InvoicesPanel } from '../panels/InvoicesPanel'
import { ActivityPanel } from '../panels/ActivityPanel'

type Tab = 'activity' | 'users' | 'orders' | 'clients' | 'invoices' | 'quotes' | 'content'
type SubTab = 'activity' | 'orders' | 'quotes' | 'clients' | 'invoices'
interface Commercial { id: string; name: string; email: string }

function CommercialDetail({ user, onBack }: { user: Commercial; onBack: () => void }) {
  const [sub, setSub] = useState<SubTab>('activity')
  const subs: { id: SubTab; label: string }[] = [
    { id: 'activity', label: 'Activite' }, { id: 'orders', label: 'Commandes' }, { id: 'quotes', label: 'Devis' }, { id: 'clients', label: 'Clients' }, { id: 'invoices', label: 'Factures' },
  ]
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy"><ArrowLeft size={16} /> Retour aux commerciaux</button>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-lg font-bold text-navy">{user.name}</div>
        <div className="text-sm text-slate-500">{user.email}</div>
      </div>
      <div className="flex gap-1 border-b border-slate-200">
        {subs.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${sub === s.id ? 'border-teal text-teal-dark' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{s.label}</button>
        ))}
      </div>
      {sub === 'activity' && <ActivityPanel ownerUid={user.id} />}
      {sub === 'orders' && <OrdersPanel ownerUid={user.id} admin />}
      {sub === 'quotes' && <QuotesPanel ownerUid={user.id} admin />}
      {sub === 'clients' && <ClientsPanel ownerUid={user.id} ownerName={user.name} admin />}
      {sub === 'invoices' && <InvoicesPanel ownerUid={user.id} />}
    </div>
  )
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('activity')
  const [selected, setSelected] = useState<Commercial | null>(null)
  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'activity', label: 'Activite du jour', icon: Clock },
    { id: 'users', label: 'Commerciaux', icon: Users },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
    { id: 'clients', label: 'Clients', icon: UserSquare2 },
    { id: 'invoices', label: 'Factures', icon: Receipt },
    { id: 'quotes', label: 'Devis', icon: FileText },
    { id: 'content', label: 'Contenu et prix', icon: Package },
  ]
  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto p-4 sm:p-6">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-navy"><Activity size={20} /> Administration</h1>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(null) }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t.id ? 'border-teal text-teal-dark' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'activity' && <ActivityPanel />}
      {tab === 'users' && (selected
        ? <CommercialDetail user={selected} onBack={() => setSelected(null)} />
        : <UsersTab onOpen={setSelected} />)}
      {tab === 'orders' && <OrdersPanel admin />}
      {tab === 'clients' && <ClientsPanel admin />}
      {tab === 'invoices' && <InvoicesPanel />}
      {tab === 'quotes' && <QuotesPanel admin />}
      {tab === 'content' && <ContentTab />}
    </div>
  )
}
