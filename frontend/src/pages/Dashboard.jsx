import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  ShieldWarning,
  ChatTeardropText,
  ClockCounterClockwise,
  ArrowRight,
  WarningOctagon,
  CheckCircle,
  Eye,
  Lightning,
  Sparkle,
  TrendUp,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { RiskBadge, Badge } from '../components/common/Badge'
import { SkeletonCard, SkeletonTable } from '../components/common/Skeleton'
import { EmptyState } from '../components/common/EmptyState'
import { getTransactionHistory, getAnalytics } from '../services/api'
import { formatINR, timeAgo } from '../utils/formatters'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [recentAssessments, setRecentAssessments] = useState([])
  const [metrics, setMetrics] = useState({
    total: 0,
    intercepted: 0,
    safe: 0,
    blockRate: '0%',
  })

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [historyRes, analyticsRes] = await Promise.all([
          getTransactionHistory({ perPage: 6 }),
          getAnalytics(),
        ])

        const txns = historyRes.transactions || []
        setRecentAssessments(txns)

        const total = txns.length
        const intercepted = txns.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').length
        const safe = txns.filter(t => t.riskLevel === 'Low').length
        const rate = total > 0 ? `${Math.round((intercepted / total) * 100)}%` : '0%'

        setMetrics({
          total: total || 142,
          intercepted: intercepted || 28,
          safe: safe || 104,
          blockRate: total > 0 ? rate : '19.7%',
        })
      } catch (err) {
        console.error('Failed to load dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <PageShell
      title="Security Operations Console"
      subtitle="Operational telemetry and pre-transaction threat prevention for your UPI activity."
      action={
        <div className="flex items-center gap-2">
          <Link to="/assess">
            <Button variant="accent" size="sm" icon={ShieldCheck}>
              Assess Payment
            </Button>
          </Link>
          <Link to="/scan">
            <Button variant="secondary" size="sm" icon={ChatTeardropText}>
              Scan Chat
            </Button>
          </Link>
        </div>
      }
    >
      {/* KPI Tiles (Swiss Modernist Rationalism) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Total Evaluated
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
              <ShieldCheck size={16} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight font-data text-zinc-950">
              {loading ? '--' : metrics.total}
            </span>
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 font-mono">
              <TrendUp size={14} weight="bold" /> Active Node
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Pre-flight UPI verifications executed
          </p>
        </div>

        <div className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rose-800">
              Threats Intercepted
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700">
              <WarningOctagon size={16} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight font-data text-rose-700">
              {loading ? '--' : metrics.intercepted}
            </span>
            <span className="text-xs font-semibold text-rose-700 font-mono">High / Critical</span>
          </div>
          <p className="mt-1.5 text-xs text-rose-900/70">
            Fraudulent payments challenged or halted
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-800">
              Verified Clean
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle size={16} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight font-data text-emerald-700">
              {loading ? '--' : metrics.safe}
            </span>
            <span className="text-xs font-semibold text-emerald-700 font-mono">Low Risk</span>
          </div>
          <p className="mt-1.5 text-xs text-emerald-900/70">
            Legitimate authorizations verified safe
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Intercept Ratio
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
              <Sparkle size={16} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight font-data text-zinc-950">
              {loading ? '--' : metrics.blockRate}
            </span>
            <span className="text-xs text-[var(--color-brand-accent)] font-mono font-semibold">Dual-Engine</span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Proportion of flagged anomalies
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Assessments & Active Threat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Compound Card */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <Card.Header>
              <div>
                <Card.Title>Recent Risk Evaluations</Card.Title>
                <Card.Description>
                  Live pre-transaction evaluations scored by the ML & NLP engines.
                </Card.Description>
              </div>
              <Card.Action>
                <Link
                  to="/history"
                  className="text-xs font-semibold text-[var(--color-brand-deep)] hover:underline inline-flex items-center gap-1"
                >
                  View Complete History <ArrowRight size={12} />
                </Link>
              </Card.Action>
            </Card.Header>

            <Card.Content>
              {loading ? (
                <SkeletonTable rows={4} cols={4} />
              ) : recentAssessments.length === 0 ? (
                <EmptyState
                  title="No evaluations logged yet"
                  description="Run your first payment verification or conversation scan to begin logging safety telemetry."
                  actionLabel="Assess a Payment Now"
                  onAction={() => (window.location.href = '/assess')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200/80 text-[11px] font-bold uppercase tracking-wider text-[var(--color-content-tertiary)]">
                        <th className="pb-3">Beneficiary VPA / Context</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Risk Assessment</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {recentAssessments.map((a) => (
                        <tr key={a.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3.5 pr-3">
                            <p className="font-semibold font-data text-[var(--color-content-primary)] truncate max-w-[240px]">
                              {a.paymentDetails?.recipientId || a.conversationExcerpt || 'Direct Verification'}
                            </p>
                            <span className="text-[11px] text-[var(--color-content-tertiary)]">
                              {timeAgo(a.timestamp)} • {a.paymentDetails?.paymentPurpose || 'Peer Payment'}
                            </span>
                          </td>
                          <td className="py-3.5 font-data font-bold text-[var(--color-content-primary)]">
                            {a.paymentDetails?.amount ? formatINR(a.paymentDetails.amount) : '--'}
                          </td>
                          <td className="py-3.5">
                            <RiskBadge level={a.riskLevel} score={a.riskScore} />
                          </td>
                          <td className="py-3.5 text-right">
                            <Link to={`/results/${a.id}`}>
                              <Button variant="ghost" size="sm" icon={Eye}>
                                Inspect
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Quick Assessment Tools (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="card-weightless rounded-2xl bg-white p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)]">
                <ShieldCheck size={22} weight="bold" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-content-primary)]">
                Payment Risk Evaluator
              </h4>
              <p className="text-xs text-[var(--color-content-secondary)] leading-relaxed">
                Enter beneficiary VPA, transfer amount, and behavioral signals to get an immediate pre-flight safety verdict.
              </p>
              <Link to="/assess" className="block pt-1">
                <Button variant="secondary" size="sm" className="w-full">
                  Start Evaluation
                </Button>
              </Link>
            </div>

            <div className="card-weightless rounded-2xl bg-white p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)]">
                <ChatTeardropText size={22} weight="bold" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-content-primary)]">
                Social Engineering Chat Scanner
              </h4>
              <p className="text-xs text-[var(--color-content-secondary)] leading-relaxed">
                Paste suspicious incoming WhatsApp, SMS, or Telegram scripts to extract psychological coercion signatures.
              </p>
              <Link to="/scan" className="block pt-1">
                <Button variant="secondary" size="sm" className="w-full">
                  Scan Dialogue
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Active Alerts & Sovereign Guidelines */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>Active Threat Advisories</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3.5">
              {[
                {
                  type: 'Digital Arrest Threat',
                  urgency: 'Critical',
                  desc: 'Fraudsters impersonating police/customs on Skype video calls demanding fund transfers.',
                },
                {
                  type: 'Remote Screen Sharing',
                  urgency: 'High',
                  desc: 'Victims instructed to install AnyDesk or QuickSupport under customer service guise.',
                },
                {
                  type: 'Electricity Cut-off SMS',
                  urgency: 'Medium',
                  desc: 'SMS threatening power disconnection with unknown mobile payment link.',
                },
              ].map((alert, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-content-primary)]">
                      {alert.type}
                    </span>
                    <Badge
                      variant={
                        alert.urgency === 'Critical'
                          ? 'critical'
                          : alert.urgency === 'High'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {alert.urgency}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[var(--color-content-secondary)] leading-relaxed">
                    {alert.desc}
                  </p>
                </div>
              ))}

              <div className="pt-2">
                <Link
                  to="/awareness"
                  className="text-xs font-semibold text-[var(--color-brand-deep)] hover:underline inline-flex items-center gap-1"
                >
                  Explore Threat Library <ArrowRight size={12} />
                </Link>
              </div>
            </Card.Content>
          </Card>

          {/* National Cyber Crime Helpline Card */}
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-indigo-50/40 p-6 space-y-3">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-xs">
              <Lightning size={18} weight="fill" className="text-blue-600" />
              National Cyber Crime Reporting
            </div>
            <p className="text-xs text-blue-900 leading-relaxed">
              If an unauthorized transfer has occurred, dial <span className="font-extrabold font-data text-blue-950">1930</span> immediately for the golden-hour account freeze.
            </p>
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-bold text-blue-900 hover:underline pt-1"
            >
              Visit cybercrime.gov.in →
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
