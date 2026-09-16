import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

const GRADE_STYLE = {
  A: 'bg-primary-100 text-primary-800',
  B: 'bg-gold-50 text-gold-700',
  C: 'bg-red-50 text-red-700',
}

const SELL_ADVICE_LABEL_KEY = {
  SELL_NOW: 'aiGrading.sellNow',
  HOLD_HARVEST: 'aiGrading.holdHarvest',
  IMMEDIATE_LIQUIDATION: 'aiGrading.immediateLiquidation',
}

// Separate from the rule-based Grade A/B/C already shown on a lot
// (gradingService.js) — this is a distinct, photo-based AI assessment, so
// it's always labeled "AI Quality Check" rather than plain "Grade" to avoid
// the two systems reading as the same number.
export function AiGradeCard({ result }) {
  const { t } = useTranslation()

  return (
    <div className="bg-primary-50 rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-700">
          <Sparkles size={13} /> {t('aiGrading.title')}
        </p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_STYLE[result.grade]}`}>
          {t('aiGrading.title')} {result.grade}
        </span>
      </div>

      <p className="text-sm text-primary-900">{result.advice_summary}</p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white rounded-lg p-2">
          <p className="text-gray-400">{t('aiGrading.confidenceLabel')}</p>
          <p className="font-semibold text-primary-800">{result.confidence_score}%</p>
        </div>
        <div className="bg-white rounded-lg p-2">
          <p className="text-gray-400">{t('aiGrading.netPayoutLabel')}</p>
          <p className="font-semibold text-primary-800">₹{result.net_realisation?.net_realisation_payout_kg}/kg</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white text-primary-700">
          {t(SELL_ADVICE_LABEL_KEY[result.sell_or_hold] || 'aiGrading.sellNow')}
        </span>
        {result.fpo_pooling_suggested && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white text-gold-700">
            {t('aiGrading.poolingSuggested')}
          </span>
        )}
      </div>

      {result.actionable_recommendations?.length > 0 && (
        <ul className="text-xs text-primary-900 list-disc pl-4 space-y-0.5">
          {result.actionable_recommendations.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
