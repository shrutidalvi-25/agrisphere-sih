import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Send, Truck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { CROPS, TRANSPORT_COST_PER_KM } from '../price-intel/sampleData'
import { haversineKm } from '../../lib/distance'
import { getListedLots } from '../lot-grading/lotService'
import { ReliabilityBadge } from '../reliability/ReliabilityBadge'
import { createOffer } from './offerService'
import { nativeNameFor } from '../../locales/languageMeta'

const GRADE_STYLE = {
  A: 'bg-primary-100 text-primary-800',
  B: 'bg-gold-50 text-gold-700',
  C: 'bg-red-50 text-red-700',
}

export function BrowseLots() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [crop, setCrop] = useState('')
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [offerLot, setOfferLot] = useState(null)
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')
  const [sending, setSending] = useState(false)
  const [sentFor, setSentFor] = useState(null)
  const [buyerLocation, setBuyerLocation] = useState(null)

  useEffect(() => {
    setLoading(true)
    getListedLots(crop ? { crop } : {}).then((data) => {
      setLots(data)
      setLoading(false)
    })
  }, [crop])

  // One-time capture, same pattern as the farmer's photo geotagging in
  // CreateLot.jsx — free browser Geolocation API, no external service.
  // Saved to the buyer's own profile so it's only asked for once, not on
  // every visit to this page.
  useEffect(() => {
    if (!user?.id) return
    if (profile?.lat && profile?.lng) {
      setBuyerLocation({ lat: profile.lat, lng: profile.lng })
      return
    }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setBuyerLocation(loc)
        supabase.from('profiles').update(loc).eq('id', user.id)
      },
      () => {}, // denied/unavailable — distance just won't show, no error UI needed
      { timeout: 8000 }
    )
  }, [user?.id, profile?.lat, profile?.lng])

  function openOffer(lot) {
    setOfferLot(lot)
    setPrice('')
    setQty(String(lot.quantity_quintal))
  }

  async function submitOffer(e) {
    e.preventDefault()
    if (Number(price) <= 0) {
      alert(t('browseLots.invalidPrice'))
      return
    }
    if (Number(qty) > Number(offerLot.quantity_quintal)) {
      alert(t('browseLots.quintalExceedsLot', { max: offerLot.quantity_quintal }))
      return
    }
    setSending(true)
    try {
      await createOffer({
        lotId: offerLot.id,
        buyerId: user.id,
        pricePerQuintal: Number(price),
        quantityQuintal: Number(qty),
      })
      setSentFor(offerLot.id)
      setOfferLot(null)
    } catch (err) {
      alert(err.message || t('browseLots.couldNotSendOffer'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.browseLots')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto">
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCrop('')}
            className={`shrink-0 rounded-2xl px-5 py-3 text-base font-semibold border-2 whitespace-nowrap ${
              crop === '' ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-primary-100 text-primary-700'
            }`}
          >
            {t('browseLots.all')}
          </button>
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
        ) : lots.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('browseLots.noLotsListed')}</p>
        ) : (
          <div className="space-y-3">
            {lots.map((lot) => (
              <div key={lot.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-primary-800 text-base">{lot.crop}</p>
                      {lot.grade && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_STYLE[lot.grade]}`}>
                          {t('common.grade')} {lot.grade}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{lot.quantity_quintal} {t('common.quintal')} · {lot.profiles?.name ?? t('common.unknownFarmer')}</p>
                    {lot.lat && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin size={11} /> {t('browseLots.locationShared')}
                      </p>
                    )}
                    {lot.lat && lot.lng && buyerLocation && (() => {
                      const distanceKm = haversineKm(buyerLocation.lat, buyerLocation.lng, lot.lat, lot.lng)
                      const transportCost = Math.round(distanceKm * TRANSPORT_COST_PER_KM)
                      return (
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Truck size={11} /> {distanceKm} km · ~₹{transportCost}/{t('common.quintal')} {t('browseLots.transportEstimate')}
                        </p>
                      )
                    })()}
                    <div className="mt-1.5">
                      <ReliabilityBadge farmerId={lot.farmer_id} />
                    </div>
                  </div>
                  {lot.photo_url && (
                    <img src={lot.photo_url} alt={lot.crop} className="w-16 h-16 rounded-xl object-cover" />
                  )}
                </div>

                {lot.notes && (
                  <p className="text-sm text-gray-500 mt-2 bg-cream rounded-xl p-2.5">
                    {lot.notes}
                    {lot.notes_language && (
                      <span className="text-xs text-gray-400">
                        {' '}· {t('browseLots.translatedFrom', { lang: nativeNameFor(lot.notes_language) })}
                      </span>
                    )}
                  </p>
                )}

                {sentFor === lot.id ? (
                  <p className="mt-3 text-sm font-semibold text-primary-700">{t('browseLots.offerSent')}</p>
                ) : offerLot?.id === lot.id ? (
                  <form onSubmit={submitOffer} className="mt-3 border-t pt-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder={t('browseLots.pricePerQuintalPlaceholder')}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="0.01"
                        step="0.01"
                        required
                        className="flex-1 rounded-xl border-2 border-primary-100 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder={t('browseLots.quintalPlaceholder')}
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        max={offerLot.quantity_quintal}
                        min="0.1"
                        step="0.1"
                        required
                        className="flex-1 rounded-xl border-2 border-primary-100 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={sending}
                        className="flex-1 flex items-center justify-center gap-1 bg-gold-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60"
                      >
                        <Send size={14} /> {sending ? t('browseLots.sending') : t('browseLots.sendOffer')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOfferLot(null)}
                        className="rounded-xl border-2 border-primary-100 text-primary-700 px-4 text-sm font-semibold"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => openOffer(lot)}
                    className="mt-3 w-full bg-primary-600 text-white rounded-xl py-2 text-sm font-semibold"
                  >
                    {t('browseLots.makeAnOffer')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
