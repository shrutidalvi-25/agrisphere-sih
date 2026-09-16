// Voice IVR buyer connect — a farmer calls a phone number, presses digits
// to pick a language then a crop, hears the buyers interested in that
// crop, and presses a digit to be bridged live to that buyer's phone.
//
// This is DTMF (keypad) menu logic with multilingual TTS prompts — plain
// rule-based IVR, not conversational AI. No speech recognition, no LLM in
// the call itself. Point your telephony provider's inbound-call webhook
// (Twilio "A Call Comes In", or the Exotel/Knowlarity equivalent) at this
// function's URL. Real deployment in India additionally needs DLT
// registration (TRAI) before a provider will carry the calls — this
// function itself works today against a trial/test number.
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Same order as src/features/price-intel/sampleData.js CROPS — keep these
// in sync; the digit a farmer presses is this array's 1-based index.
const CROPS = [
  'Onion', 'Tomato', 'Potato',
  'Soybean', 'Cotton', 'Tur', 'Gram', 'Wheat', 'Jowar', 'Bajra',
  'Groundnut', 'Grapes', 'Banana', 'Turmeric', 'Chilli',
]

const TTS_LOCALE: Record<string, string> = { mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN' }

const PROMPTS = {
  cropMenu: {
    mr: CROPS.map((c, i) => `${c} साठी ${i + 1}`).join(', ') + ' दाबा',
    hi: CROPS.map((c, i) => `${c} के लिए ${i + 1}`).join(', ') + ' दबाएं',
    en: CROPS.map((c, i) => `Press ${i + 1} for ${c}`).join(', '),
  },
  noBuyers: {
    mr: 'सध्या या पिकासाठी खरेदीदार उपलब्ध नाहीत.',
    hi: 'फ़िलहाल इस फ़सल के लिए कोई खरीदार उपलब्ध नहीं है।',
    en: 'No buyers are currently available for this crop.',
  },
  connecting: {
    mr: 'जोडत आहे...',
    hi: 'जोड़ रहे हैं...',
    en: 'Connecting your call now...',
  },
}

function xml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

function gather(prompts: { lang: string; text: string }[], numDigits = 2) {
  const says = prompts.map((p) => `<Say language="${p.lang}">${p.text}</Say>`).join('')
  return xml(`<Gather numDigits="${numDigits}" action="/ivr-webhook" method="POST" timeout="8">${says}</Gather>`)
}

function languageMenuTwiml() {
  return gather(
    [
      { lang: 'mr-IN', text: 'मराठीसाठी १ दाबा.' },
      { lang: 'hi-IN', text: 'हिंदी के लिए 2 दबाएं.' },
      { lang: 'en-IN', text: 'Press 3 for English.' },
    ],
    1
  )
}

function cropMenuTwiml(language: string) {
  const loc = TTS_LOCALE[language]
  return gather([{ lang: loc, text: PROMPTS.cropMenu[language as keyof typeof PROMPTS.cropMenu] }], 2)
}

function buyerListTwiml(buyers: { name: string }[], language: string) {
  const loc = TTS_LOCALE[language]
  if (buyers.length === 0) {
    return xml(`<Say language="${loc}">${PROMPTS.noBuyers[language as keyof typeof PROMPTS.noBuyers]}</Say><Hangup/>`)
  }
  const lines: Record<string, (b: { name: string }, i: number) => string> = {
    mr: (b, i) => `${b.name} साठी ${i + 1}`,
    hi: (b, i) => `${b.name} के लिए ${i + 1}`,
    en: (b, i) => `Press ${i + 1} for ${b.name}`,
  }
  const text = buyers.map((b, i) => lines[language](b, i)).join(', ')
  return gather([{ lang: loc, text }], 1)
}

function dialTwiml(buyerPhone: string, language: string) {
  const loc = TTS_LOCALE[language]
  return xml(`<Say language="${loc}">${PROMPTS.connecting[language as keyof typeof PROMPTS.connecting]}</Say><Dial>${buyerPhone}</Dial>`)
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Twilio posts application/x-www-form-urlencoded, not multipart — parse
  // it as plain form params rather than req.formData().
  const params = new URLSearchParams(await req.text())
  const callSid = params.get('CallSid') ?? ''
  const from = params.get('From') ?? ''
  const digits = params.get('Digits')

  let { data: session } = await supabase
    .from('ivr_sessions')
    .select('*')
    .eq('call_sid', callSid)
    .maybeSingle()

  if (!session) {
    // Signup stores phone as a plain 10-digit string (see LoginSignup.jsx),
    // but Twilio's From arrives as E.164 (+91XXXXXXXXXX) — compare on the
    // last 10 digits so either format matches.
    const last10 = from.replace(/\D/g, '').slice(-10)
    const { data: farmer } = await supabase.from('profiles').select('id').eq('phone', last10).maybeSingle()
    const { data: created } = await supabase
      .from('ivr_sessions')
      .insert({ call_sid: callSid, farmer_phone: from, farmer_id: farmer?.id ?? null })
      .select()
      .single()
    session = created
    return languageMenuTwiml()
  }

  if (session.step === 'language') {
    const language = { '1': 'mr', '2': 'hi', '3': 'en' }[digits ?? ''] ?? 'mr'
    await supabase.from('ivr_sessions').update({ language, step: 'crop', updated_at: new Date().toISOString() }).eq('call_sid', callSid)
    return cropMenuTwiml(language)
  }

  if (session.step === 'crop') {
    const cropIndex = Number(digits) - 1
    const crop = CROPS[cropIndex]
    if (!crop) return cropMenuTwiml(session.language) // invalid digit, ask again

    // Deliberately no ranking/scoring — just list buyers who exist,
    // preferring ones with prior activity on this crop if any are found.
    const { data: activeBuyers } = await supabase
      .from('offers')
      .select('buyer_id, lots!inner(crop), profiles!offers_buyer_id_profiles_fkey(name, phone)')
      .eq('lots.crop', crop)
      .limit(3)

    let buyers = (activeBuyers ?? [])
      .map((o: any) => o.profiles)
      .filter(Boolean)

    if (buyers.length === 0) {
      const { data: anyBuyers } = await supabase.from('profiles').select('name, phone').eq('role', 'buyer').limit(3)
      buyers = anyBuyers ?? []
    }

    // Stash the resolved buyer list on the session row so the next step
    // (a plain keypress with no other context) can look it back up.
    await supabase.from('ivr_sessions').update({ crop, step: 'buyer_list_ready', buyers_json: buyers }).eq('call_sid', callSid)

    return buyerListTwiml(buyers, session.language)
  }

  if (session.step === 'buyer_list_ready') {
    const buyers = session.buyers_json ?? []
    const chosen = buyers[Number(digits) - 1]
    if (!chosen) return buyerListTwiml(buyers, session.language)
    await supabase.from('ivr_sessions').update({ step: 'connecting' }).eq('call_sid', callSid)
    // Twilio's <Dial> requires E.164; stored phone is a plain 10-digit
    // string (see LoginSignup.jsx), so prefix the India country code.
    return dialTwiml(`+91${chosen.phone.replace(/\D/g, '').slice(-10)}`, session.language)
  }

  return xml('<Hangup/>')
})
