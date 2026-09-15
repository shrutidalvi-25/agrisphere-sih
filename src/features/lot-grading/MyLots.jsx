import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, MapPin, ChevronDown, ChevronUp, Check, X, RefreshCw } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getMyLots } from './lotService'
import { getOffersForLot, respondToOffer, counterOffer, MAX_NEGOTIATION_ROUNDS } from '../buyer-matching/offerService'

const GRADE_STYLE = {
  A: 'bg-primary-100 text-primary-800',
  B: 'bg-gold-50 text-gold-700',
  C: 'bg-red-50 text-red-700',
}

export function MyLots() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const STATUS_LABEL = {
    listed: t('myLots.statusListed'),
    pooled: t('myLots.statusPooled'),
    sold: t('myLots.statusSold'),
    withdrawn: t('myLots.statusWithdrawn'),
  }
  const OFFER_STATUS_LABEL = {
    pending: t('myOffers.statusPending'),
    accepted: t('myOffers.statusAccepted'),
    rejected: t('myOffers.statusRejected'),
    withdrawn: t('myOffers.statusWithdrawn'),
  }
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [offersByLot, setOffersByLot] = useState({})
  const [counteringId, setCounteringId] = useState(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    getMyLots(user.id).then((data) => {
      setLots(data)
      setLoading(false)
    })
  }, [user.id])

  async function toggleExpand(lotId) {
    if (expanded === lotId) {
      setExpanded(null)
      return
    }
    setExpanded(lotId)
    if (!offersByLot[lotId]) {
      const offers = await getOffersForLot(lotId)
      setOffersByLot((prev) => ({ ...prev, [lotId]: offers }))
    }
  }

  async function refreshOffers(lotId) {
    const offers = await getOffersForLot(lotId)
    setOffersByLot((prev) => ({ ...prev, [lotId]: offers }))
  }

  async function handleRespond(lotId, offerId, status) {
    setBusyId(offerId)
    try {
      await respondToOffer(offerId, status, status === 'accepted' ? 7 : null)
      await refreshOffers(lotId)
      getMyLots(user.id).then(setLots)
    } finally {
      setBusyId(null)
    }
  }

  async function handleCounter(lotId, offer) {
    if (!counterPrice || Number(counterPrice) <= 0) return
    setBusyId(offer.id)
    try {
      await counterOffer(offer, 'farmer', Number(counterPrice))
      setCounteringId(null)
      setCounterPrice('')
      await refreshOffers(lotId)
    } catch (err) {
      alert(err.message || t('myLots.couldNotSendCounter'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center justify-between bg-white border-b-2 border-primary-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
          <h1 className="text-lg font-bold text-primary-800">{t('menu.myLots')}</h1>
        </div>
        <Link to="/lots/new" className="flex items-center gap-1 bg-gold-600 text-white rounded-xl px-3 py-2 text-sm font-semibold">
          <Plus size={16} /> {t('myLots.new')}
        </Link>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : lots.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('myLots.noLotsYet')}</p>
        ) : (
          lots.map((lot) => (
            <div key={lot.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => toggleExpand(lot.id)} className="w-full flex items-center justify-between p-4">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-primary-800">{lot.crop}</p>
                    {lot.grade && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_STYLE[lot.grade]}`}>
                        {t('common.grade')} {lot.grade}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{lot.quantity_quintal} {t('common.quintal')} · {STATUS_LABEL[lot.status]}</p>
                  {lot.lat && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <MapPin size={11} /> {t('myLots.locationAttached')}
                    </p>
                  )}
                </div>
                {expanded === lot.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>

              {expanded === lot.id && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {(lot.notes_original || lot.notes) && (
                    <div className="bg-cream rounded-xl p-3 mb-1">
                      <p className="text-sm text-gray-700">{lot.notes_original || lot.notes}</p>
                      {lot.notes_language && (
                        <p className="text-xs text-gray-400 mt-1">{t('myLots.shownTranslated')}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs font-semibold text-gray-500 mb-1">{t('myLots.offersFromBuyers')}</p>
                  {!offersByLot[lot.id] ? (
                    <p className="text-sm text-gray-400">{t('myLots.loadingOffers')}</p>
                  ) : offersByLot[lot.id].length === 0 ? (
                    <p className="text-sm text-gray-400">{t('myLots.noOffersYet')}</p>
                  ) : (
                    offersByLot[lot.id].map((offer) => {
                      const isFarmerTurn = offer.status === 'pending' && offer.last_actor === 'buyer'
                      const canCounter = isFarmerTurn && offer.round < MAX_NEGOTIATION_ROUNDS
                      const isBusy = busyId === offer.id

                      return (
                        <div key={offer.id} className="bg-cream rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-primary-800">₹{offer.price_per_quintal}/quintal</p>
                              <p className="text-xs text-gray-500">
                                {offer.quantity_quintal} {t('common.quintal')} · {t('myLots.round')} {offer.round}/{MAX_NEGOTIATION_ROUNDS} ·{' '}
                                {offer.status === 'pending'
                                  ? isFarmerTurn ? t('myLots.yourTurn') : t('myLots.waitingForBuyer')
                                  : OFFER_STATUS_LABEL[offer.status]}
                              </p>
                            </div>
                            {isFarmerTurn && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRespond(lot.id, offer.id, 'accepted')}
                                  disabled={isBusy}
                                  className="bg-primary-600 text-white rounded-lg p-2 disabled:opacity-60"
                                >
                                  <Check size={16} />
                                </button>
                                {canCounter && (
                                  <button
                                    onClick={() => { setCounteringId(offer.id); setCounterPrice('') }}
                                    disabled={isBusy}
                                    className="bg-gold-100 text-gold-700 rounded-lg p-2 disabled:opacity-60"
                                    title={t('myLots.counterOffer')}
                                  >
                                    <RefreshCw size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRespond(lot.id, offer.id, 'rejected')}
                                  disabled={isBusy}
                                  className="bg-red-100 text-red-600 rounded-lg p-2 disabled:opacity-60"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </div>

                          {counteringId === offer.id && (
                            <div className="flex gap-2 mt-2">
                              <input
                                type="number"
                                value={counterPrice}
                                onChange={(e) => setCounterPrice(e.target.value)}
                                placeholder={t('common.yourPriceLabel')}
                                className="flex-1 rounded-lg border-2 border-primary-100 px-3 py-1.5 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleCounter(lot.id, offer)}
                                disabled={isBusy}
                                className="bg-primary-600 text-white rounded-lg px-3 text-sm font-semibold disabled:opacity-60"
                              >
                                {t('common.send')}
                              </button>
                              <button
                                onClick={() => setCounteringId(null)}
                                className="text-gray-400 text-sm px-2"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          )}

                          {offer.negotiation_history?.length > 1 && (
                            <p className="text-xs text-gray-400 mt-2 border-t pt-1.5">
                              {t('myLots.history')}: {offer.negotiation_history.map((h) => `₹${h.price} (${h.actor})`).join(' → ')}
                            </p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
