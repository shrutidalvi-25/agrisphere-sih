import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, IndianRupee, Camera, Sprout, Wallet, Flag, TrendingUp, TrendingDown, Truck, ArrowRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from './AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { FarmerSidebar } from './FarmerSidebar'
import dashboardBg from '../../assets/dashboard-bg.jpeg'
import { getFarmerStats, getMyFarmerIdNumber } from '../lot-grading/lotService'
import { CROPS, TRANSPORT_COST_PER_KM } from '../price-intel/sampleData'
import { getRankedPrices, getPriceHistory } from '../price-intel/priceService'
import { getSellHoldSignal } from '../price-intel/sellHoldService'
import { AnimatedBackground } from '../../components/core/animated-background'

const HISTORY_FILTERS = [
  { label: 'Today', days: 1 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-md px-3 py-2 border border-primary-100">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-primary-800">₹{payload[0].value}/quintal</p>
    </div>
  )
}

export function FarmerDashboard() {
  const { t } = useTranslation()
  const { user, profile, signOut } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [stats, setStats] = useState(null)
  const [farmerIdNumber, setFarmerIdNumber] = useState(null)

  const [crop, setCrop] = useState(CROPS[0])
  const [rows, setRows] = useState([])
  const [signal, setSignal] = useState(null)
  const [priceLoading, setPriceLoading] = useState(true)

  const [historyDays, setHistoryDays] = useState(7)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!user?.id) return
    getFarmerStats(user.id).then(setStats).catch(() => setStats(null))
    getMyFarmerIdNumber(user.id).then(setFarmerIdNumber).catch(() => setFarmerIdNumber(null))
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    setPriceLoading(true)
    Promise.all([getRankedPrices(crop), getSellHoldSignal(crop)]).then(([r, s]) => {
      if (!cancelled) {
        setRows(r)
        setSignal(s)
        setPriceLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [crop])

  useEffect(() => {
    let cancelled = false
    getPriceHistory(crop, historyDays).then((h) => {
      if (!cancelled) setHistory(h)
    })
    return () => { cancelled = true }
  }, [crop, historyDays])

  const topRow = rows[0]
  const transportCost = topRow ? Math.round(topRow.distanceKm * TRANSPORT_COST_PER_KM) : null

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
      <FarmerSidebar
        name={profile?.name}
        farmerIdNumber={farmerIdNumber}
        onSignOut={signOut}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

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
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <StatCard label="Lots listed" value={stats?.lotsListed} color="primary" />
          <StatCard label="Offers pending" value={stats?.offersPending} color="gold" />
          <StatCard
            label="This month"
            value={stats ? `₹${stats.earningsThisMonth.toLocaleString('en-IN')}` : undefined}
            color="primary"
            highlight
          />
        </div>

        {/* Today's Prices */}
        <section className="bg-white rounded-2xl shadow-sm p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-bold text-primary-800">{t('menu.todaysPrices')}</p>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-5 px-5 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
            {CROPS.map((c) => (
              <button
                key={c}
                onClick={() => setCrop(c)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold border-2 transition whitespace-nowrap ${
                  crop === c ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-primary-100 text-primary-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {signal?.recommendation && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4 w-fit ${signal.recommendation === 'hold' ? 'bg-gold-50 text-gold-700' : 'bg-primary-100 text-primary-800'}`}>
              {signal.recommendation === 'hold' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="text-sm font-semibold">
                {signal.recommendation === 'hold' ? t('priceDashboard.hold') : t('priceDashboard.sellNow')} · {signal.changePercent >= 0 ? '+' : ''}{signal.changePercent.toFixed(1)}%
              </span>
            </div>
          )}

          {priceLoading ? (
            <p className="text-center text-gray-400 py-6">{t('common.loading')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.slice(0, 6).map((r, i) => (
                <div key={r.mandi} className={`rounded-xl border-2 p-4 ${i === 0 ? 'border-gold-200 bg-gold-50/40' : 'border-primary-50'}`}>
                  <p className="text-xs text-gray-400 mb-0.5">{r.state}</p>
                  <p className="font-semibold text-primary-800 text-sm truncate">{r.mandi}</p>
                  <p className="text-xl font-bold text-gold-700 mt-1.5">₹{r.modal}</p>
                  <p className="text-[11px] text-gray-400">per quintal</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Price chart */}
        <section className="bg-white rounded-2xl shadow-sm p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-lg font-bold text-primary-800">{crop} price trend</p>
            <div className="flex gap-1.5">
              {HISTORY_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setHistoryDays(f.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    historyDays === f.days ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">
              Not enough real price history yet for this window — check back as more nightly data accumulates.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={history} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3c7f20" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3c7f20" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3c7f20"
                  strokeWidth={2.5}
                  fill="url(#priceFill)"
                  dot={{ r: 3, fill: '#3c7f20' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Net realisation */}
        {topRow && (
          <section className="bg-white rounded-2xl shadow-sm p-5 lg:p-6">
            <p className="text-lg font-bold text-primary-800 mb-4">Net realisation — {topRow.mandi}</p>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <FlowStep label="Mandi price" value={`₹${topRow.modal}`} />
              <ArrowRight size={18} className="text-gray-300 hidden sm:block" />
              <FlowStep label="Transport cost" value={`− ₹${transportCost}`} muted />
              <ArrowRight size={18} className="text-gray-300 hidden sm:block" />
              <FlowStep label="Net realisation" value={`₹${topRow.netRealisation}`} highlight />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-4">
              <Truck size={13} /> Based on {topRow.distanceKm} km distance · ₹{TRANSPORT_COST_PER_KM}/km/quintal estimate
            </p>
          </section>
        )}

        {/* Quick actions */}
        <section>
          <p className="text-lg font-bold text-primary-800 mb-4">Quick actions</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <AnimatedBackground
              className="rounded-2xl bg-primary-50"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              enableHover
            >
              {[
                { icon: IndianRupee, label: t('menu.todaysPrices'), to: '/prices', gold: true },
                { icon: Camera, label: t('menu.createLot'), to: '/lots/new' },
                { icon: Sprout, label: t('menu.myLots'), to: '/lots/mine' },
                { icon: Wallet, label: t('menu.payments'), to: '/payments' },
                { icon: Flag, label: t('menu.myComplaints'), to: '/complaints' },
              ].map(({ icon: Icon, label, to, gold }) => (
                <Link
                  key={label}
                  data-id={label}
                  to={to}
                  className="flex flex-col items-start gap-2.5 bg-white rounded-2xl p-4 shadow-sm"
                  style={{ minHeight: '104px' }}
                >
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

function StatCard({ label, value, color, highlight }) {
  return (
    <div className={`rounded-2xl p-4 lg:p-5 shadow-sm ${highlight ? 'bg-gradient-to-br from-primary-500 to-primary-800' : 'bg-white'}`}>
      <p className={`text-xs mb-1 ${highlight ? 'text-primary-100' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-xl lg:text-2xl font-bold ${highlight ? 'text-white' : color === 'gold' ? 'text-gold-600' : 'text-primary-700'}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function FlowStep({ label, value, muted, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-gold-700' : muted ? 'text-red-500' : 'text-primary-800'}`}>{value}</p>
    </div>
  )
}
