import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LogOut, Sprout, IndianRupee, Camera, ShoppingCart, Users, ShieldCheck, Wallet, Handshake, LayoutDashboard } from 'lucide-react'
import { useAuth } from './AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'

// Landing screen after login — shared header (auth, language switcher)
// plus a per-role menu of that role's modules.
//
// Layout follows the farmer-friendly rules: big tap targets, icon beside
// every label, no more than a handful of items on screen at once.
export function RoleHome() {
  const { t } = useTranslation()
  const { profile, role, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-cream">
      <header className="flex items-center justify-between bg-white border-b-2 border-primary-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary-600 text-white rounded-xl p-1.5">
            <Sprout size={22} />
          </div>
          <h1 className="text-lg font-bold text-primary-800">{t('app.name')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-primary-700 font-medium text-sm border-2 border-primary-100 rounded-xl px-3 py-2"
          >
            <LogOut size={16} />
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <main className="p-5 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
          <p className="text-lg text-gray-800">
            {t('home.welcome')}, <span className="font-bold text-primary-800">{profile?.name}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('home.role')}: {t(`roles.${role}`, role)}
          </p>
        </div>

        {role === 'farmer' && <MenuGrid items={[
          { icon: IndianRupee, label: t('menu.todaysPrices'), to: '/prices', gold: true },
          { icon: Camera, label: t('menu.createLot'), to: '/lots/new' },
          { icon: Sprout, label: t('menu.myLots'), to: '/lots/mine' },
          { icon: Wallet, label: t('menu.payments'), to: '/payments' },
        ]} />}
        {role === 'buyer' && <MenuGrid items={[
          { icon: ShoppingCart, label: t('menu.browseLots'), to: '/buy/browse' },
          { icon: Handshake, label: t('menu.myOffers'), to: '/buy/offers' },
          { icon: Wallet, label: t('menu.payments'), to: '/payments' },
        ]} />}
        {role === 'fpo' && <MenuGrid items={[
          { icon: Users, label: t('menu.poolLots'), to: '/fpo/pool' },
        ]} />}
        {role === 'admin' && <MenuGrid items={[
          { icon: LayoutDashboard, label: t('menu.dashboard'), to: '/admin/dashboard', gold: true },
          { icon: ShieldCheck, label: t('menu.verificationQueue'), to: '/admin/verify' },
        ]} />}
      </main>
    </div>
  )
}

function MenuGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map(({ icon: Icon, label, to, gold }) => (
        <Link
          key={label}
          to={to || '#'}
          className={`flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed rounded-2xl p-6 ${
            gold ? 'border-gold-100 text-gold-600' : 'border-primary-200 text-primary-700'
          }`}
          style={{ minHeight: '110px' }}
        >
          <Icon size={30} />
          <span className="text-sm font-semibold text-center">{label}</span>
        </Link>
      ))}
    </div>
  )
}
