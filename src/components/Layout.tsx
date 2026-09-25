import { NavLink, Outlet } from 'react-router-dom'
import { FileText, History, LayoutGrid, LogOut, Shield, Users } from 'lucide-react'
import { useQuote } from '../store/quote'
import { useAuth } from '../store/auth'
import { IS_DESKTOP } from '../config'

export function Layout() {
  const { count } = useQuote()
  const { role, profile, email, logout } = useAuth()
  // Boutons du menu : icone au-dessus, texte toujours visible, grande zone tactile (tablette)
  const link = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-h-[60px] min-w-[68px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[13px] font-semibold leading-none transition sm:min-w-[84px] ${
      isActive ? 'bg-white/20 text-white shadow-inner' : 'text-white/75 hover:bg-white/10 hover:text-white active:bg-white/20'
    }`

  return (
    <div className="flex h-full flex-col">
      <header className="no-print flex items-center gap-4 bg-navy px-4 py-3 shadow-lg sm:px-6">
        <img src={import.meta.env.BASE_URL + 'logo.png'} alt="Les Cinq Freres" className="h-14 rounded-lg bg-white p-1.5" />
        <div className="hidden min-w-0 md:block">
          <div className="text-xl font-extrabold leading-tight text-white">{IS_DESKTOP ? 'Administration' : 'Espace Commercial'}</div>
          <div className="truncate text-base font-semibold leading-tight text-teal">{profile?.name || email}{role === 'admin' ? ' (admin)' : ''}</div>
        </div>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          {IS_DESKTOP && role === 'admin' && (
            <NavLink to="/admin" className={link}><Shield size={26} /><span>Admin</span></NavLink>
          )}
          <NavLink to="/" end className={link}><LayoutGrid size={26} /><span>Catalogue</span></NavLink>
          {!IS_DESKTOP && (
            <>
              <NavLink to="/devis" className={link}>
                <FileText size={26} /><span>Panier</span>
                {count > 0 && <span className="absolute right-1 top-0.5 min-w-[22px] rounded-full bg-teal px-1.5 py-0.5 text-center text-xs font-extrabold text-navy shadow">{count}</span>}
              </NavLink>
              <NavLink to="/mes-devis" className={link}><History size={26} /><span>Mes devis</span></NavLink>
              <NavLink to="/clients" className={link}><Users size={26} /><span>Clients</span></NavLink>
            </>
          )}
          <button onClick={logout} title="Se deconnecter" className="flex min-h-[60px] min-w-[68px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[13px] font-semibold leading-none text-white/75 transition hover:bg-white/10 hover:text-white active:bg-white/20 sm:min-w-[84px]">
            <LogOut size={26} /><span>Quitter</span>
          </button>
        </nav>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
