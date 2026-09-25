import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QuoteProvider } from './store/quote'
import { AuthProvider, useAuth } from './store/auth'
import { SettingsProvider } from './store/settings'
import { Layout } from './components/Layout'
import { CataloguePage } from './pages/CataloguePage'
import { QuotePage } from './pages/QuotePage'
import { MyClientsPage, MyOrdersPage, MyQuotesPage } from './pages/CommercialPages'
import { AdminOnlyPage, DeniedPage, LoginPage } from './pages/LoginPage'

// L'interface admin n'existe que dans l'application bureau (build avec VITE_DESKTOP=1).
// Dans le build web (GitHub Pages), ce code est elimine : il n'est jamais publie.
import { IS_DESKTOP } from './config'
const AdminPage = import.meta.env.VITE_DESKTOP === '1'
  ? lazy(() => import('./pages/admin/AdminPage').then(m => ({ default: m.AdminPage })))
  : null

function Gate() {
  const { status, role } = useAuth()
  if (status === 'loading') return <div className="flex h-full items-center justify-center text-slate-400">Chargement...</div>
  if (status === 'out') return <LoginPage />
  if (status === 'denied') return <DeniedPage />
  if (IS_DESKTOP && role !== 'admin') return <AdminOnlyPage />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CataloguePage />} />
        <Route path="devis" element={<QuotePage />} />
        <Route path="mes-devis" element={<MyQuotesPage />} />
        <Route path="commandes" element={<MyOrdersPage />} />
        <Route path="clients" element={<MyClientsPage />} />
        {AdminPage && role === 'admin' && (
          <Route path="admin" element={<Suspense fallback={<div className="p-10 text-center text-slate-400">Chargement...</div>}><AdminPage /></Suspense>} />
        )}
        <Route path="*" element={<Navigate to={IS_DESKTOP ? '/admin' : '/'} replace />} />
      </Route>
    </Routes>
  )
}

// HashRouter : indispensable sur GitHub Pages et en application bureau (pas de serveur de routage)
export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <QuoteProvider>
          <HashRouter>
            <Gate />
          </HashRouter>
        </QuoteProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
