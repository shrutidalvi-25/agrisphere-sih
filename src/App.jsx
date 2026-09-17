import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginSignup } from './features/auth/LoginSignup'
import { LandingPage } from './features/auth/LandingPage'
import { RoleHome } from './features/auth/RoleHome'
import { PriceDashboard } from './features/price-intel/PriceDashboard'
import { CreateLot } from './features/lot-grading/CreateLot'
import { MyLots } from './features/lot-grading/MyLots'
import { BrowseLots } from './features/buyer-matching/BrowseLots'
import { MyOffers } from './features/buyer-matching/MyOffers'
import { PoolLots } from './features/fpo/PoolLots'
import { Payments } from './features/payments/Payments'
import { VerificationQueue } from './features/admin/VerificationQueue'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { MyComplaints } from './features/complaints/MyComplaints'
import { AdminComplaints } from './features/complaints/AdminComplaints'
import { VoiceCallSell } from './features/voice-ivr/VoiceCallSell'

// "/" serves the public marketing page to a signed-out visitor, and the
// farmer-friendly dashboard to a signed-in user — same route either way, so
// every existing `<Link to="/">` back-button throughout the app (used on
// nearly every screen) keeps working unchanged for logged-in users.
function HomeGate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  return session ? (
    <ProtectedRoute allow={['farmer', 'buyer', 'fpo', 'admin']}>
      <RoleHome />
    </ProtectedRoute>
  ) : (
    <LandingPage />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginSignup />} />
          <Route path="/" element={<HomeGate />} />
          <Route
            path="/prices"
            element={
              <ProtectedRoute allow={['farmer', 'fpo']}>
                <PriceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lots/new"
            element={
              <ProtectedRoute allow={['farmer']}>
                <CreateLot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lots/mine"
            element={
              <ProtectedRoute allow={['farmer']}>
                <MyLots />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buy/browse"
            element={
              <ProtectedRoute allow={['buyer']}>
                <BrowseLots />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buy/offers"
            element={
              <ProtectedRoute allow={['buyer']}>
                <MyOffers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fpo/pool"
            element={
              <ProtectedRoute allow={['fpo']}>
                <PoolLots />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute allow={['farmer', 'buyer']}>
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verify"
            element={
              <ProtectedRoute allow={['admin']}>
                <VerificationQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voice-call"
            element={
              <ProtectedRoute allow={['farmer']}>
                <VoiceCallSell />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints"
            element={
              <ProtectedRoute allow={['farmer', 'buyer']}>
                <MyComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
