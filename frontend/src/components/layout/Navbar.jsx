import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  List,
  X,
  SignOut,
  User,
  CaretDown,
  SquaresFour,
  ChatTeardrop,
  ClockCounterClockwise,
  ChartLine,
  BookOpen,
  Flag,
} from '@phosphor-icons/react'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../utils/formatters'

const iconMap = {
  SquaresFour,
  ShieldCheck,
  ChatTeardrop,
  ClockCounterClockwise,
  ChartLine,
  BookOpen,
  Flag,
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'SquaresFour' },
  { label: 'Assess Payment', path: '/assess', icon: 'ShieldCheck' },
  { label: 'Scan Chat', path: '/scan', icon: 'ChatTeardrop' },
  { label: 'History', path: '/history', icon: 'ClockCounterClockwise' },
  { label: 'Analytics', path: '/analytics', icon: 'ChartLine' },
  { label: 'Awareness', path: '/awareness', icon: 'BookOpen' },
  { label: 'Report Scam', path: '/report', icon: 'Flag' },
]

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setProfileOpen(false)
  }

  const isLanding = location.pathname === '/'

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
        isLanding ? 'glass-header-dark' : 'glass-header'
      }`}
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 lg:px-8">
        {/* Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-deep)] shadow-md group-hover:scale-105 transition-transform">
            <ShieldCheck size={20} weight="bold" className="text-white" />
          </div>
          <div className="flex flex-col">
            <span
              className={`text-base font-extrabold tracking-tight leading-none ${
                isLanding ? 'text-white' : 'text-[var(--color-content-primary)]'
              }`}
            >
              UPI Rakshak
            </span>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wider ${
                isLanding ? 'text-white/50' : 'text-[var(--color-content-tertiary)]'
              }`}
            >
              Defense Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? isLanding
                        ? 'text-white'
                        : 'text-[var(--color-brand-deep)]'
                      : isLanding
                      ? 'text-white/70 hover:text-white'
                      : 'text-[var(--color-content-secondary)] hover:text-[var(--color-content-primary)]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className={`absolute inset-0 rounded-xl ${
                        isLanding ? 'bg-white/10' : 'bg-[var(--color-brand-deep)]/10'
                      }`}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  {Icon && <Icon size={16} weight={isActive ? 'bold' : 'duotone'} className="relative z-10" />}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Right side Profile & CTA */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-2 rounded-xl p-1.5 transition-colors ${
                  isLanding ? 'hover:bg-white/10 text-white' : 'hover:bg-zinc-100 text-zinc-900'
                }`}
                aria-label="User menu"
                aria-expanded={profileOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-brand-deep)] text-xs font-bold text-white shadow-sm">
                  {getInitials(user?.name)}
                </div>
                <span className="hidden text-xs font-semibold sm:block">
                  {user?.name}
                </span>
                <CaretDown size={13} className={isLanding ? 'text-white/60' : 'text-zinc-400'} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 25 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl"
                    >
                      <div className="border-b border-zinc-100 px-3 py-2.5 mb-1">
                        <p className="text-xs font-bold text-[var(--color-content-primary)]">
                          {user?.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-content-tertiary)] font-data truncate">
                          {user?.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--color-content-secondary)] hover:bg-zinc-50 hover:text-[var(--color-content-primary)] transition-colors"
                      >
                        <User size={16} weight="duotone" />
                        Security Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <SignOut size={16} weight="duotone" />
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isLanding
                    ? 'text-white/80 hover:text-white'
                    : 'text-[var(--color-content-secondary)] hover:text-[var(--color-content-primary)]'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-[var(--color-brand-accent)] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          {isAuthenticated && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`rounded-xl p-2 lg:hidden ${
                isLanding ? 'text-white hover:bg-white/10' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileOpen ? <X size={20} /> : <List size={20} />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && isAuthenticated && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className="overflow-hidden border-t border-zinc-200/80 bg-white/95 backdrop-blur-md lg:hidden"
          >
            <div className="space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon]
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)]'
                        : 'text-[var(--color-content-secondary)] hover:bg-zinc-50'
                    }`}
                  >
                    {Icon && <Icon size={18} weight="duotone" />}
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
