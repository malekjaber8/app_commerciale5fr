import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QuoteProvider } from './store/quote'
import { AuthProvider, useAuth } from './store/auth'
import { SettingsProvider } from './store/settings'
import { Layout } from './components/Layout'
import { CataloguePage } from './pages/CataloguePage'
import { QuotePage } from './pages/QuotePage'
import { MyQuotesPage } from './pages/MyQuotesPage'
import { AdminPage } from './pages/admin/AdminPage'
import { DeniedPage, LoginPage } from './pages/LoginPage'

function Gate() {
  const { status, role } = useAuth()
  if (status === 'loading') return <div className="flex h-full items-center justify-center text-slate-400">Chargement...</div>
  if (status === 'out') return <LoginPage />
  if (status === 'denied') return <DeniedPage />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CataloguePage />} />
        <Route path="devis" element={<QuotePage />} />
        <Route path="mes-devis" element={<MyQuotesPage />} />
        <Route path="admin" element={role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

// HashRouter : indispensable sur GitHub Pages (pas de reecriture d'URL cote serveur)
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
