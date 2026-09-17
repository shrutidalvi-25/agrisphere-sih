import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, PhoneCall, Volume2 } from 'lucide-react'
import { CROPS } from '../price-intel/sampleData'
import { getBuyersForCrop } from './voiceIvrService'

// Browser-based stand-in for the real phone IVR built in
// supabase/functions/ivr-webhook/index.ts — same script, same "no
// ranking, just list buyers" logic, same three languages. This version
// runs entirely client-side using the Web Speech API's speechSynthesis
// (real, audible AI-generated voice) instead of a live phone call,
// because getting an actual Indian Twilio number requires DLT
// registration that isn't feasible to complete in a hackathon timeline.
// The farmer only ever taps a number here — there's no speech
// recognition in either version.
const TTS_LOCALE = { mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN' }

const PROMPTS = {
  language: {
    mr: 'मराठीसाठी १ दाबा.',
    hi: 'हिंदी के लिए 2 दबाएं.',
    en: 'Press 3 for English.',
  },
  cropMenuIntro: {
    mr: 'तुम्हाला कोणते पीक विकायचे आहे ते निवडा.',
    hi: 'आप कौन सी फ़सल बेचना चाहते हैं, चुनें।',
    en: 'Choose which crop you want to sell.',
  },
  buyersIntro: {
    mr: 'या पिकासाठी हे खरेदीदार उपलब्ध आहेत.',
    hi: 'इस फ़सल के लिए ये खरीदार उपलब्ध हैं।',
    en: 'Here are the buyers available for this crop.',
  },
  noBuyers: {
    mr: 'सध्या या पिकासाठी खरेदीदार उपलब्ध नाहीत.',
    hi: 'फ़िलहाल इस फ़सल के लिए कोई खरीदार उपलब्ध नहीं है।',
    en: 'No buyers are currently available for this crop.',
  },
  connecting: {
    mr: 'जोडत आहे. खालील बटणावर दाबून कॉल करा.',
    hi: 'जोड़ रहे हैं। कॉल करने के लिए नीचे दिए गए बटन को दबाएं।',
    en: 'Connecting. Tap the button below to call.',
  },
}

function speak(text, lang) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang
  const voices = window.speechSynthesis.getVoices()
  const match = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang?.startsWith(lang.split('-')[0]))
  if (match) utter.voice = match
  window.speechSynthesis.speak(utter)
}

export function VoiceCallSell() {
  const [step, setStep] = useState('language') // language | crop | buyers | connecting
  const [language, setLanguage] = useState(null)
  const [crop, setCrop] = useState(null)
  const [buyers, setBuyers] = useState([])
  const [loadingBuyers, setLoadingBuyers] = useState(false)
  const [chosenBuyer, setChosenBuyer] = useState(null)
  const [caption, setCaption] = useState('')
  const spokenOnce = useRef(false)

  const voicesReadyRef = useRef(false)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const markReady = () => { voicesReadyRef.current = true }
    window.speechSynthesis.addEventListener('voiceschanged', markReady)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', markReady)
  }, [])

  // Speak the language menu once on load, in all three languages back to
  // back (the farmer hasn't picked one yet, so every language needs to be
  // heard, same as the real phone version).
  useEffect(() => {
    if (spokenOnce.current) return
    spokenOnce.current = true
    const text = `${PROMPTS.language.mr} ${PROMPTS.language.hi} ${PROMPTS.language.en}`
    setCaption(text)
    speak(text, 'en-IN')
  }, [])

  function handleLanguage(lang) {
    setLanguage(lang)
    setStep('crop')
    const text = PROMPTS.cropMenuIntro[lang]
    setCaption(text)
    speak(text, TTS_LOCALE[lang])
  }

  async function handleCrop(cropName) {
    setCrop(cropName)
    setLoadingBuyers(true)
    setStep('buyers')
    const list = await getBuyersForCrop(cropName)
    setBuyers(list)
    setLoadingBuyers(false)
    const text = list.length > 0 ? PROMPTS.buyersIntro[language] : PROMPTS.noBuyers[language]
    setCaption(text)
    speak(text, TTS_LOCALE[language])
  }

  function handleBuyer(buyer) {
    setChosenBuyer(buyer)
    setStep('connecting')
    const text = PROMPTS.connecting[language]
    setCaption(text)
    speak(text, TTS_LOCALE[language])
  }

  function reset() {
    setStep('language')
    setLanguage(null)
    setCrop(null)
    setBuyers([])
    setChosenBuyer(null)
    spokenOnce.current = false
    const text = `${PROMPTS.language.mr} ${PROMPTS.language.hi} ${PROMPTS.language.en}`
    setCaption(text)
    speak(text, 'en-IN')
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">Call to Sell</h1>
      </header>

      <main className="p-5 max-w-sm mx-auto space-y-5">
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
          <div className="mx-auto bg-primary-100 text-primary-700 rounded-full p-4 w-fit mb-3">
            <PhoneCall size={28} />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-2">
            <Volume2 size={13} /> AI voice is speaking
          </p>
          <p className="text-sm text-primary-900">{caption}</p>
        </div>

        {step === 'language' && (
          <div className="grid grid-cols-1 gap-2.5">
            <KeyButton onClick={() => handleLanguage('mr')} digit="1" label="मराठी" />
            <KeyButton onClick={() => handleLanguage('hi')} digit="2" label="हिंदी" />
            <KeyButton onClick={() => handleLanguage('en')} digit="3" label="English" />
          </div>
        )}

        {step === 'crop' && (
          <div className="grid grid-cols-2 gap-2.5">
            {CROPS.map((c, i) => (
              <KeyButton key={c} onClick={() => handleCrop(c)} digit={i + 1} label={c} compact />
            ))}
          </div>
        )}

        {step === 'buyers' && (
          <div className="space-y-2.5">
            {loadingBuyers ? (
              <p className="text-center text-gray-400 py-6">Loading buyers...</p>
            ) : buyers.length === 0 ? (
              <button onClick={reset} className="w-full bg-white border-2 border-primary-100 text-primary-700 rounded-2xl py-3 font-semibold text-sm">
                Try another crop
              </button>
            ) : (
              buyers.map((b, i) => (
                <KeyButton key={i} onClick={() => handleBuyer(b)} digit={i + 1} label={b.name} />
              ))
            )}
          </div>
        )}

        {step === 'connecting' && chosenBuyer && (
          <div className="space-y-3">
            <a
              href={`tel:+91${(chosenBuyer.phone || '').replace(/\D/g, '').slice(-10)}`}
              className="block text-center bg-primary-700 text-white rounded-2xl py-4 font-bold text-base"
            >
              Call {chosenBuyer.name}
            </a>
            <button onClick={reset} className="w-full text-gray-400 text-sm py-2">
              Start over
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function KeyButton({ onClick, digit, label, compact }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 bg-white border-2 border-primary-100 rounded-2xl text-left ${compact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`}
    >
      <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white text-sm font-bold">
        {digit}
      </span>
      <span className="text-sm font-semibold text-primary-800 truncate">{label}</span>
    </button>
  )
}
