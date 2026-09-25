import { ClientsPanel } from './panels/ClientsPanel'
import { OrdersPanel } from './panels/OrdersPanel'
import { QuotesPanel } from './panels/QuotesPanel'

const wrap = 'mx-auto h-full max-w-5xl overflow-y-auto p-4 sm:p-6'

export function MyQuotesPage() {
  return (
    <div className={wrap}>
      <h1 className="mb-4 text-xl font-bold text-navy">Mes devis</h1>
      <QuotesPanel />
    </div>
  )
}

export function MyOrdersPage() {
  return (
    <div className={wrap}>
      <h1 className="mb-4 text-xl font-bold text-navy">Mes commandes</h1>
      <OrdersPanel />
    </div>
  )
}

export function MyClientsPage() {
  return (
    <div className={wrap}>
      <h1 className="mb-4 text-xl font-bold text-navy">Mes clients</h1>
      <ClientsPanel />
    </div>
  )
}
