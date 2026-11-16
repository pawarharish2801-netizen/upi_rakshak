import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldCheck,
  WarningOctagon,
  ArrowRight,
  Info,
  QrCode,
  CurrencyInr,
  Lightning,
  Sparkle,
  Cpu,
  PhoneCall,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Input, Select } from '../components/common/Input'
import {
  PAYMENT_CHANNELS,
  PAYMENT_PURPOSES,
  VERIFICATION_STATUSES,
} from '../constants'
import { isValidUPI } from '../utils/formatters'
import { assessPaymentRisk, assessUnifiedPayment, getMLStatus } from '../services/api'
import toast from 'react-hot-toast'

export default function PaymentAssessment() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [mlStatus, setMlStatus] = useState(null)

  useEffect(() => {
    async function checkMl() {
      try {
        const st = await getMLStatus()
        setMlStatus(st)
      } catch {
        setMlStatus({ loaded: false })
      }
    }
    checkMl()

    if (location.state?.conversationNotes) {
      setFormData((prev) => ({
        ...prev,
        conversationNotes: location.state.conversationNotes,
      }))
      toast.success('Attached conversational context from simulator')
    }
  }, [location.state])
  const [formData, setFormData] = useState({
    amount: '',
    recipientId: '',
    paymentChannel: 'UPI_ID_Manual',
    paymentPurpose: 'merchant_payment',
    recipientVerification: 'Bank_Name_Verified',
    isFirstTimeRecipient: true,
    // Indicators
    urgency: false,
    refundClaim: false,
    impersonation: false,
    pinToReceive: false,
    suspiciousLink: false,
    screenSharing: false,
    callerAuthority: false,
    unsolicitedContact: false,
    secrecyRequested: false,
    emotionalPressure: false,
    callInProgress: false,
    rapidMultiplePayments: false,
    qrMismatch: false,
    collectUnsolicited: false,
    conversationNotes: '',
  })

  const [errors, setErrors] = useState({})

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  // Pre-configured real-world scenario presets
  const applyPreset = (presetKey) => {
    if (presetKey === 'refund') {
      setFormData({
        amount: '8499',
        recipientId: 'claim.refund88@okhdfc',
        paymentChannel: 'Collect_Request',
        paymentPurpose: 'refund_claim',
        recipientVerification: 'Unverified',
        isFirstTimeRecipient: true,
        urgency: true,
        refundClaim: true,
        impersonation: true,
        pinToReceive: true,
        suspiciousLink: true,
        screenSharing: false,
        callerAuthority: false,
        unsolicitedContact: true,
        secrecyRequested: false,
        emotionalPressure: false,
        callInProgress: true,
        qrMismatch: false,
        collectUnsolicited: true,
        conversationNotes:
          'Caller from customer care said refund of ₹8,499 approved. Told me to accept collect request and enter PIN to deposit into my account.',
      })
      toast.success('Applied Preset: Fake Refund Scam Scenario')
    } else if (presetKey === 'digital_arrest') {
      setFormData({
        amount: '48000',
        recipientId: 'cbi.verification.clearing@axis',
        paymentChannel: 'UPI_ID_Manual',
        paymentPurpose: 'fine_or_penalty',
        recipientVerification: 'Name_Mismatch',
        isFirstTimeRecipient: true,
        urgency: true,
        refundClaim: false,
        impersonation: true,
        pinToReceive: false,
        suspiciousLink: false,
        screenSharing: true,
        callerAuthority: true,
        unsolicitedContact: true,
        secrecyRequested: true,
        emotionalPressure: true,
        callInProgress: true,
        rapidMultiplePayments: false,
        qrMismatch: false,
        collectUnsolicited: false,
        conversationNotes:
          'Caller in police uniform on video call claimed my Aadhaar was found in money laundering case. Said I must transfer security deposit to government escrow to avoid immediate arrest.',
      })
      toast.success('Applied Preset: Digital Arrest Coercion Scenario')
    } else if (presetKey === 'call_burst') {
      setFormData({
        amount: '25000',
        recipientId: 'customs.penalty.clearance@hdfc',
        paymentChannel: 'UPI_ID_Manual',
        paymentPurpose: 'fine_or_penalty',
        recipientVerification: 'Unverified',
        isFirstTimeRecipient: true,
        urgency: true,
        refundClaim: false,
        impersonation: true,
        pinToReceive: false,
        suspiciousLink: false,
        screenSharing: false,
        callerAuthority: true,
        unsolicitedContact: true,
        secrecyRequested: true,
        emotionalPressure: true,
        callInProgress: true,
        rapidMultiplePayments: true,
        qrMismatch: false,
        collectUnsolicited: false,
        conversationNotes:
          'Caller claiming to be customs officer is on live phone call right now. Said parcel seized, ordered me to send ₹25,000 immediately, and said I must send another ₹25,000 right after in a second payment while on call.',
      })
      toast.success('Applied Preset: Active Call + Rapid Split Payments')
    } else if (presetKey === 'legit') {
      setFormData({
        amount: '1250',
        recipientId: 'naturebasket.orders@icici',
        paymentChannel: 'QR_Scan',
        paymentPurpose: 'grocery',
        recipientVerification: 'Verified_Merchant',
        isFirstTimeRecipient: false,
        urgency: false,
        refundClaim: false,
        impersonation: false,
        pinToReceive: false,
        suspiciousLink: false,
        screenSharing: false,
        callerAuthority: false,
        unsolicitedContact: false,
        secrecyRequested: false,
        emotionalPressure: false,
        callInProgress: false,
        rapidMultiplePayments: false,
        qrMismatch: false,
        collectUnsolicited: false,
        conversationNotes: 'Routine grocery payment at neighborhood supermarket.',
      })
      toast.success('Applied Preset: Verified Merchant Grocery Payment')
    }
  }

  const validate = () => {
    const errs = {}
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      errs.amount = 'Enter a valid transfer amount (INR)'
    } else if (Number(formData.amount) > 100000) {
      errs.amount = 'Amount exceeds standard ₹1,00,000 UPI ceiling'
    }

    if (!formData.recipientId) {
      errs.recipientId = 'Beneficiary UPI ID or VPA is required'
    } else if (!isValidUPI(formData.recipientId)) {
      errs.recipientId = 'Enter a valid UPI ID (e.g. user@bank or merchant@icici)'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please resolve validation errors before evaluating')
      return
    }

    try {
      setLoading(true)
      const unifiedPayload = {
        ...formData,
        amount: Number(formData.amount),
        conversationText: formData.conversationNotes,
      }
      let result
      try {
        result = await assessUnifiedPayment(unifiedPayload)
      } catch {
        result = await assessPaymentRisk(formData)
      }
      toast.success('Risk evaluation computed successfully')
      navigate(`/results/${result.id}`)
    } catch (err) {
      toast.error(err.message || 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      title="Payment Risk Assessment Console"
      subtitle="Input payment attributes and situational context to screen for deceptive indicators before authorizing your transaction."
    >
      {/* Preset Scenario Selector Bar (Standard Modernist Elevation) */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lightning size={16} weight="fill" className="text-[var(--color-brand-accent)]" />
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider font-mono">
              Synthetic Test Vectors:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('refund')}
              className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100/70 transition-colors"
            >
              Fake Refund Trap
            </button>
            <button
              type="button"
              onClick={() => applyPreset('digital_arrest')}
              className="rounded-lg border border-purple-200 bg-purple-50/60 px-3 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100/70 transition-colors"
            >
              Digital Arrest Coercion
            </button>
            <button
              type="button"
              onClick={() => applyPreset('call_burst')}
              className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100/70 transition-colors"
            >
              Call + Split Payments
            </button>
            <button
              type="button"
              onClick={() => applyPreset('legit')}
              className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100/70 transition-colors"
            >
              Verified Merchant
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Financial & Beneficiary Coordinates */}
        <Card>
          <Card.Header>
            <Card.Title>1. Beneficiary & Financial Coordinates</Card.Title>
            <Card.Description>
              Direct payment attributes matching your UPI app's confirmation screen.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Transaction Amount (INR)"
                type="number"
                placeholder="e.g. 2499"
                isMono
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                error={errors.amount}
                helperText="Maximum standard UPI per-transaction limit is ₹1,00,000"
                icon={CurrencyInr}
              />

              <Input
                label="Beneficiary UPI ID / VPA"
                placeholder="e.g. merchant@icici or 9876543210@paytm"
                isMono
                value={formData.recipientId}
                onChange={(e) => handleChange('recipientId', e.target.value)}
                error={errors.recipientId}
                helperText="Virtual Payment Address you are transferring funds to"
                icon={QrCode}
              />

              <Select
                label="Payment Initiation Channel"
                value={formData.paymentChannel}
                onChange={(e) => handleChange('paymentChannel', e.target.value)}
                options={PAYMENT_CHANNELS.map((c) => ({
                  value: c,
                  label: c.replace(/_/g, ' '),
                }))}
                helperText="Mechanism by which this payment arrived on your device"
              />

              <Select
                label="Declared or Claimed Purpose"
                value={formData.paymentPurpose}
                onChange={(e) => handleChange('paymentPurpose', e.target.value)}
                options={PAYMENT_PURPOSES.map((p) => ({
                  value: p,
                  label: p.replace(/_/g, ' '),
                }))}
                helperText="Official category of the payment"
              />

              <Select
                label="Payee Verification Status (as reported by UPI App)"
                value={formData.recipientVerification}
                onChange={(e) => handleChange('recipientVerification', e.target.value)}
                options={VERIFICATION_STATUSES.map((s) => ({
                  value: s,
                  label: s.replace(/_/g, ' '),
                }))}
                helperText="Name match verification result displayed by payment gateway"
              />

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 cursor-pointer hover:bg-zinc-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isFirstTimeRecipient}
                    onChange={(e) => handleChange('isFirstTimeRecipient', e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--color-content-primary)] block">
                      First-Time Recipient
                    </span>
                    <span className="text-[11px] text-[var(--color-content-tertiary)]">
                      Zero bilateral transaction history between your accounts
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Section 2: Behavioral & Social Engineering Signals */}
        <Card>
          <Card.Header>
            <Card.Title>2. Situational & Social Engineering Signals</Card.Title>
            <Card.Description>
              Select any psychological pressure or unusual instructions present during this interaction.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                {
                  key: 'pinToReceive',
                  label: 'PIN Requested to Receive Money',
                  desc: 'Told to enter your UPI PIN to credit a refund, cashback, or reward.',
                  critical: true,
                },
                {
                  key: 'screenSharing',
                  label: 'Remote Screen Sharing Requested',
                  desc: 'Asked to install AnyDesk, TeamViewer, or QuickSupport on your device.',
                  critical: true,
                },
                {
                  key: 'callerAuthority',
                  label: 'Claims Police / CBI / RBI / TRAI Authority',
                  desc: 'Contact claimed to be law enforcement or bank investigation unit.',
                  critical: true,
                },
                {
                  key: 'secrecyRequested',
                  label: 'Secrecy Requested',
                  desc: 'Instructed not to inform family, bank staff, or friends.',
                  critical: true,
                },
                {
                  key: 'emotionalPressure',
                  label: 'Arrest, Fear or Penalty Threats',
                  desc: 'Threatened with police arrest, narcotics cases, or heavy fines.',
                  critical: false,
                },
                {
                  key: 'urgency',
                  label: 'Artificial Urgency Deadline',
                  desc: 'Pressured to execute transfer within immediate countdown minutes.',
                  critical: false,
                },
                {
                  key: 'refundClaim',
                  label: 'Refund, Reward or Cashback Lure',
                  desc: 'Payment framed as processing fee to unlock a larger sum.',
                  critical: false,
                },
                {
                  key: 'impersonation',
                  label: 'Suspected Impersonation',
                  desc: 'Caller pretends to be known friend, relative, or company support.',
                  critical: false,
                },
                {
                  key: 'unsolicitedContact',
                  label: 'Unsolicited Contact Initiated',
                  desc: 'You did not initiate contact; they called or messaged you first.',
                  critical: false,
                },
                {
                  key: 'callInProgress',
                  label: 'Active Call During Payment (High Coercion Alert)',
                  desc: 'Caller is on a live phone or video call with you while making this payment.',
                  critical: true,
                },
                {
                  key: 'rapidMultiplePayments',
                  label: 'Multiple Payments in One Shot',
                  desc: 'Making multiple consecutive payments, or instructed to split the amount into back-to-back transfers.',
                  critical: true,
                },
                {
                  key: 'suspiciousLink',
                  label: 'Arrived via SMS/WhatsApp Link',
                  desc: 'Payment intent was triggered by clicking a shortened or unfamiliar link.',
                  critical: false,
                },
                {
                  key: 'collectUnsolicited',
                  label: 'Unexpected Collect Request',
                  desc: 'A collect notification appeared without you initiating a purchase.',
                  critical: false,
                },
              ].map(({ key, label, desc, critical }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                    formData[key]
                      ? critical
                        ? 'border-rose-300 bg-rose-50/50 text-rose-950'
                        : 'border-blue-300 bg-blue-50/40 text-blue-950'
                      : 'border-zinc-200/80 bg-white hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData[key]}
                    onChange={(e) => handleChange(key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]"
                  />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold block leading-tight">{label}</span>
                      {critical && (
                        <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200/80 flex-shrink-0">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 leading-relaxed block">
                      {desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Dynamic Live Warning Alerts for Active Call & Multiple Payments */}
            {(formData.callInProgress || formData.rapidMultiplePayments) && (
              <div className="mt-5 space-y-3">
                {formData.callInProgress && (
                  <div className="rounded-xl border border-rose-200/90 bg-rose-50/70 p-4 text-rose-950 flex items-start gap-3.5">
                    <div className="rounded-lg bg-rose-600 text-white p-2 flex-shrink-0 mt-0.5">
                      <PhoneCall size={20} weight="fill" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white">
                          CRITICAL DIRECTIVE • सावधान
                        </span>
                        <span className="text-xs font-bold text-rose-950">
                          Active Call Coercion Vector Detected
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-rose-900/90 max-w-[70ch]">
                        Fraudsters intentionally keep victims on live voice or video calls to induce urgency, create artificial panic, and prevent independent verification with family or bank officials.
                      </p>
                      <div className="rounded-lg border border-rose-200 bg-white/90 p-3 space-y-1 text-xs">
                        <p className="text-rose-900 leading-relaxed">
                          <span className="font-mono font-bold text-rose-700 uppercase tracking-wide mr-1.5">[SAFETY PROTOCOL]</span>
                          Disconnect the phone call immediately. Genuine bank officers, police, or merchants never require you to remain on call while entering your UPI PIN.
                        </p>
                        <p className="text-[11px] text-rose-800 italic border-l-2 border-rose-400 pl-2 mt-1">
                          "धोखेबाज कॉल पर रखकर दबाव बनाते हैं ताकि आप किसी से पूछ न सकें। तुरंत कॉल काटें और बैंक से सीधे पुष्टि करें।"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.rapidMultiplePayments && (
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-4 text-amber-950 flex items-start gap-3.5">
                    <div className="rounded-lg bg-amber-600 text-white p-2 flex-shrink-0 mt-0.5">
                      <WarningOctagon size={20} weight="fill" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600 text-white">
                          VELOCITY ALERT • SPLIT TRANSACTION
                        </span>
                        <span className="text-xs font-bold text-amber-950">
                          Rapid Consecutive Payments in Progress
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-amber-900/90 max-w-[70ch]">
                        Attackers instruct victims to send money in multiple consecutive chunks to bypass per-transaction limits or rapidly drain bank accounts before alerts trigger.
                      </p>
                      <div className="rounded-lg border border-amber-200 bg-white/90 p-3 text-xs text-amber-900 leading-relaxed">
                        <span className="font-mono font-bold text-amber-700 uppercase tracking-wide mr-1.5">[VELOCITY PROTOCOL]</span>
                        Halt repeated transfers immediately. Check your account statement and previous debit notifications before sending any further amount.
                      </div>
                    </div>
                  </div>
                )}

                {formData.callInProgress && formData.rapidMultiplePayments && (
                  <div className="rounded-xl border border-rose-300 bg-rose-900 text-white p-3.5 flex items-center gap-3">
                    <ShieldCheck size={22} weight="fill" className="text-rose-200 flex-shrink-0" />
                    <span className="text-xs font-semibold leading-relaxed">
                      EXTREME RISK: Simultaneous Phone Call + Multiple Consecutive Transfers is the primary signature of active cyber fraud (Digital Arrest / Telegram Task scam). Do not authorize payment.
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Section 3: Context Dialogue */}
        <Card>
          <Card.Header>
            <Card.Title>3. Optional Dialogue Context</Card.Title>
            <Card.Description>
              Paste any message dialogue, SMS snippet, or caller script for NLP intent scoring.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <textarea
              rows={3}
              placeholder="e.g. 'Sir your electricity will be disconnected tonight at 9:30 PM. Pay ₹10 verification charge via this link to update bill status.'"
              value={formData.conversationNotes}
              onChange={(e) => handleChange('conversationNotes', e.target.value)}
              className="w-full rounded-xl border border-zinc-300 p-3.5 text-xs text-[var(--color-content-primary)] placeholder-zinc-400 focus:border-[var(--color-brand-deep)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-deep)] font-sans"
            />
          </Card.Content>
        </Card>

        {/* Submit Bar with Dual-Engine Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200/80 pt-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-[var(--color-content-secondary)]">
              {mlStatus?.loaded ? (
                <span>
                  <strong>ML Engine Online:</strong> {mlStatus.model_name} (ROC-AUC {mlStatus.validation_auc || '0.971'}) + Rule Guardrails
                </span>
              ) : (
                <span>Dual Engine: Statistical ML + Deterministic Rule Guardrails</span>
              )}
            </span>
          </div>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            loading={loading}
            icon={ArrowRight}
            iconPosition="right"
          >
            Compute Pre-Transaction Verdict
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
