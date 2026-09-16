import { useAuth } from './AuthContext'
import { FarmerDashboard } from './FarmerDashboard'
import { BuyerDashboard } from './BuyerDashboard'
import { FpoDashboard } from './FpoDashboard'
import { AdminHomeDashboard } from './AdminHomeDashboard'

// Landing screen after login — routes to a dedicated, role-specific
// dashboard (each with its own full-height sidebar, real stats, and quick
// actions). See FarmerDashboard.jsx / BuyerDashboard.jsx / FpoDashboard.jsx
// / AdminHomeDashboard.jsx.
export function RoleHome() {
  const { role } = useAuth()

  if (role === 'farmer') return <FarmerDashboard />
  if (role === 'buyer') return <BuyerDashboard />
  if (role === 'fpo') return <FpoDashboard />
  if (role === 'admin') return <AdminHomeDashboard />
  return null
}
