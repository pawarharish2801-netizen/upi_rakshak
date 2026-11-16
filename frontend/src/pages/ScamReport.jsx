import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Flag,
  CheckCircle,
  CurrencyInr,
  PhoneCall,
  QrCode,
  Link as LinkIcon,
  ArrowSquareOut,
  WarningCircle,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Input, Select } from '../components/common/Input'
import { FRAUD_CATEGORIES } from '../constants'
import { submitScamReport } from '../services/api'
import toast from 'react-hot-toast'

export default function ScamReport() {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('scamType') || 'Digital_Arrest'

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    scamCategory: initialCategory,
    fraudsterUPI: '',
    fraudsterPhone: '',
    phishingUrl: '',
    amountLost: '',
    description: '',
    incidentDate: new Date().toISOString().slice(0, 10),
  })

  const [errors, setErrors] = useState({})

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!formData.fraudsterUPI && !formData.fraudsterPhone && !formData.phishingUrl) {
      errs.fraudsterUPI = 'Provide at least one identifier (UPI ID, Phone number, or Link)'
    }
    if (!formData.description.trim() || formData.description.length < 15) {
      errs.description = 'Please describe the incident in at least 15 characters'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please complete required fields')
      return
    }

    try {
      setLoading(true)
      await submitScamReport(formData)
      setSubmitted(true)
      toast.success('Threat report recorded in threat database')
    } catch (err) {
      toast.error(err.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      title="Report a UPI Scam / Malicious VPA"
      subtitle="Submit malicious VPAs, spoofed phone numbers, and social engineering scripts to protect the sovereign payment ecosystem."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column (8 cols) */}
        <div className="lg:col-span-8">
          <Card>
            <Card.Header>
              <Card.Title>Citizen Threat Report Console</Card.Title>
              <Card.Description>
                Details are recorded in our threat telemetry database to improve real-time detection models.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              {submitted ? (
                <div className="py-8 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                    <CheckCircle size={36} weight="fill" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    Threat Signature Successfully Recorded
                  </h3>
                  <p className="text-xs text-zinc-600 max-w-[45ch] mx-auto leading-relaxed">
                    Thank you for contributing to collective UPI security. The reported VPA and communication patterns have been flagged in our behavioral detection database.
                  </p>
                  <div className="pt-4 flex justify-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSubmitted(false)
                        setFormData({
                          scamCategory: 'Digital_Arrest',
                          fraudsterUPI: '',
                          fraudsterPhone: '',
                          phishingUrl: '',
                          amountLost: '',
                          description: '',
                          incidentDate: new Date().toISOString().slice(0, 10),
                        })
                      }}
                    >
                      Report Another Threat
                    </Button>
                    <Link to="/dashboard">
                      <Button variant="primary" size="sm">
                        Return to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Scam Typology"
                      value={formData.scamCategory}
                      onChange={(e) => handleChange('scamCategory', e.target.value)}
                      options={FRAUD_CATEGORIES.map((c) => ({
                        value: c.key,
                        label: c.label,
                      }))}
                      helperText="Select the category that best matches the attack"
                    />

                    <Input
                      label="Incident Date"
                      type="date"
                      value={formData.incidentDate}
                      onChange={(e) => handleChange('incidentDate', e.target.value)}
                    />

                    <Input
                      label="Scammer UPI ID / VPA"
                      placeholder="e.g. fake.support@axis or 9876543210@paytm"
                      isMono
                      value={formData.fraudsterUPI}
                      onChange={(e) => handleChange('fraudsterUPI', e.target.value)}
                      error={errors.fraudsterUPI}
                      icon={QrCode}
                    />

                    <Input
                      label="Caller / Sender Phone Number"
                      placeholder="e.g. +91 98765 43210"
                      isMono
                      value={formData.fraudsterPhone}
                      onChange={(e) => handleChange('fraudsterPhone', e.target.value)}
                      icon={PhoneCall}
                    />

                    <Input
                      label="Phishing Website or Payment Link"
                      placeholder="e.g. http://sbi-kyc-update.com"
                      value={formData.phishingUrl}
                      onChange={(e) => handleChange('phishingUrl', e.target.value)}
                      icon={LinkIcon}
                    />

                    <Input
                      label="Amount Lost in INR (if any)"
                      type="number"
                      placeholder="e.g. 15000 (0 if prevented)"
                      isMono
                      value={formData.amountLost}
                      onChange={(e) => handleChange('amountLost', e.target.value)}
                      icon={CurrencyInr}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-content-secondary)]">
                      Incident Description & Coercion Narrative
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe how the scammer initiated contact, what claims they made (e.g. refund, police arrest, remote app), and what instructions they gave."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className={`w-full rounded-2xl border p-3.5 text-xs text-[var(--color-content-primary)] placeholder-zinc-400 focus:border-[var(--color-brand-deep)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-deep)] ${
                        errors.description ? 'border-rose-400 bg-rose-50/20' : 'border-zinc-300'
                      }`}
                    />
                    {errors.description && (
                      <p className="text-xs font-medium text-rose-600">{errors.description}</p>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="accent"
                      size="md"
                      loading={loading}
                      icon={Flag}
                      iconPosition="right"
                    >
                      Submit Threat Signature
                    </Button>
                  </div>
                </form>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Advisory Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-weightless rounded-2xl border-l-4 border-l-rose-500 bg-rose-50/70 p-6 space-y-3 text-rose-950">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900 block">
              Urgent Golden Hour Notice
            </span>
            <p className="text-xs text-rose-900 leading-relaxed">
              If financial loss has occurred within the past 24 hours, reporting here helps our AI model, but you MUST also lodge an official government complaint immediately to freeze beneficiary bank accounts.
            </p>
            <div className="pt-1">
              <a
                href="tel:1930"
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition-colors"
              >
                Dial Helpline 1930
              </a>
            </div>
          </div>

          <Card>
            <Card.Header>
              <Card.Title>Official Sovereign Portals</Card.Title>
              <Card.Description>
                Government portals for official FIR and telecommunication spam reporting.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-3.5 text-xs">
                <li>
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[var(--color-brand-deep)] hover:underline flex items-center justify-between"
                  >
                    <span>National Cyber Crime Portal (I4C)</span>
                    <ArrowSquareOut size={14} />
                  </a>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Official MHA portal for financial cyber fraud lodging.
                  </p>
                </li>
                <li className="pt-3 border-t border-zinc-100">
                  <a
                    href="https://sancharsaathi.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[var(--color-brand-deep)] hover:underline flex items-center justify-between"
                  >
                    <span>Sanchar Saathi (Chakshu Portal)</span>
                    <ArrowSquareOut size={14} />
                  </a>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Report fraudulent WhatsApp / SMS numbers and spoofed SIM cards.
                  </p>
                </li>
                <li className="pt-3 border-t border-zinc-100">
                  <a
                    href="https://cms.rbi.org.in"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[var(--color-brand-deep)] hover:underline flex items-center justify-between"
                  >
                    <span>RBI Banking Ombudsman</span>
                    <ArrowSquareOut size={14} />
                  </a>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Lodge dispute if your bank delays reversal within statutory timelines.
                  </p>
                </li>
              </ul>
            </Card.Content>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
