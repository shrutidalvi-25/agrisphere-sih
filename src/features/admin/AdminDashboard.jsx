import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Sprout, ShoppingCart, Users, ShieldCheck, Package, Handshake, Wallet } from 'lucide-react'
import { getPlatformStats } from './adminService'

export function AdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlatformStats().then((data) => {
      setStats(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('admin.dashboard')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto">
        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : (
          <>
            {stats.pendingVerification > 0 && (
              <Link
                to="/admin/verify"
                className="flex items-center justify-between bg-gold-50 border-2 border-gold-100 rounded-2xl p-4 mb-5"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-gold-100 text-gold-700 rounded-full p-2">
                    <ShieldCheck size={18} />
                  </div>
                  <p className="text-sm font-semibold text-gold-800">
                    {t('admin.pendingVerificationCount', { count: stats.pendingVerification })}
                  </p>
                </div>
              </Link>
            )}

            <p className="text-sm font-semibold text-gray-500 mb-2">{t('admin.usersSection')}</p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatCard icon={Sprout} value={stats.farmers} label={t('roles.farmer')} />
              <StatCard icon={ShoppingCart} value={stats.buyers} label={t('roles.buyer')} />
              <StatCard icon={Users} value={stats.fpos} label={t('roles.fpo')} />
            </div>

            <p className="text-sm font-semibold text-gray-500 mb-2">{t('admin.lotsSection')}</p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatCard icon={Package} value={stats.lotsListed} label={t('myLots.statusListed')} />
              <StatCard icon={Package} value={stats.lotsSold} label={t('myLots.statusSold')} gold />
              <StatCard icon={Package} value={stats.lotsPooled} label={t('poolLots.lotsPooled')} />
            </div>

            <p className="text-sm font-semibold text-gray-500 mb-2">{t('admin.dealsSection')}</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard icon={Handshake} value={stats.offersAccepted} label={t('myOffers.statusAccepted')} />
              <StatCard icon={Handshake} value={stats.offersPending} label={t('myOffers.statusPending')} />
            </div>

            <p className="text-sm font-semibold text-gray-500 mb-2">{t('admin.paymentsSection')}</p>
            <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3 mb-3">
              <div className="bg-primary-100 text-primary-700 rounded-full p-2.5">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-xl font-bold text-primary-800">₹{stats.totalTransactedValue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500">{t('admin.totalTransactedValue')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={stats.paymentsPending} label={t('payments.statusPending')} />
              <StatCard value={stats.paymentsPaid} label={t('payments.statusPaid')} />
              <StatCard value={stats.paymentsReceived} label={t('payments.statusReceived')} gold />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, gold }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
      {Icon && <Icon size={16} className={`mx-auto mb-1 ${gold ? 'text-gold-600' : 'text-primary-600'}`} />}
      <p className={`text-lg font-bold ${gold ? 'text-gold-700' : 'text-primary-800'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
