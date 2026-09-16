import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Phone, Mail, Lock, Sprout, ShoppingCart, Users, ShieldCheck, IdCard, CreditCard, Eye, EyeOff } from 'lucide-react'
import { useAuth } from './AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import fieldBg from '../../assets/farmer-field-bg.png'
import { GlowEffect } from '../../components/core/glow-effect'
import { TextMorph } from '../../components/core/text-morph'

// Signup is restricted to well-known email providers — this doesn't prove
// an address is real by itself, but combined with Supabase's own signup
// confirmation email (see `needsEmailConfirmation` below), a made-up
// address at one of these domains still can't complete signup since the
// confirmation link would never arrive.
const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'rediffmail.com']

// Indian mobile numbers: exactly 10 digits, starting 6-9. Rejects landlines,
// too-short/long input, and letters — this is a format check, not proof the
// number is reachable (that would need an OTP/SMS verification step, which
// is out of scope while the SMS integration is paused — see the price-alert
// feature's own notes).
const PHONE_REGEX = /^[6-9]\d{9}$/

// Aadhaar numbers are always exactly 12 digits. Same honesty caveat as the
// email domain check: this proves the farmer typed something Aadhaar-shaped,
// not that UIDAI has verified it — real verification needs UIDAI's own
// eKYC API, which isn't freely available.
const AADHAAR_REGEX = /^\d{12}$/

const ROLES = [
  { value: 'farmer', label: 'Farmer', icon: Sprout },
  { value: 'buyer', label: 'Buyer / Processor', icon: ShoppingCart },
  { value: 'fpo', label: 'FPO Manager', icon: Users },
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
]

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600" size={22} />
      <input
        {...props}
        className="w-full border-2 border-primary-100 focus:border-primary-500 outline-none rounded-2xl pl-13 pr-4 py-4 text-base bg-white"
        style={{ paddingLeft: '3.2rem' }}
      />
    </div>
  )
}

function PasswordField({ show, onToggleShow, ...props }) {
  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600" size={22} />
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className="w-full border-2 border-primary-100 focus:border-primary-500 outline-none rounded-2xl pl-13 pr-12 py-4 text-base bg-white"
        style={{ paddingLeft: '3.2rem' }}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
        tabIndex={-1}
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  )
}

export function LoginSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp, signIn } = useAuth()

  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '', confirmPassword: '', role: 'farmer',
    farmerIdNumber: '', aadhaarId: '',
  })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!form.email || !form.password) {
      setError(t('auth.errorRequired', 'Email and password are required.'))
      return
    }
    if (mode === 'signup' && !form.name) {
      setError(t('auth.errorName', 'Please enter your name.'))
      return
    }
    if (mode === 'signup') {
      const domain = form.email.split('@')[1]?.toLowerCase()
      if (!domain || !ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        setError(t('auth.errorEmailDomain'))
        return
      }
      if (!PHONE_REGEX.test(form.phone)) {
        setError(t('auth.errorInvalidPhone'))
        return
      }
      if (form.role === 'farmer' && !AADHAAR_REGEX.test(form.aadhaarId)) {
        setError(t('auth.errorInvalidAadhaar'))
        return
      }
      if (form.password !== form.confirmPassword) {
        setError(t('auth.errorPasswordMismatch'))
        return
      }
    }

    setBusy(true)
    const result =
      mode === 'signup'
        ? await signUp(form)
        : await signIn({ email: form.email, password: form.password })
    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }
    if (result.needsEmailConfirmation) {
      setError('')
      setInfo(t('auth.checkEmail', 'Account created — check your email to confirm it, then log in.'))
      setMode('login')
      return
    }
    navigate('/')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative bg-cover bg-center"
      style={{ backgroundImage: `url(${fieldBg})` }}
    >
      <div className="absolute inset-0 bg-black/35" />
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-7 relative">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 text-white rounded-xl p-2">
              <Sprout size={26} />
            </div>
            <h1 className="text-2xl font-bold text-primary-800">{t('app.name', 'AgriSphere')}</h1>
          </div>
          <LanguageSwitcher />
        </div>
        <p className="text-base text-gray-600 mb-6 mt-2">
          {mode === 'login' ? t('auth.loginTitle', 'Log in to your account') : t('auth.signupTitle', 'Create an account')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Field icon={User} placeholder={t('auth.name', 'Full name')} value={form.name}
                     onChange={(e) => update('name', e.target.value)} />
              <Field icon={Phone} type="tel" placeholder={t('auth.phone', 'Phone number')} value={form.phone}
                     onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />

              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => {
                  const Icon = r.icon
                  const selected = form.role === r.value
                  return (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => update('role', r.value)}
                      className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-medium text-left transition ${
                        selected
                          ? 'border-primary-600 bg-primary-50 text-primary-800'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <Icon size={20} className={selected ? 'text-primary-700' : 'text-gray-400'} />
                      {r.label}
                    </button>
                  )
                })}
              </div>

              {form.role === 'farmer' && (
                <>
                  <Field icon={IdCard} placeholder={t('auth.farmerIdOptional')} value={form.farmerIdNumber}
                         onChange={(e) => update('farmerIdNumber', e.target.value)} />
                  <Field icon={CreditCard} type="tel" placeholder={t('auth.aadhaarId')} value={form.aadhaarId}
                         onChange={(e) => update('aadhaarId', e.target.value.replace(/\D/g, '').slice(0, 12))} />
                </>
              )}
            </>
          )}

          <Field icon={Mail} type="email" placeholder={t('auth.email', 'Email')} value={form.email}
                 onChange={(e) => update('email', e.target.value)} />
          <PasswordField
            show={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
            placeholder={t('auth.password', 'Password')}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />
          {mode === 'signup' && (
            <PasswordField
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((s) => !s)}
              placeholder={t('auth.confirmPassword')}
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
            />
          )}

          {error && <p className="text-base text-red-600">{error}</p>}
          {info && <p className="text-base text-primary-700">{info}</p>}

          <div className="relative group">
            <GlowEffect
              colors={['#3c7f20', '#b8860b', '#4c9a2a', '#c9972e']}
              mode="colorShift"
              blur="medium"
              duration={4}
              className={`rounded-2xl transition-opacity duration-300 ${
                busy ? 'opacity-90' : 'opacity-0 group-hover:opacity-80'
              }`}
            />
            <button
              type="submit"
              disabled={busy}
              className="relative w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-2xl py-4 text-lg font-semibold disabled:opacity-50 transition"
              style={{ minHeight: '56px' }}
            >
              <TextMorph>
                {busy
                  ? mode === 'login' ? t('auth.loggingIn', 'Logging in...') : t('auth.signingUp', 'Signing up...')
                  : mode === 'login' ? t('auth.loginBtn', 'Log in') : t('auth.signupBtn', 'Sign up')}
              </TextMorph>
            </button>
          </div>
        </form>

        <button
          className="w-full text-center text-base text-primary-700 font-medium mt-5 py-2"
          onClick={() => {
            setError('')
            setMode(mode === 'login' ? 'signup' : 'login')
          }}
        >
          {mode === 'login'
            ? t('auth.toSignup', "Don't have an account? Sign up")
            : t('auth.toLogin', 'Already have an account? Log in')}
        </button>
      </div>
    </div>
  )
}
