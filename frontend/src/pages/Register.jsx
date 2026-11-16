import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, User, Envelope, LockKey, ArrowRight } from '@phosphor-icons/react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { isValidEmail } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!name.trim()) errs.name = 'Full name is required'
    if (!email) errs.email = 'Email address is required'
    else if (!isValidEmail(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await register(name, email, password)
      toast.success('Account successfully initialized')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Registration failed')
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
          Create your defense account
        </h2>
        <p className="mt-2 text-center text-xs text-[var(--color-content-secondary)]">
          Start assessing payments, scanning chats & protecting your funds
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-[var(--shadow-medium)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Harish Pawar"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors({ ...errors, name: '' })
              }}
              error={errors.name}
              icon={User}
              autoComplete="name"
            />

            <Input
              label="Email Address"
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
              label="Password (min. 8 characters)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: '' })
              }}
              error={errors.password}
              icon={LockKey}
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
              }}
              error={errors.confirmPassword}
              icon={LockKey}
              autoComplete="new-password"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="accent"
                size="md"
                loading={loading}
                className="w-full"
                icon={ArrowRight}
                iconPosition="right"
              >
                Create Account
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--color-content-secondary)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--color-brand-deep)] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
