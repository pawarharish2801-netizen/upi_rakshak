import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { CircleNotch } from '@phosphor-icons/react'
import { ErrorBoundary } from './components/common/ErrorBoundary'

// Code-splitting via React.lazy per cc-skill-frontend-patterns
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PaymentAssessment = lazy(() => import('./pages/PaymentAssessment'))
const ConversationScanner = lazy(() => import('./pages/ConversationScanner'))
const RiskResults = lazy(() => import('./pages/RiskResults'))
const TransactionHistory = lazy(() => import('./pages/TransactionHistory'))
const Analytics = lazy(() => import('./pages/Analytics'))
const ScamAwareness = lazy(() => import('./pages/ScamAwareness'))
const ScamReport = lazy(() => import('./pages/ScamReport'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-surface-secondary)]">
      <div className="flex flex-col items-center gap-3">
        <CircleNotch size={28} className="animate-spin text-[var(--color-brand-deep)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-content-tertiary)]">
          Initializing Security Engine...
        </span>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
        {/* Public Landing & Authentication */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Core Functional Threat Modules */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assess" element={<PaymentAssessment />} />
        <Route path="/scan" element={<ConversationScanner />} />
        <Route path="/results/:id" element={<RiskResults />} />
        <Route path="/history" element={<TransactionHistory />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/awareness" element={<ScamAwareness />} />
        <Route path="/report" element={<ScamReport />} />
        <Route path="/profile" element={<Profile />} />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </ErrorBoundary>
  )
}
