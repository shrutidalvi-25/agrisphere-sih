import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Users, Boxes } from 'lucide-react'
import { useAuth } from './AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { FpoSidebar } from './FpoSidebar'
import dashboardBg from '../../assets/dashboard-bg.jpeg'
import { getMyPools } from '../fpo/poolingService'
import { AnimatedBackground } from '../../components/core/animated-background'

export function FpoDashboard() {
  const { t } = useTranslation()
  const { user, profile, signOut } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    getMyPools(user.id).then((data) => {
      setPools(data)
      setLoading(false)
    })
  }, [user?.id])

  const poolsCreated = pools.length
  const farmersPooled = new Set(
    pools.flatMap((p) => p.pooled_lot_members.map((m) => m.lots?.farmer_id).filter(Boolean))
  ).size
  const totalQuintal = pools.reduce(
    (sum, p) => sum + p.pooled_lot_members.reduce((s, m) => s + Number(m.lots?.quantity_quintal || 0), 0),
    0
  )

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
      <FpoSidebar name={profile?.name} onSignOut={signOut} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

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
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <StatCard label="Pools created" value={poolsCreated} />
          <StatCard label="Farmers pooled" value={farmersPooled} gold />
          <StatCard label="Total pooled" value={`${totalQuintal} ${t('common.quintal')}`} highlight />
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-5 lg:p-6">
          <p className="text-lg font-bold text-primary-800 mb-4">{t('poolLots.myPools')}</p>
          {loading ? (
            <p className="text-center text-gray-400 py-6">{t('common.loading')}</p>
          ) : pools.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">{t('poolLots.noPoolsCreated')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pools.slice(0, 6).map((pool) => {
                const quintal = pool.pooled_lot_members.reduce((s, m) => s + Number(m.lots?.quantity_quintal || 0), 0)
                return (
                  <div key={pool.id} className="rounded-xl border-2 border-primary-50 p-4">
                    <div className="flex items-center gap-2">
                      <Boxes size={15} className="text-primary-600" />
                      <p className="font-semibold text-primary-800 text-sm">{pool.crop}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {pool.pooled_lot_members.length} {t('poolLots.lotsPooled')} · {quintal} {t('poolLots.quintalTotal')}
                    </p>
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-2 ${pool.status === 'open' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-500'}`}>
                      {pool.status === 'open' ? t('poolLots.statusOpen') : t('poolLots.statusClosed')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <p className="text-lg font-bold text-primary-800 mb-4">Quick actions</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedBackground className="rounded-2xl bg-primary-50" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} enableHover>
              <Link data-id="pool" to="/fpo/pool" className="flex flex-col items-start gap-2.5 bg-white rounded-2xl p-4 shadow-sm" style={{ minHeight: '104px' }}>
                <div className="rounded-lg p-2 bg-primary-100">
                  <Users size={18} className="text-primary-700" />
                </div>
                <span className="text-sm font-semibold text-primary-800">{t('menu.poolLots')}</span>
              </Link>
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
