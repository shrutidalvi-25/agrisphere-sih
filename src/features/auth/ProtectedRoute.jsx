import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Wrap any screen with this to gate it by login + role.
// <ProtectedRoute allow={['farmer']}><FarmerHome /></ProtectedRoute>
export function ProtectedRoute({ allow, children }) {
  const { session, role, loading } = useAuth()

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  if (allow && !allow.includes(role)) return <Navigate to="/" replace />

  return children
}
