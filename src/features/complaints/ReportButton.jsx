import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flag, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { createComplaint, markPaymentDisputed } from './complaintService'

const CATEGORIES_BY_TYPE = {
  payment: ['payment_not_received', 'wrong_amount', 'other'],
  offer: ['misconduct', 'other'],
}

// A small inline "raise a complaint" control meant to sit directly on the
// record it's about (a payment card, an offer card) — complaints always
// attach to something the complainant already has real access to, never a
// free-floating report screen with no context.
export function ReportButton({ recordType, recordId, againstId }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(CATEGORIES_BY_TYPE[recordType][0])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!description.trim()) return
    setBusy(true)
    try {
      await createComplaint({
        complainantId: user.id,
        againstId,
        recordType,
        recordId,
        category,
        description: description.trim(),
      })
      if (recordType === 'payment') await markPaymentDisputed(recordId)
      setDone(true)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return <p className="text-xs text-red-600 font-medium mt-2">{t('complaints.submitted')}</p>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-red-500 font-medium mt-2"
      >
        <Flag size={12} /> {t('complaints.reportButton')}
      </button>
    )
  }

  return (
    <div className="mt-2 bg-red-50 rounded-xl p-3 space-y-2">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs bg-white"
      >
        {CATEGORIES_BY_TYPE[recordType].map((c) => (
          <option key={c} value={c}>{t(`complaints.category_${c}`)}</option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('complaints.descriptionPlaceholder')}
        rows={2}
        className="w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={busy || !description.trim()}
          className="flex-1 bg-red-500 text-white rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {busy ? t('complaints.submitting') : t('complaints.submit')}
        </button>
        <button onClick={() => setOpen(false)} className="flex items-center justify-center bg-white text-gray-500 rounded-lg px-2.5">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
