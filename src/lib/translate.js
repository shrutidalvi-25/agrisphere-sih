// Free, keyless translation via MyMemory (https://mymemory.translated.net) —
// used to turn a farmer's voice/typed notes in Marathi or Hindi into English
// before storing, so buyers and FPOs who don't read that language can still
// read the note. Best-effort: if the API is unreachable or errors, we fall
// back to the original text rather than blocking lot creation over a
// translation failure.
export async function translateToEnglish(text, sourceLang) {
  if (!text || !text.trim() || sourceLang === 'en') return text

  try {
    const url = new URL('https://api.mymemory.translated.net/get')
    url.searchParams.set('q', text)
    url.searchParams.set('langpair', `${sourceLang}|en`)
    const res = await fetch(url.toString())
    if (!res.ok) return text
    const json = await res.json()
    return json?.responseData?.translatedText || text
  } catch {
    return text
  }
}
