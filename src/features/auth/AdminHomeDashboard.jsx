import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, LayoutDashboard, ShieldCheck, Flag, Users, IndianRupee } from 'lucide-react'
import { useAuth } from './AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { AdminSidebar } from './AdminSidebar'
import dashboardBg from '../../assets/dashboard-bg.jpeg'
import { getPlatformStats } from '../admin/adminService'
import { AnimatedBackground } from '../../components/core/animated-background'

export function AdminHomeDashboard() {
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getPlatformStats().then(setStats).catch(() => setStats(null))
  }, [])

  return (
    <div
      className="min-h-screen lg:pl-[270px]"
      style={{
        backgroundImage: `url(${dashboardBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <AdminSidebar name={profile?.name} onSignOut={signOut} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <header className="flex items-center justify-between bg-white border-b-2 border-primary-100 px-5 py-4 lg:px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-primary-700">
            <Menu size={22} />
          </button>
          <div>
            <p className="text-xs text-gray-400">{t('home.welcome')}</p>
            <p className="text-base font-bold text-primary-800">{profile?.name}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="p-5 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label={t('admin.usersSection')} value={stats ? stats.farmers + stats.buyers + stats.fpos : undefined} />
          <StatCard label="Pending review" value={stats?.pendingVerification} gold />
          <StatCard label={t('admin.lotsSection')} value={stats?.lotsListed} />
          <StatCard
            label={t('admin.totalTransactedValue')}
            value={stats ? `₹${stats.totalTransactedValue.toLocaleString('en-IN')}` : undefined}
            highlight
          />
        </div>

        <section>
          <p className="text-lg font-bold text-primary-800 mb-4">Quick actions</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedBackground className="rounded-2xl bg-primary-50" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} enableHover>
              {[
                { icon: LayoutDashboard, label: 'Platform Stats', to: '/admin/dashboard', gold: true },
                { icon: ShieldCheck, label: t('menu.verificationQueue'), to: '/admin/verify' },
                { icon: Flag, label: t('menu.adminComplaints'), to: '/admin/complaints' },
              ].map(({ icon: Icon, label, to, gold }) => (
                <Link key={label} data-id={label} to={to} className="flex flex-col items-start gap-2.5 bg-white rounded-2xl p-4 shadow-sm" style={{ minHeight: '104px' }}>
                  <div className={`rounded-lg p-2 ${gold ? 'bg-gold-100' : 'bg-primary-100'}`}>
                    <Icon size={18} className={gold ? 'text-gold-700' : 'text-primary-700'} />
                  </div>
                  <span className={`text-sm font-semibold ${gold ? 'text-gold-700' : 'text-primary-800'}`}>{label}</span>
                </Link>
              ))}
            </AnimatedBackground>
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, gold, highlight }) {
  return (
    <div className={`rounded-2xl p-4 lg:p-5 shadow-sm ${highlight ? 'bg-gradient-to-br from-primary-500 to-primary-800' : 'bg-white'}`}>
      <p className={`text-xs mb-1 ${highlight ? 'text-primary-100' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-xl lg:text-2xl font-bold ${highlight ? 'text-white' : gold ? 'text-gold-600' : 'text-primary-700'}`}>{value ?? '—'}</p>
    </div>
  )
}
