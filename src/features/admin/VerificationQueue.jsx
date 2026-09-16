import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Flag, Sprout, ShoppingCart, Users, Search, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react'
import { getProfiles, setProfileStatus, getProfileActivity } from './adminService'

const ROLE_ICON = {
  farmer: Sprout,
  buyer: ShoppingCart,
  fpo: Users,
}

const TABS = [
  { value: 'active', key: 'tabPending' },
  { value: 'verified', key: 'tabVerified' },
  { value: 'flagged', key: 'tabFlagged' },
  { value: null, key: 'tabAll' },
]

export function VerificationQueue() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('active')
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [activityById, setActivityById] = useState({})
  const [flaggingId, setFlaggingId] = useState(null)
  const [flagReason, setFlagReason] = useState('')

  function load() {
    setLoading(true)
    getProfiles(tab).then((data) => {
      setProfiles(data)
      setLoading(false)
    })
  }

  useEffect(load, [tab])

  async function toggleExpand(profile) {
    if (expandedId === profile.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(profile.id)
    setFlaggingId(null)
    if (!activityById[profile.id]) {
      const activity = await getProfileActivity(profile.id, profile.role)
      setActivityById((prev) => ({ ...prev, [profile.id]: activity }))
    }
  }

  async function handleDecision(userId, status, reason = null) {
    setBusyId(userId)
    try {
      await setProfileStatus(userId, status, reason)
      setFlaggingId(null)
      setFlagReason('')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const filtered = profiles.filter((p) => {
    if (roleFilter && p.role !== roleFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.verificationQueue')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.value)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap ${
                tab === tb.value ? 'bg-primary-600 text-white' : 'bg-white text-primary-700 border-2 border-primary-100'
              }`}
            >
              {t(`admin.${tb.key}`)}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.searchPlaceholder')}
              className="w-full rounded-xl border-2 border-primary-100 pl-9 pr-3 py-2 text-sm bg-white"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border-2 border-primary-100 px-2 py-2 text-sm bg-white text-primary-800"
          >
            <option value="">{t('admin.allRoles')}</option>
            <option value="farmer">{t('roles.farmer')}</option>
            <option value="buyer">{t('roles.buyer')}</option>
            <option value="fpo">{t('roles.fpo')}</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('admin.noAccountsWaiting')}</p>
        ) : (
          filtered.map((profile) => {
            const RoleIcon = ROLE_ICON[profile.role] ?? Sprout
            const expanded = expandedId === profile.id
            const activity = activityById[profile.id]
            return (
              <div key={profile.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpand(profile)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 text-primary-700 rounded-full p-2">
                      <RoleIcon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-primary-800">{profile.name}</p>
                      <p className="text-sm text-gray-500">{t(`roles.${profile.role}`, profile.role)} · {profile.phone}</p>
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-primary-50">
                    <p className="text-xs text-gray-500 mt-3">
                      {t('admin.joinedOn')}: {new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity ? `${activity.count} ${activity.label}` : t('common.loading')}
                    </p>

                    {profile.status === 'flagged' && profile.flag_reason && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 mt-2">
                        {t('admin.flagReasonLabel')}: {profile.flag_reason}
                      </p>
                    )}

                    {flaggingId === profile.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                          placeholder={t('admin.flagReasonPlaceholder')}
                          rows={2}
                          className="w-full rounded-xl border-2 border-red-100 px-3 py-2 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecision(profile.id, 'flagged', flagReason)}
                            disabled={busyId === profile.id || !flagReason.trim()}
                            className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            {t('admin.confirmFlag')}
                          </button>
                          <button
                            onClick={() => { setFlaggingId(null); setFlagReason('') }}
                            className="flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg px-3"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        {profile.status !== 'verified' && (
                          <button
                            onClick={() => handleDecision(profile.id, 'verified')}
                            disabled={busyId === profile.id}
                            className="flex items-center gap-1.5 bg-primary-600 text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                          >
                            <Check size={14} /> {t('admin.verify')}
                          </button>
                        )}
                        {profile.status !== 'flagged' && (
                          <button
                            onClick={() => { setFlaggingId(profile.id); setFlagReason('') }}
                            disabled={busyId === profile.id}
                            className="flex items-center gap-1.5 bg-red-100 text-red-600 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                          >
                            <Flag size={14} /> {t('admin.flag')}
                          </button>
                        )}
                        {profile.status !== 'active' && (
                          <button
                            onClick={() => handleDecision(profile.id, 'active')}
                            disabled={busyId === profile.id}
                            className="flex items-center gap-1.5 bg-gray-100 text-gray-600 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                          >
                            <RotateCcw size={14} /> {t('admin.resetToPending')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>
    </div>
  )
}
