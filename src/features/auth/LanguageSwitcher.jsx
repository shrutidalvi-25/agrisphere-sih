import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

const LANGS = [
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className="relative">
      <Languages className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-600 pointer-events-none" size={18} />
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="border-2 border-primary-100 rounded-xl pl-8 pr-2 py-2 text-sm bg-white font-medium text-primary-800"
        aria-label="Language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}
