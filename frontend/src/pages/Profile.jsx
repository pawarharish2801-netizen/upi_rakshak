import { useState } from 'react'
import {
  User,
  Envelope,
  ShieldCheck,
  Trash,
  CheckCircle,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Badge } from '../components/common/Badge'
import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || 'Citizen User')
  const [email] = useState(user?.email || 'citizen@example.com')
  const [riskTolerance, setRiskTolerance] = useState('standard')
  const [telemetryEnabled, setTelemetryEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await updateProfile({ name })
      toast.success('Security preferences successfully saved')
    } catch (err) {
      toast.error('Failed to update preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleClearLocalData = () => {
    if (
      window.confirm(
        'Clear all stored evaluation logs, chat scans, and audit records from this browser cache?'
      )
    ) {
      localStorage.removeItem('upi_rakshak_assessments')
      localStorage.removeItem('upi_rakshak_reports')
      toast.success('Local session audit records cleared')
    }
  }

  return (
    <PageShell
      title="User Profile & Security Policy"
      subtitle="Manage your identity credentials, behavioral engine risk sensitivity thresholds, and local device telemetry."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (4 cols): User Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <Card.Content className="flex flex-col items-center text-center p-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-brand-deep)] text-2xl font-extrabold text-white shadow-lg">
                {getInitials(name)}
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--color-content-primary)]">
                {name}
              </h3>
              <p className="text-xs text-[var(--color-content-secondary)] font-data">
                {email}
              </p>
              <div className="mt-3">
                <Badge variant="brand" size="sm">
                  Verified UPI Rakshak Node
                </Badge>
              </div>

              <div className="mt-6 w-full border-t border-zinc-100 pt-4 text-left space-y-2.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-[var(--color-content-secondary)]">Telemetry Node:</span>
                  <span className="font-bold font-data text-zinc-900">Active (Client)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--color-content-secondary)]">Member Since:</span>
                  <span className="font-bold font-data text-zinc-900">November 2026</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--color-content-secondary)]">Zero-Knowledge Guard:</span>
                  <span className="font-bold text-emerald-600">Enabled</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Privacy & Zero Knowledge Guarantee */}
          <div className="card-weightless rounded-2xl bg-white p-6 space-y-2">
            <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
              <ShieldCheck size={18} className="text-[var(--color-brand-deep)]" />
              Zero-Trust Privacy Guarantee
            </span>
            <p className="text-xs text-[var(--color-content-secondary)] leading-relaxed">
              UPI Rakshak never records, transmits, or decrypts your 4 or 6-digit UPI PIN, netbanking passwords, or transaction OTPs. All telemetry is evaluated over anonymous behavioral features.
            </p>
          </div>
        </div>

        {/* Right Column (8 cols): Preferences & Settings */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>Account Information & Credentials</Card.Title>
              <Card.Description>
                Update your display name and notification preferences.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Display Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={User}
                  />
                  <Input
                    label="Registered Email Address"
                    value={email}
                    disabled
                    icon={Envelope}
                    helperText="Permanently bound to this security identity"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" loading={saving}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>

          {/* Risk Sensitivity Policies */}
          <Card>
            <Card.Header>
              <Card.Title>Behavioral Engine Sensitivity Tuning</Card.Title>
              <Card.Description>
                Configure how aggressively the ML model flags ambiguous payment scenarios.
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'relaxed',
                    label: 'Permissive',
                    desc: 'Flags only overt critical threats (e.g. PIN-to-receive or remote apps). Minimizes false alarms.',
                  },
                  {
                    id: 'standard',
                    label: 'Standard (Balanced)',
                    desc: 'Balanced risk scoring calibrated against the 100,000 synthetic transaction dataset.',
                  },
                  {
                    id: 'strict',
                    label: 'Strict / High-Security',
                    desc: 'Aggressively challenges any first-time recipient, night transaction, or unverified merchant.',
                  },
                ].map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => {
                      setRiskTolerance(mode.id)
                      toast.success(`Risk sensitivity set to ${mode.label}`)
                    }}
                    className={`rounded-2xl border p-4.5 cursor-pointer transition-all ${
                      riskTolerance === mode.id
                        ? 'border-[var(--color-brand-deep)] bg-blue-50/50 ring-2 ring-[var(--color-brand-deep)]/20 shadow-sm'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-content-primary)]">
                        {mode.label}
                      </span>
                      {riskTolerance === mode.id && (
                        <CheckCircle
                          size={17}
                          weight="fill"
                          className="text-[var(--color-brand-deep)]"
                        />
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--color-content-secondary)] leading-relaxed">
                      {mode.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--color-content-primary)] block">
                    Anonymous Threat Signature Sharing
                  </span>
                  <span className="text-[11px] text-[var(--color-content-tertiary)]">
                    Share sanitized malicious VPAs to help protect other Indian citizens
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={telemetryEnabled}
                  onChange={(e) => setTelemetryEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]"
                />
              </div>
            </Card.Content>
          </Card>

          {/* Local Data Management */}
          <Card>
            <Card.Header>
              <Card.Title>Local Device Storage & Audit Cache</Card.Title>
              <Card.Description>
                Control session histories, stored evaluation logs, and local device caches.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[var(--color-content-primary)] block">
                    Clear Local Audit Cache
                  </span>
                  <span className="text-[11px] text-[var(--color-content-secondary)]">
                    Wipe all stored assessment logs and report drafts from this browser.
                  </span>
                </div>
                <Button
                  variant="outlineDanger"
                  size="sm"
                  icon={Trash}
                  onClick={handleClearLocalData}
                >
                  Clear History
                </Button>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
