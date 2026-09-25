import { NavLink, Outlet } from 'react-router-dom'
import { FileText, LayoutGrid } from 'lucide-react'
import { useQuote } from '../store/quote'

export function Layout() {
  const { count } = useQuote()
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="flex h-full flex-col">
      <header className="no-print flex items-center gap-4 bg-navy px-5 py-3 shadow">
        <img src={import.meta.env.BASE_URL + 'logo.png'} alt="Les Cinq Frères" className="h-9 rounded bg-white p-1" />
        <div className="hidden sm:block">
          <div className="text-sm font-bold leading-tight text-white">Espace Commercial</div>
          <div className="text-[11px] leading-tight text-teal">Société Magasin Les Cinq Frères</div>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          <NavLink to="/" end className={link}><LayoutGrid size={16} /> Catalogue</NavLink>
          <NavLink to="/devis" className={link}>
            <FileText size={16} /> Devis
            {count > 0 && (
              <span className="rounded-full bg-teal px-1.5 text-[11px] font-bold text-navy">{count}</span>
            )}
          </NavLink>
        </nav>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
