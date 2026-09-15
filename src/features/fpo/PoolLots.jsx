import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Users, Check, Award } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { CROPS } from '../price-intel/sampleData'
import { getPoolableLots, getMyPools, createPool } from './poolingService'
import { getFpoIncentiveStatus } from './incentiveService'

const GRADE_STYLE = {
  A: 'bg-primary-100 text-primary-800',
  B: 'bg-gold-50 text-gold-700',
  C: 'bg-red-50 text-red-700',
}

export function PoolLots() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [crop, setCrop] = useState(CROPS[0])
  const [lots, setLots] = useState([])
  const [selected, setSelected] = useState([])
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [incentive, setIncentive] = useState(null)

  useEffect(() => {
    setLoading(true)
    setSelected([])
    Promise.all([getPoolableLots(crop), getMyPools(user.id)]).then(([lotsData, poolsData]) => {
      setLots(lotsData)
      setPools(poolsData)
      setLoading(false)
    })
  }, [crop, user.id])

  useEffect(() => {
    getFpoIncentiveStatus(user.id).then(setIncentive)
  }, [user.id, pools])

  function toggle(lotId) {
    setSelected((prev) => (prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]))
  }

  async function handleCreatePool() {
    if (selected.length === 0) return
    setCreating(true)
    try {
      await createPool({ fpoId: user.id, crop, lotIds: selected })
      const [lotsData, poolsData] = await Promise.all([getPoolableLots(crop), getMyPools(user.id)])
      setLots(lotsData)
      setPools(poolsData)
      setSelected([])
    } catch (err) {
      alert(err.message || t('poolLots.couldNotCreatePool'))
    } finally {
      setCreating(false)
    }
  }

  const totalQuantity = lots
    .filter((l) => selected.includes(l.id))
    .reduce((sum, l) => sum + Number(l.quantity_quintal), 0)

  return (
    <div className="min-h-screen bg-cream pb-24">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.poolLots')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto">
        {incentive && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 flex items-center gap-3">
            <div className={`rounded-full p-2.5 ${incentive.tier?.className ?? 'bg-gray-100 text-gray-400'}`}>
              <Award size={20} />
            </div>
            <div>
              <p className="font-bold text-primary-800">
                {incentive.tier ? `${incentive.tier.name} ${t('poolLots.fpoSuffix')}` : t('poolLots.notYetRanked')}
              </p>
              <p className="text-xs text-gray-500">
                {t('poolLots.quintalPooledAcross', { quintal: incentive.totalQuintal, pools: incentive.poolCount })}
                {incentive.nextTier && ` · ${t('poolLots.quintalToNextTier', { quintal: incentive.quintalToNextTier, tier: incentive.nextTier.name })}`}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              className={`shrink-0 rounded-2xl px-5 py-3 text-base font-semibold border-2 whitespace-nowrap ${
                crop === c ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-primary-100 text-primary-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-500 mb-2">{t('poolLots.listedLotsAvailable', { crop })}</p>
            {lots.length === 0 ? (
              <p className="text-center text-gray-400 py-6 bg-white rounded-2xl">{t('poolLots.noListedLots')}</p>
            ) : (
              <div className="space-y-2 mb-6">
                {lots.map((lot) => (
                  <button
                    key={lot.id}
                    onClick={() => toggle(lot.id)}
                    className={`w-full flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border-2 text-left ${
                      selected.includes(lot.id) ? 'border-gold-500' : 'border-transparent'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-primary-800">{lot.quantity_quintal} {t('common.quintal')}</p>
                        {lot.grade && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_STYLE[lot.grade]}`}>
                            {t('common.grade')} {lot.grade}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{lot.profiles?.name ?? t('common.unknownFarmer')}</p>
                    </div>
                    {selected.includes(lot.id) && (
                      <div className="bg-gold-600 text-white rounded-full p-1">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <p className="text-sm font-semibold text-gray-500 mb-2">{t('poolLots.myPools')}</p>
            {pools.length === 0 ? (
              <p className="text-center text-gray-400 py-6 bg-white rounded-2xl">{t('poolLots.noPoolsCreated')}</p>
            ) : (
              <div className="space-y-2">
                {pools.map((pool) => {
                  const total = pool.pooled_lot_members.reduce((sum, m) => sum + Number(m.lots.quantity_quintal), 0)
                  return (
                    <div key={pool.id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-primary-600" />
                        <p className="font-bold text-primary-800">{pool.crop}</p>
                        <span className="text-xs text-gray-400">· {pool.status === 'open' ? t('poolLots.statusOpen') : t('poolLots.statusClosed')}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {pool.pooled_lot_members.length} {t('poolLots.lotsPooled')} · {total} {t('poolLots.quintalTotal')}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-primary-100 p-4">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">{t('poolLots.lotsSelected', { count: selected.length, quintal: totalQuantity })}</p>
            <button
              onClick={handleCreatePool}
              disabled={creating}
              className="bg-gold-600 text-white rounded-xl px-5 py-3 font-semibold text-sm disabled:opacity-60"
            >
              {creating ? t('poolLots.creating') : t('poolLots.createPool')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
