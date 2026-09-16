import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getMyComplaints } from './complaintService'

const STATUS_STYLE = {
  open: 'bg-gray-100 text-gray-600',
  in_review: 'bg-gold-50 text-gold-700',
  resolved: 'bg-primary-100 text-primary-800',
  rejected: 'bg-red-50 text-red-700',
}

export function MyComplaints() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const STATUS_LABEL = {
    open: t('complaints.statusOpen'),
    in_review: t('complaints.statusInReview'),
    resolved: t('complaints.statusResolved'),
    rejected: t('complaints.statusRejected'),
  }

  useEffect(() => {
    getMyComplaints(user.id)
      .then((data) => setComplaints(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.myComplaints')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : error ? (
          <p className="text-center text-red-500 py-10 text-sm">{error}</p>
        ) : complaints.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('complaints.noComplaintsYet')}</p>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-primary-800">{t(`complaints.category_${c.category}`)}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1.5">{c.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {c.resolution_note && (
                <p className="text-xs text-primary-700 bg-primary-50 rounded-lg px-2.5 py-1.5 mt-2">
                  {t('complaints.resolutionLabel')}: {c.resolution_note}
                </p>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
