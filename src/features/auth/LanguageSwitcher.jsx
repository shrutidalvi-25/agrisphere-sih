import { useTranslation } from 'react-i18next'
import { Languages, Check } from 'lucide-react'
import { LANGUAGES } from '../../locales/languageMeta'
import {
  MorphingPopover,
  MorphingPopoverTrigger,
  MorphingPopoverContent,
  useMorphingPopover,
} from '../../components/core/morphing-popover'

function LanguageOptions() {
  const { i18n } = useTranslation()
  const { setOpen } = useMorphingPopover()

  return (
    <>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => {
            i18n.changeLanguage(l.code)
            setOpen(false)
          }}
          className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left ${
            l.code === i18n.language ? 'bg-primary-50 text-primary-800' : 'text-gray-600 hover:bg-primary-50/60'
          }`}
        >
          {l.nativeName}
          {l.code === i18n.language && <Check size={14} className="text-primary-600" />}
        </button>
      ))}
    </>
  )
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  return (
    <MorphingPopover>
      <MorphingPopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 border-2 border-primary-100 rounded-xl pl-3 pr-2.5 py-2 text-sm bg-white font-medium text-primary-800"
          aria-label="Language"
        >
          <Languages size={16} className="text-primary-600" />
          {current.nativeName}
        </button>
      </MorphingPopoverTrigger>
      <MorphingPopoverContent className="w-36 p-1.5">
        <LanguageOptions />
      </MorphingPopoverContent>
    </MorphingPopover>
  )
}
