import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { getComplaints, resolveComplaint } from './complaintService'

const TABS = [
  { value: 'open', key: 'statusOpen' },
  { value: 'in_review', key: 'statusInReview' },
  { value: 'resolved', key: 'statusResolved' },
  { value: 'rejected', key: 'statusRejected' },
  { value: null, key: 'tabAll' },
]

export function AdminComplaints() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('open')
  const [complaints, setComplaints] = useState([])
  const [namesById, setNamesById] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [paymentAction, setPaymentAction] = useState('')
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    getComplaints(tab)
      .then(async (data) => {
        setComplaints(data)
        const ids = [...new Set(data.flatMap((c) => [c.complainant_id, c.against_id].filter(Boolean)))]
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ids)
          setNamesById(Object.fromEntries((profiles || []).map((p) => [p.id, p.name])))
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [tab])

  function toggleExpand(complaint) {
    if (expandedId === complaint.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(complaint.id)
    setResolutionNote('')
    setPaymentAction('')
  }

  async function handleResolve(complaint, status) {
    if (!resolutionNote.trim()) return
    setBusyId(complaint.id)
    try {
      await resolveComplaint(complaint, { status, resolutionNote: resolutionNote.trim(), paymentAction: paymentAction || null })
      setExpandedId(null)
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function handleSetInReview(complaint) {
    setBusyId(complaint.id)
    try {
      await resolveComplaint(complaint, { status: 'in_review', resolutionNote: complaint.resolution_note })
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.adminComplaints')}</h1>
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
              {t(`complaints.${tb.key}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : error ? (
          <p className="text-center text-red-500 py-10 text-sm">{error}</p>
        ) : complaints.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('complaints.noComplaintsInTab')}</p>
        ) : (
          complaints.map((c) => {
            const expanded = expandedId === c.id
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => toggleExpand(c)} className="w-full flex items-center justify-between p-4 text-left">
                  <div>
                    <p className="font-bold text-primary-800">{t(`complaints.category_${c.category}`)}</p>
                    <p className="text-sm text-gray-500">
                      {namesById[c.complainant_id] || '...'} → {namesById[c.against_id] || t('complaints.unknownParty')}
                    </p>
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-primary-50 space-y-2">
                    <p className="text-sm text-gray-700 mt-3">{c.description}</p>
                    <p className="text-xs text-gray-400">
                      {c.record_type} #{c.record_id} · {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {c.resolution_note && c.status !== 'open' && c.status !== 'in_review' && (
                      <p className="text-xs text-primary-700 bg-primary-50 rounded-lg px-2.5 py-1.5">
                        {t('complaints.resolutionLabel')}: {c.resolution_note}
                      </p>
                    )}

                    {(c.status === 'open' || c.status === 'in_review') && (
                      <>
                        {c.status === 'open' && (
                          <button
                            onClick={() => handleSetInReview(c)}
                            disabled={busyId === c.id}
                            className="text-xs font-semibold text-gold-700 bg-gold-50 rounded-lg px-2.5 py-1.5"
                          >
                            {t('complaints.markInReview')}
                          </button>
                        )}
                        <textarea
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder={t('complaints.resolutionPlaceholder')}
                          rows={2}
                          className="w-full rounded-xl border-2 border-primary-100 px-3 py-2 text-sm"
                        />
                        {c.record_type === 'payment' && (
                          <select
                            value={paymentAction}
                            onChange={(e) => setPaymentAction(e.target.value)}
                            className="w-full rounded-xl border-2 border-primary-100 px-2 py-1.5 text-sm bg-white"
                          >
                            <option value="">{t('complaints.paymentActionNone')}</option>
                            <option value="pending">{t('complaints.paymentActionRedo')}</option>
                            <option value="received">{t('complaints.paymentActionSideFarmer')}</option>
                          </select>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolve(c, 'resolved')}
                            disabled={busyId === c.id || !resolutionNote.trim()}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            <Check size={14} /> {t('complaints.resolve')}
                          </button>
                          <button
                            onClick={() => handleResolve(c, 'rejected')}
                            disabled={busyId === c.id || !resolutionNote.trim()}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-100 text-red-600 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            <X size={14} /> {t('complaints.reject')}
                          </button>
                        </div>
                      </>
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
