import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Phone, Mail, Lock, Sprout, ShoppingCart, Users, ShieldCheck } from 'lucide-react'
import { useAuth } from './AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'

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

export function LoginSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp, signIn } = useAuth()

  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'farmer' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-7">
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
              <Field icon={Phone} placeholder={t('auth.phone', 'Phone number')} value={form.phone}
                     onChange={(e) => update('phone', e.target.value)} />

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
            </>
          )}

          <Field icon={Mail} type="email" placeholder={t('auth.email', 'Email')} value={form.email}
                 onChange={(e) => update('email', e.target.value)} />
          <Field icon={Lock} type="password" placeholder={t('auth.password', 'Password')} value={form.password}
                 onChange={(e) => update('password', e.target.value)} />

          {error && <p className="text-base text-red-600">{error}</p>}
          {info && <p className="text-base text-primary-700">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-2xl py-4 text-lg font-semibold disabled:opacity-50 transition"
            style={{ minHeight: '56px' }}
          >
            {busy
              ? mode === 'login' ? t('auth.loggingIn', 'Logging in...') : t('auth.signingUp', 'Signing up...')
              : mode === 'login' ? t('auth.loginBtn', 'Log in') : t('auth.signupBtn', 'Sign up')}
          </button>
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
