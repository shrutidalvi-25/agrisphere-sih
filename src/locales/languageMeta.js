// Single source of truth for every language the app supports — the
// switcher, the "translated from X" labels, and the voice-input locale
// all read from this instead of each hardcoding their own mr/hi-only list.
// Adding a language later means adding one entry here (plus the locale
// JSON file), not hunting through five components.
export const LANGUAGES = [
  { code: 'mr', nativeName: 'मराठी', speechLocale: 'mr-IN' },
  { code: 'hi', nativeName: 'हिंदी', speechLocale: 'hi-IN' },
  { code: 'en', nativeName: 'English', speechLocale: 'en-IN' },
]

const BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]))

export function nativeNameFor(code) {
  return BY_CODE[code]?.nativeName ?? code
}

export function speechLocaleFor(code) {
  return BY_CODE[code]?.speechLocale ?? 'en-IN'
}
