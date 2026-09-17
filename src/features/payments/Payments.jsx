import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, IndianRupee, Check, ShieldCheck, Link2, Lock } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getMyPayments, markPaid, confirmReceived } from './paymentService'
import { ReportButton } from '../complaints/ReportButton'
import { openRazorpayCheckout } from './razorpayService'

const STATUS_STYLE = {
  pending: 'bg-gray-100 text-gray-600',
  paid: 'bg-gold-50 text-gold-700',
  received: 'bg-primary-100 text-primary-800',
  disputed: 'bg-red-50 text-red-700',
}

export function Payments() {
  const { t } = useTranslation()
  const { user, role } = useAuth()
  const STATUS_LABEL = {
    pending: t('payments.statusPending'),
    paid: t('payments.statusPaid'),
    received: t('payments.statusReceived'),
    disputed: t('payments.statusDisputed'),
  }
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  function load() {
    getMyPayments(user.id, role).then((data) => {
      setPayments(data)
      setLoading(false)
    })
  }

  useEffect(load, [user.id, role])

  async function handlePayNow(payment) {
    setBusyId(payment.id)
    try {
      await openRazorpayCheckout({
        amount: payment.amount,
        description: `${payment.offers.lots.crop} — ${payment.offers.quantity_quintal} ${t('common.quintal')}`,
        onSuccess: async () => {
          await markPaid(payment)
          load()
          setBusyId(null)
        },
        onDismiss: () => setBusyId(null),
      })
    } catch (err) {
      alert(err.message || 'Could not start payment.')
      setBusyId(null)
    }
  }

  async function handleConfirmReceived(payment) {
    setBusyId(payment.id)
    try {
      await confirmReceived(payment)
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="flex items-center gap-3 bg-white border-b-2 border-primary-100 px-4 py-3">
        <Link to="/" className="text-primary-700"><ArrowLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-primary-800">{t('menu.payments')}</h1>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-10">{t('common.loading')}</p>
        ) : payments.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{t('payments.noPaymentsYet')}</p>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-primary-800">{payment.offers.lots.crop}</p>
                  <p className="text-sm text-gray-500">
                    {payment.offers.quantity_quintal} {t('common.quintal')} · ₹{payment.offers.price_per_quintal}/{t('common.quintal')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center gap-1 text-lg font-bold text-gold-600">
                    <IndianRupee size={16} />{payment.amount}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[payment.status]}`}>
                    {STATUS_LABEL[payment.status]}
                  </span>
                </div>
              </div>

              {payment.offers?.price_locked_until && (
                <p className="flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-100 rounded-lg px-2.5 py-1.5 mt-2 w-fit">
                  <Lock size={12} />
                  {t('payments.priceLockedAt', {
                    price: payment.offers.price_per_quintal,
                    date: new Date(payment.offers.price_locked_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                  })}
                </p>
              )}

              {payment.tx_hash && (
                <p className="text-xs text-gray-400 mt-2 truncate" title={payment.tx_hash}>
                  {t('payments.hashLabel')}: {payment.tx_hash.slice(0, 16)}...
                </p>
              )}

              {payment.anchor_submitted_at ? (
                <p className="flex items-center gap-1 text-xs font-semibold text-primary-700 mt-1" title={payment.anchor_calendar_url}>
                  <Link2 size={12} /> {t('payments.anchoredToBitcoin')}
                </p>
              ) : payment.status === 'received' ? (
                <p className="text-xs text-gray-400 mt-1">{t('payments.anchoringNotAvailable')}</p>
              ) : null}

              {role === 'buyer' && payment.status === 'pending' && (
                <button
                  onClick={() => handlePayNow(payment)}
                  disabled={busyId === payment.id}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-gold-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  <Check size={16} /> {busyId === payment.id ? t('payments.marking') : `${t('payments.markAsPaid')} — ₹${payment.amount}`}
                </button>
              )}

              {role === 'farmer' && payment.status === 'paid' && (
                <button
                  onClick={() => handleConfirmReceived(payment)}
                  disabled={busyId === payment.id}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  <ShieldCheck size={16} /> {busyId === payment.id ? t('payments.confirmingAnchoring') : t('payments.confirmReceived')}
                </button>
              )}

              {payment.status !== 'disputed' && (
                <ReportButton
                  recordType="payment"
                  recordId={payment.id}
                  againstId={role === 'buyer' ? payment.offers.lots.farmer_id : payment.offers.buyer_id}
                />
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
