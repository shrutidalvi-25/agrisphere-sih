import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Flag, Sprout, ShoppingCart, Users } from 'lucide-react'
import { getPendingProfiles, setProfileStatus } from './adminService'

const ROLE_ICON = {
  farmer: Sprout,
  buyer: ShoppingCart,
  fpo: Users,
}

export function VerificationQueue() {
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  function load() {
    getPendingProfiles().then((data) => {
      setProfiles(data)
      setLoading(false)
    })
  }

  useEffect(load, [])

  async function handleDecision(userId, status) {
    setBusyId(userId)
    try {
      await setProfileStatus(userId, status)
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.verificationQueue')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : profiles.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('admin.noAccountsWaiting')}</p>
        ) : (
          profiles.map((profile) => {
            const RoleIcon = ROLE_ICON[profile.role] ?? Sprout
            return (
            <div key={profile.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 text-primary-700 rounded-full p-2">
                  <RoleIcon size={18} />
                </div>
                <div>
                  <p className="font-bold text-primary-800">{profile.name}</p>
                  <p className="text-sm text-gray-500">{t(`roles.${profile.role}`, profile.role)} · {profile.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecision(profile.id, 'verified')}
                  disabled={busyId === profile.id}
                  className="bg-primary-600 text-white rounded-lg p-2 disabled:opacity-60"
                  title={t('admin.verify')}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleDecision(profile.id, 'flagged')}
                  disabled={busyId === profile.id}
                  className="bg-red-100 text-red-600 rounded-lg p-2 disabled:opacity-60"
                  title={t('admin.flag')}
                >
                  <Flag size={16} />
                </button>
              </div>
            </div>
            )
          })
        )}
      </main>
    </div>
  )
}
