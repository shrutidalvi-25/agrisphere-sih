import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { LoginSignup } from './features/auth/LoginSignup'
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginSignup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute allow={['farmer', 'buyer', 'fpo', 'admin']}>
                <RoleHome />
              </ProtectedRoute>
            }
          />
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
