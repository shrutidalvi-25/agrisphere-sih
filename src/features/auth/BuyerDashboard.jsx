import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, ShoppingCart, Handshake, Wallet, Flag, MapPin } from 'lucide-react'
import { useAuth } from './AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { BuyerSidebar } from './BuyerSidebar'
import dashboardBg from '../../assets/dashboard-bg.jpeg'
import { getListedLots } from '../lot-grading/lotService'
import { getMyOffers } from '../buyer-matching/offerService'
import { AnimatedBackground } from '../../components/core/animated-background'

const OFFER_STATUS_STYLE = {
  pending: 'bg-gray-100 text-gray-600',
  accepted: 'bg-primary-100 text-primary-800',
  rejected: 'bg-red-50 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

export function BuyerDashboard() {
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [offers, setOffers] = useState([])
  const [listedLots, setListedLots] = useState([])
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return
    Promise.all([getMyOffers(user.id), getListedLots()]).then(([o, l]) => {
      setOffers(o)
      setListedLots(l)
      setLoading(false)
    })
  }, [user?.id])

  const offersMade = offers.length
  const dealsClosed = offers.filter((o) => o.status === 'accepted').length
  const offersPending = offers.filter((o) => o.status === 'pending').length

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
      <BuyerSidebar name={profile?.name} onSignOut={signOut} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

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
          <StatCard label="Offers made" value={offersMade} />
          <StatCard label="Offers pending" value={offersPending} gold />
          <StatCard label="Deals closed" value={dealsClosed} highlight />
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-5 lg:p-6">
          <p className="text-lg font-bold text-primary-800 mb-4">Freshly listed lots</p>
          {loading ? (
            <p className="text-center text-gray-400 py-6">{t('common.loading')}</p>
          ) : listedLots.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">{t('browseLots.noLotsListed')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {listedLots.slice(0, 6).map((lot) => (
                <div key={lot.id} className="rounded-xl border-2 border-primary-50 p-4">
                  <p className="font-semibold text-primary-800 text-sm">{lot.crop}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lot.quantity_quintal} {t('common.quintal')} · {lot.profiles?.name || t('common.unknownFarmer')}</p>
                  {lot.lat && (
                    <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1.5">
                      <MapPin size={11} /> {t('browseLots.locationShared')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-5 lg:p-6">
          <p className="text-lg font-bold text-primary-800 mb-4">Recent offers</p>
          {offers.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">{t('myOffers.noOffersSent')}</p>
          ) : (
            <div className="space-y-2.5">
              {offers.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-primary-800">{o.lots?.crop}</p>
                    <p className="text-xs text-gray-500">₹{o.price_per_quintal}/{t('common.quintal')} · {o.quantity_quintal} {t('common.quintal')}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${OFFER_STATUS_STYLE[o.status]}`}>{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-lg font-bold text-primary-800 mb-4">Quick actions</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedBackground className="rounded-2xl bg-primary-50" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} enableHover>
              {[
                { icon: ShoppingCart, label: t('menu.browseLots'), to: '/buy/browse', gold: true },
                { icon: Handshake, label: t('menu.myOffers'), to: '/buy/offers' },
                { icon: Wallet, label: t('menu.payments'), to: '/payments' },
                { icon: Flag, label: t('menu.myComplaints'), to: '/complaints' },
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
