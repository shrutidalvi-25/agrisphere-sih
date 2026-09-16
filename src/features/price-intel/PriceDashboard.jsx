import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, TrendingUp, TrendingDown, Truck, Bell } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CROPS } from './sampleData'
import { getRankedPrices } from './priceService'
import { getSellHoldSignal } from './sellHoldService'

export function PriceDashboard() {
  const { t } = useTranslation()
  const [crop, setCrop] = useState(CROPS[0])
  const [rows, setRows] = useState([])
  const [signal, setSignal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getRankedPrices(crop), getSellHoldSignal(crop)]).then(([priceData, signalData]) => {
      if (!cancelled) {
        setRows(priceData)
        setSignal(signalData)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [crop])

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.todaysPrices')}</h1>
      </header>

      <main className="p-5 max-w-lg lg:max-w-6xl mx-auto">
        {/* Crop selector — horizontal-scroll pill strip, single tap, works for many crops */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              className={`shrink-0 rounded-2xl px-5 py-3 text-base font-semibold border-2 transition whitespace-nowrap ${
                crop === c
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white border-primary-100 text-primary-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : (
          /* On phones this is one stacked column, same as before. On wide
             screens it splits into a left "advisory" column (sell/hold +
             early alert) and a right "data" column (chart + ranked mandi
             list) instead of one narrow strip stretched down the page. */
          <div className="lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
            <div className="lg:col-span-2">
              {/* Sell / Hold advisor badge */}
              {signal && signal.recommendation && (
                <div
                  className={`flex items-center gap-3 rounded-2xl p-4 mb-5 ${
                    signal.recommendation === 'hold' ? 'bg-gold-50' : 'bg-primary-100'
                  }`}
                >
                  <div
                    className={`rounded-full p-2 ${
                      signal.recommendation === 'hold' ? 'bg-gold-500' : 'bg-primary-600'
                    }`}
                  >
                    {signal.recommendation === 'hold' ? (
                      <TrendingUp size={20} className="text-white" />
                    ) : (
                      <TrendingDown size={20} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold text-base ${signal.recommendation === 'hold' ? 'text-gold-700' : 'text-primary-800'}`}>
                      {signal.recommendation === 'hold' ? t('priceDashboard.hold') : t('priceDashboard.sellNow')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {signal.recommendation === 'hold'
                        ? t('priceDashboard.reasonHold', { percent: signal.changePercent.toFixed(1) })
                        : t('priceDashboard.reasonSell', {
                            direction: signal.changePercent <= 0 ? t('priceDashboard.down') : t('priceDashboard.flat'),
                            percent: Math.abs(signal.changePercent).toFixed(1),
                          })}
                    </p>
                  </div>
                </div>
              )}

              {/* Early alert — simple trend projection, not a trained forecast */}
              {signal?.projection && (
                <div className="flex items-start gap-3 rounded-2xl p-4 mb-5 bg-white shadow-sm border-2 border-primary-100">
                  <div className="rounded-full p-2 bg-primary-100 text-primary-700 shrink-0">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-primary-800">{t('priceDashboard.earlyAlert')}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {signal.projection.days.map((d, i) => (
                        <span key={d.daysAhead}>
                          {i > 0 && ' · '}
                          {t('priceDashboard.inDays', { days: d.daysAhead })}: {d.projectedChangePercent >= 0 ? '+' : ''}
                          {d.projectedChangePercent.toFixed(1)}%
                        </span>
                      ))}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {signal.projection.fromModel ? t('priceDashboard.modelDisclaimer') : t('priceDashboard.forecastDisclaimer')}
                    </p>
                  </div>
                </div>
              )}

              {rows.some((r) => r.isInterstate) && (
                <p className="hidden lg:block text-xs text-gray-400 px-1">
                  {t('priceDashboard.interstateNote')}
                </p>
              )}
            </div>

            <div className="lg:col-span-3">
              {/* Chart */}
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
                <p className="text-sm font-semibold text-gray-500 mb-2">{t('priceDashboard.netRealisationChart')}</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={rows} margin={{ left: -20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis
                      dataKey="mandi"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(mandi) => (mandi.length > 14 ? `${mandi.slice(0, 14)}…` : mandi)}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="netRealisation" fill="#c9972e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Ranked list */}
              <div className="space-y-3">
                {rows.map((r, i) => (
                  <div key={r.mandi} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent"
                       style={i === 0 ? { borderColor: 'var(--color-gold-500)' } : undefined}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-primary-800 text-base">{r.mandi}</p>
                          {i === 0 && (
                            <span className="flex items-center gap-1 bg-gold-50 text-gold-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              <TrendingUp size={12} /> {t('priceDashboard.bestOption')}
                            </span>
                          )}
                        </div>
                        <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                          <MapPin size={13} /> {r.distanceKm} {t('priceDashboard.kmAway')}{r.state ? ` · ${r.state}` : ''}
                        </p>
                        {r.isInterstate && (
                          <p className="flex items-center gap-1 text-xs text-primary-600 font-medium mt-1">
                            <Truck size={12} /> {t('priceDashboard.crossesState')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gold-600">₹{r.netRealisation}</p>
                        <p className="text-xs text-gray-400">{t('priceDashboard.netPerQuintal')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 border-t pt-2">
                      {t('priceDashboard.mandiPrice')}: ₹{r.modal} (₹{r.min}–₹{r.max}) — {t('priceDashboard.afterTransport')}
                    </p>
                  </div>
                ))}
              </div>

              {rows.some((r) => r.isInterstate) && (
                <p className="lg:hidden text-xs text-gray-400 mt-4 px-1">
                  {t('priceDashboard.interstateNote')}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
