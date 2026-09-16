import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getMyOffers, counterOffer, respondToOffer, MAX_NEGOTIATION_ROUNDS } from './offerService'
import { ReportButton } from '../complaints/ReportButton'

export function MyOffers() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const STATUS_LABEL = {
    pending: t('myOffers.statusPending'),
    accepted: t('myOffers.statusAccepted'),
    rejected: t('myOffers.statusRejected'),
    withdrawn: t('myOffers.statusWithdrawn'),
  }
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [counteringId, setCounteringId] = useState(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [busyId, setBusyId] = useState(null)

  function load() {
    getMyOffers(user.id).then((data) => {
      setOffers(data)
      setLoading(false)
    })
  }

  useEffect(load, [user.id])

  async function handleAccept(offer) {
    setBusyId(offer.id)
    try {
      await respondToOffer(offer.id, 'accepted', 7)
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function handleWithdraw(offer) {
    setBusyId(offer.id)
    try {
      await respondToOffer(offer.id, 'withdrawn')
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function handleCounter(offer) {
    if (!counterPrice || Number(counterPrice) <= 0) return
    setBusyId(offer.id)
    try {
      await counterOffer(offer, 'buyer', Number(counterPrice))
      setCounteringId(null)
      setCounterPrice('')
      load()
    } catch (err) {
      alert(err.message || t('myOffers.couldNotSendCounter'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.myOffers')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : offers.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('myOffers.noOffersSent')}</p>
        ) : (
          offers.map((offer) => {
            const isBuyerTurn = offer.status === 'pending' && offer.last_actor === 'farmer'
            const canCounter = isBuyerTurn && offer.round < MAX_NEGOTIATION_ROUNDS
            const isBusy = busyId === offer.id

            return (
              <div key={offer.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary-800">{offer.lots?.crop}</p>
                    <p className="text-sm text-gray-500">
                      ₹{offer.price_per_quintal}/quintal · {offer.quantity_quintal} quintal
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('myOffers.round')} {offer.round}/{MAX_NEGOTIATION_ROUNDS} ·{' '}
                      {offer.status === 'pending'
                        ? isBuyerTurn ? t('myOffers.yourTurnFarmerCountered') : t('myOffers.waitingForFarmer')
                        : STATUS_LABEL[offer.status]}
                    </p>
                  </div>
                  {offer.status === 'pending' && (
                    <button
                      onClick={() => handleWithdraw(offer)}
                      disabled={isBusy}
                      className="text-gray-400 disabled:opacity-60"
                      title={t('myOffers.withdrawOffer')}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {isBuyerTurn && (
                  <div className="flex gap-2 mt-3 border-t pt-3">
                    <button
                      onClick={() => handleAccept(offer)}
                      disabled={isBusy}
                      className="flex-1 bg-primary-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60"
                    >
                      {t('myOffers.accept')} ₹{offer.price_per_quintal}
                    </button>
                    {canCounter && (
                      <button
                        onClick={() => { setCounteringId(offer.id); setCounterPrice('') }}
                        disabled={isBusy}
                        className="flex items-center gap-1 bg-gold-100 text-gold-700 rounded-xl px-3 text-sm font-semibold disabled:opacity-60"
                      >
                        <RefreshCw size={14} /> {t('myOffers.counter')}
                      </button>
                    )}
                  </div>
                )}

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
                      onClick={() => handleCounter(offer)}
                      disabled={isBusy}
                      className="bg-primary-600 text-white rounded-lg px-3 text-sm font-semibold disabled:opacity-60"
                    >
                      {t('common.send')}
                    </button>
                    <button onClick={() => setCounteringId(null)} className="text-gray-400 text-sm px-2">
                      {t('common.cancel')}
                    </button>
                  </div>
                )}

                {offer.negotiation_history?.length > 1 && (
                  <p className="text-xs text-gray-400 mt-2 border-t pt-1.5">
                    {t('myOffers.history')}: {offer.negotiation_history.map((h) => `₹${h.price} (${h.actor})`).join(' → ')}
                  </p>
                )}

                {offer.status !== 'withdrawn' && (
                  <ReportButton recordType="offer" recordId={offer.id} againstId={offer.lots?.farmer_id} />
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
