import { NavLink, Outlet } from 'react-router-dom'
import { Download, FileText, History, LayoutGrid, LogOut, Scissors, Shield, Users } from 'lucide-react'
import { useQuote } from '../store/quote'
import { useAuth } from '../store/auth'
import { IS_DESKTOP } from '../config'
import { InstallButton } from './InstallButton'

export function Layout() {
  const { count } = useQuote()
  const { role, profile, email, logout } = useAuth()
  // Boutons du menu : icone au-dessus, texte toujours visible, grande zone tactile (tablette)
  const link = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-h-[60px] min-w-[68px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[13px] font-semibold leading-none transition sm:min-w-[84px] ${
      isActive ? 'bg-white/20 text-white shadow-inner' : 'text-white/75 hover:bg-white/10 hover:text-white active:bg-white/20'
    }`

  // Session dediee a la personne responsable du tissu : rien d'autre que ses commandes a preparer.
  if (role === 'tissu') {
    return (
      <div className="flex h-full flex-col">
        <header className="no-print flex items-center gap-3 bg-navy px-3 py-2.5 shadow-lg sm:gap-4 sm:px-6 sm:py-3">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="Les Cinq Freres" className="h-11 shrink-0 rounded-lg bg-white p-1.5 sm:h-14" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-base font-extrabold leading-tight text-white sm:gap-2 sm:text-xl"><Scissors size={18} className="shrink-0" /> <span className="truncate">Atelier Tissu</span></div>
            <div className="truncate text-sm font-semibold leading-tight text-teal sm:text-base">{profile?.name || email}</div>
          </div>
          {!IS_DESKTOP && (
            <InstallButton label="Installer" icon={<Download size={22} />}
              className="ml-auto flex min-h-[52px] min-w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold leading-none text-white/75 transition hover:bg-white/10 hover:text-white active:bg-white/20 sm:min-h-[60px] sm:min-w-[84px] sm:gap-1 sm:px-3 sm:py-2 sm:text-[13px]" />
          )}
          <button onClick={logout} title="Se deconnecter" className={`${IS_DESKTOP ? 'ml-auto' : ''} flex min-h-[52px] min-w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold leading-none text-white/75 transition hover:bg-white/10 hover:text-white active:bg-white/20 sm:min-h-[60px] sm:min-w-[84px] sm:gap-1 sm:px-3 sm:py-2 sm:text-[13px]`}>
            <LogOut size={22} className="sm:hidden" /><LogOut size={26} className="hidden sm:block" /><span>Quitter</span>
          </button>
        </header>
        <main className="min-h-0 flex-1"><Outlet /></main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="no-print flex items-center gap-4 bg-navy px-4 py-3 shadow-lg sm:px-6">
        <img src={import.meta.env.BASE_URL + 'logo.png'} alt="Les Cinq Freres" className="h-14 rounded-lg bg-white p-1.5" />
        <div className="hidden min-w-0 md:block">
          <div className="text-xl font-extrabold leading-tight text-white">{IS_DESKTOP ? 'Administration' : 'Espace Commercial'}</div>
          <div className="truncate text-base font-semibold leading-tight text-teal">
            {profile?.name || email}{role === 'admin' ? ' (admin)' : ''}
            {profile?.wholesaleEnabled && <span className="ml-2 rounded-full bg-teal/20 px-2 py-0.5 text-xs font-bold text-teal">Tarif gros</span>}
          </div>
        </div>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          {IS_DESKTOP && role === 'admin' && (
            <NavLink to="/admin" className={link}><Shield size={26} /><span>Admin</span></NavLink>
          )}
          <NavLink to="/" end className={link}><LayoutGrid size={26} /><span>Catalogue</span></NavLink>
          <NavLink to="/devis" className={link}>
            <FileText size={26} /><span>Panier</span>
            {count > 0 && <span className="absolute right-1 top-0.5 min-w-[22px] rounded-full bg-teal px-1.5 py-0.5 text-center text-xs font-extrabold text-navy shadow">{count}</span>}
          </NavLink>
          {!IS_DESKTOP && (
            <>
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
