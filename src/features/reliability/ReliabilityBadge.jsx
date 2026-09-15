import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { getFarmerReliability, reliabilityTier } from './reliabilityService'

export function ReliabilityBadge({ farmerId }) {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    let cancelled = false
    getFarmerReliability(farmerId).then((data) => {
      if (!cancelled) setInfo(data)
    })
    return () => { cancelled = true }
  }, [farmerId])

  if (!info) return null
  const tier = reliabilityTier(info.score)

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${tier.color}`}
      title={info.reason}
    >
      <ShieldCheck size={12} /> {tier.label} ({info.score})
    </span>
  )
}
