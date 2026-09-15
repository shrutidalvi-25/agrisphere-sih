import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Camera, Mic, MicOff, MapPin, Check } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { CROPS } from '../price-intel/sampleData'
import { createLot } from './lotService'

// Web Speech API is Chrome-only, which is fine for this hackathon build —
// feature-detect and just hide the mic button everywhere else instead of
// erroring, since a farmer on a non-Chrome browser can still type.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

// Maps the app's own language switcher (LanguageSwitcher.jsx) to a Web
// Speech API locale, so the mic listens in whatever language the farmer
// already has the app set to, instead of being hardcoded to one language.
const SPEECH_LOCALE = { mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN' }

export function CreateLot() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()

  const [crop, setCrop] = useState(CROPS[0])
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [location, setLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [listening, setListening] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function captureLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  function toggleVoice() {
    if (!SpeechRecognition) return
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = SPEECH_LOCALE[i18n.language] || 'en-IN'
    recognition.interimResults = false
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!quantity || Number(quantity) <= 0) {
      setError(t('createLot.enterValidQuantity'))
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const lot = await createLot({
        farmerId: user.id,
        crop,
        quantityQuintal: Number(quantity),
        notes,
        photoFile,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        language: i18n.language,
      })
      setResult(lot)
    } catch (err) {
      setError(err.message || t('createLot.couldNotCreateLot'))
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm max-w-sm w-full text-center">
          <div className="mx-auto bg-primary-100 text-primary-700 rounded-full p-3 w-fit mb-3">
            <Check size={28} />
          </div>
          <h2 className="text-lg font-bold text-primary-800 mb-1">{t('createLot.lotCreated')}</h2>
          <p className="text-sm text-gray-500 mb-4">{result.crop} · {result.quantity_quintal} {t('common.quintal')}</p>
          <div
            className={`rounded-xl p-3 mb-4 ${result.grade === 'A' ? 'bg-primary-100' : result.grade === 'B' ? 'bg-gold-50' : 'bg-red-50'}`}
          >
            <p className="text-2xl font-bold text-primary-800">{t('common.grade')} {result.grade}</p>
            <p className="text-xs text-gray-500 mt-1">{t(`grading.${result.grade_reason}`)}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/lots/mine" className="flex-1 bg-primary-600 text-white rounded-xl py-3 font-semibold text-sm">
              {t('createLot.viewMyLots')}
            </Link>
            <Link to="/" className="flex-1 border-2 border-primary-100 text-primary-700 rounded-xl py-3 font-semibold text-sm">
              {t('createLot.home')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.createLot')}</h1>
      </header>

      <form onSubmit={handleSubmit} className="p-5 max-w-lg mx-auto space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">{t('createLot.cropLabel')}</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
            {CROPS.map((c) => (
              <button
                type="button"
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
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">{t('createLot.quantityLabel')}</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={t('createLot.quantityPlaceholder')}
            className="w-full rounded-2xl border-2 border-primary-100 px-4 py-3 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">{t('createLot.photoLabel')}</label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 rounded-2xl py-6 text-primary-600 font-semibold cursor-pointer">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-24 rounded-xl object-cover" />
            ) : (
              <>
                <Camera size={22} /> {t('createLot.addPhoto')}
              </>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">{t('createLot.notesLabel')}</label>
          <div className="flex gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('createLot.notesPlaceholder')}
              rows={3}
              className="flex-1 rounded-2xl border-2 border-primary-100 px-4 py-3 text-base"
            />
            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`shrink-0 rounded-2xl px-4 flex items-center justify-center ${
                  listening ? 'bg-red-500 text-white' : 'bg-primary-100 text-primary-700'
                }`}
              >
                {listening ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
            )}
          </div>
          {SpeechRecognition && i18n.language !== 'en' && (
            <p className="text-xs text-gray-400 mt-1">
              {t('createLot.speakIn', { lang: i18n.language === 'mr' ? t('createLot.marathi') : t('createLot.hindi') })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={captureLocation}
          className="w-full flex items-center justify-center gap-2 border-2 border-primary-100 rounded-2xl py-3 text-primary-700 font-semibold text-sm"
        >
          <MapPin size={18} />
          {locating ? t('createLot.gettingLocation') : location ? t('createLot.locationCaptured') : t('createLot.addLocation')}
        </button>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gold-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-60"
        >
          {submitting ? t('createLot.creating') : t('createLot.createLotBtn')}
        </button>
      </form>
    </div>
  )
}
