import { NavLink, Outlet } from 'react-router-dom'
import { FileText, History, LayoutGrid, LogOut, Shield, ShoppingCart, Users } from 'lucide-react'
import { useQuote } from '../store/quote'
import { useAuth } from '../store/auth'
import { IS_DESKTOP } from '../config'

export function Layout() {
  const { count } = useQuote()
  const { role, profile, email, logout } = useAuth()
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`
  const label = (t: string) => <span className="hidden lg:inline">{t}</span>

  return (
    <div className="flex h-full flex-col">
      <header className="no-print flex items-center gap-3 bg-navy px-5 py-3 shadow">
        <img src={import.meta.env.BASE_URL + 'logo.png'} alt="Les Cinq Freres" className="h-9 rounded bg-white p-1" />
        <div className="hidden sm:block">
          <div className="text-sm font-bold leading-tight text-white">{IS_DESKTOP ? 'Administration' : 'Espace Commercial'}</div>
          <div className="text-[11px] leading-tight text-teal">{profile?.name || email}{role === 'admin' ? ' (admin)' : ''}</div>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          {IS_DESKTOP && role === 'admin' && (
            <NavLink to="/admin" className={link}><Shield size={16} /> {label('Admin')}</NavLink>
          )}
          <NavLink to="/" end className={link}><LayoutGrid size={16} /> {label('Catalogue')}</NavLink>
          {!IS_DESKTOP && (
            <>
              <NavLink to="/devis" className={link}>
                <FileText size={16} /> {label('Panier')}
                {count > 0 && <span className="rounded-full bg-teal px-1.5 text-[11px] font-bold text-navy">{count}</span>}
              </NavLink>
              <NavLink to="/mes-devis" className={link}><History size={16} /> {label('Mes devis')}</NavLink>
              <NavLink to="/commandes" className={link}><ShoppingCart size={16} /> {label('Commandes')}</NavLink>
              <NavLink to="/clients" className={link}><Users size={16} /> {label('Clients')}</NavLink>
            </>
          )}
          <button onClick={logout} title="Se deconnecter" className="ml-1 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
        </nav>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
