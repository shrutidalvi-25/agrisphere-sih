import { Link, useLocation } from 'react-router-dom'
import { LogOut, LayoutDashboard, Users, X } from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: Users, label: 'Pool Lots', to: '/fpo/pool' },
]

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

function SidebarContent({ name, onSignOut, onNavigate }) {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col h-full bg-primary-700 w-full">
      <div className="px-5 pt-7 pb-6 text-center border-b border-white/10">
        <div className="w-14 h-14 rounded-full bg-gold-600 flex items-center justify-center text-white text-lg font-bold mx-auto">
          {initials(name)}
        </div>
        <p className="text-white font-bold text-sm mt-3 truncate">{name}</p>
        <p className="text-primary-200 text-xs mt-0.5">FPO Manager</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active ? 'bg-white text-primary-800' : 'text-primary-100 hover:bg-white/10'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={onSignOut}
        className="flex items-center gap-3 px-3 py-2.5 mx-3 mb-6 rounded-xl text-sm font-medium text-primary-100 hover:bg-white/10 transition"
      >
        <LogOut size={18} />
        Log out
      </button>
    </div>
  )
}

export function FpoSidebar({ name, onSignOut, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside className="hidden lg:block fixed left-0 top-0 h-screen w-[270px] z-20">
        <SidebarContent name={name} onSignOut={onSignOut} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <div className="absolute left-0 top-0 h-full w-[270px]">
            <button onClick={onCloseMobile} className="absolute top-4 right-[-44px] text-white bg-black/30 rounded-lg p-2">
              <X size={20} />
            </button>
            <SidebarContent name={name} onSignOut={onSignOut} onNavigate={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  )
}
