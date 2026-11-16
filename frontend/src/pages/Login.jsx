import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, LockKey, Envelope, ArrowRight } from '@phosphor-icons/react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { isValidEmail } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!email) errs.email = 'Email address is required'
    else if (!isValidEmail(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await login(email, password)
      toast.success('Welcome back to UPI Rakshak')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Login failed')
    }
  }

  // Quick fill demo accounts
  const handleQuickDemo = (type) => {
    if (type === 'officer') {
      setEmail('risk.officer@upirakshak.gov.in')
      setPassword('securePassword123')
    } else {
      setEmail('citizen.user@example.com')
      setPassword('citizenSecurePass1')
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-[var(--color-surface-secondary)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-deep)] text-white shadow">
            <ShieldCheck size={24} weight="bold" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--color-content-primary)]">
            UPI Rakshak
          </span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-[var(--color-content-primary)]">
          Sign in to your security console
        </h2>
        <p className="mt-2 text-center text-xs text-[var(--color-content-secondary)]">
          Real-time pre-transaction defense & fraud audit history
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-[var(--shadow-medium)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work or Personal Email"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: '' })
              }}
              error={errors.email}
              icon={Envelope}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: '' })
              }}
              error={errors.password}
              icon={LockKey}
              autoComplete="current-password"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 border-t border-zinc-100 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-content-tertiary)] mb-2.5">
              Quick Demonstration Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('citizen')}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-[var(--color-content-secondary)] hover:bg-zinc-100 hover:text-[var(--color-content-primary)] text-left transition-colors"
              >
                <span className="font-semibold block text-[var(--color-content-primary)]">Citizen User</span>
                <span className="text-[10px] text-zinc-500 font-data">citizen@example.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('officer')}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-[var(--color-content-secondary)] hover:bg-zinc-100 hover:text-[var(--color-content-primary)] text-left transition-colors"
              >
                <span className="font-semibold block text-[var(--color-content-primary)]">Risk Analyst</span>
                <span className="text-[10px] text-zinc-500 font-data">officer@upirakshak</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-[var(--color-content-secondary)]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[var(--color-brand-deep)] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
