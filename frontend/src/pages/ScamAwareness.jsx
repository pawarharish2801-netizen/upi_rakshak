import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  WarningOctagon,
  ShieldCheck,
  ArrowRight,
  MagnifyingGlass,
  ArrowSquareOut,
  PhoneCall,
  QrCode,
  Desktop,
  Briefcase,
  Gift,
  Users,
  HandCoins,
  Sparkle,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Badge } from '../components/common/Badge'
import { useDebounce } from '../hooks/useDebounce'

export const SCAM_DATABASE = [
  {
    id: 'digital-arrest',
    name: 'Digital Arrest Scam',
    severity: 'Critical',
    icon: WarningOctagon,
    summary:
      'Fraudsters impersonate CBI, Mumbai Customs, or Delhi Police officials on video calls, falsely claiming the victim is implicated in money laundering or narcotics shipments.',
    modusOperandi: [
      'Victim receives call claiming an illegal parcel or Aadhaar SIM cards exist under their name.',
      'Transferred to "police investigator" wearing official uniform against a police station background backdrop.',
      'Told they are under "Digital Arrest" and cannot disconnect the call, alert family, or leave camera view.',
      'Pressured to transfer all liquid savings to an "RBI verification account" or "government escrow" to prove innocence.',
    ],
    redFlags: [
      'Police or courts conducting "video call arrests" (Indian law has no concept of Digital Arrest).',
      'Demand to keep call secret from family, advocate, or bank manager.',
      'Direction to transfer funds to personal or current bank accounts for "clearance".',
    ],
    victimAction:
      'Disconnect immediately. Police NEVER demand fund transfers. Call 1930 and inform local cyber cell.',
  },
  {
    id: 'fake-refund',
    name: 'Fake Refund & Reversal Scam',
    severity: 'Critical',
    icon: HandCoins,
    summary:
      'Scammers contact consumers claiming an e-commerce, flight, or utility bill refund has been issued, but require the user to enter their UPI PIN to "receive" the funds.',
    modusOperandi: [
      'Scammer sends an unsolicited UPI Collect Request for the claimed amount.',
      'Tells victim: "Click Pay and enter your PIN, the money will credit directly into your balance."',
      'Victim authorizes the transaction, inadvertently transferring money OUT of their account.',
    ],
    redFlags: [
      'Any claim that UPI PIN is needed to credit or receive money.',
      'Receipt of an unexpected Collect Request in your UPI app.',
      'Caller guiding you step-by-step through Google Pay / PhonePe / Paytm.',
    ],
    victimAction:
      'Never authorize collect requests. UPI PIN is solely used for deducting money, never receiving.',
  },
  {
    id: 'screen-sharing',
    name: 'Screen Sharing & Remote Takeover',
    severity: 'Critical',
    icon: Desktop,
    summary:
      'Victims seeking customer support are tricked into downloading remote desktop applications like AnyDesk, TeamViewer, or RustDesk, giving scammers full view of their screen and OTPs.',
    modusOperandi: [
      'User looks up customer support on Google and calls a fraudulent SEO-poisoned number.',
      'Executive pretends to diagnose issue and tells user to install a "verification utility".',
      'User grants accessibility permissions and shares 9-digit session code.',
      'Scammer observes UPI PIN or OTP input and empties linked bank accounts.',
    ],
    redFlags: [
      'Customer support asking you to install AnyDesk, TeamViewer, or QuickSupport.',
      'Request to read out 6-digit or 9-digit codes from a newly installed app.',
      'Screen going blank or touch controls freezing.',
    ],
    victimAction:
      'Turn off WiFi/Mobile Data immediately. Uninstall the remote app and contact bank to freeze netbanking.',
  },
  {
    id: 'qr-code',
    name: 'QR Code Payee Mismatch Scam',
    severity: 'High',
    icon: QrCode,
    summary:
      'Frequently targets sellers on OLX or Facebook Marketplace. Buyer claims they cannot send money via account transfer and sends a QR code for the seller to scan to get paid.',
    modusOperandi: [
      'Scammer agrees to buy item immediately without bargaining.',
      'Sends a QR image on WhatsApp: "Scan this QR code and money will credit to your account."',
      'Scanning QR opens UPI app with "Pay" button and prompts for PIN.',
    ],
    redFlags: [
      'Buyer sending QR code to seller.',
      'QR code prompting for PIN entry.',
      'Merchant name on scan screen does not match buyer name.',
    ],
    victimAction:
      'Reject QR codes for receiving payments. Never scan a code sent by an unknown buyer.',
  },
  {
    id: 'customer-care',
    name: 'Fake Helpline & Customer Care',
    severity: 'High',
    icon: PhoneCall,
    summary:
      'Fraudsters post fake phone numbers on Google Maps, review forums, and Twitter for airlines, couriers (BlueDart, DTDC), or food delivery (Swiggy, Zomato).',
    modusOperandi: [
      'User dials fake helpline to resolve delayed parcel or refund.',
      'Imposter sends a ₹1 or ₹5 "registration link" to initiate complaint.',
      'Link triggers malicious UPI intent or installs phishing APK.',
    ],
    redFlags: [
      'Customer support answering on mobile phone numbers (starting with 6/7/8/9) rather than official 1800 toll-free.',
      'Support agent asking for registration fees to file a complaint.',
    ],
    victimAction:
      'Only use in-app helpdesks inside official verified applications.',
  },
  {
    id: 'investment',
    name: 'High-Yield Investment & Telegram Trading',
    severity: 'High',
    icon: Sparkle,
    summary:
      'Promises 20% to 100% weekly returns on crypto, algorithmic stock options, or forex trading through private Telegram channels and fake web dashboards.',
    modusOperandi: [
      'Victim invited to Telegram VIP channel showing fabricated payout screenshots.',
      'Initially victim invests ₹5,000 and is allowed to withdraw ₹6,500 to build trust.',
      'Victim deposits ₹2,00,000+; withdrawals are then blocked with demands for "income tax clearance" fees.',
    ],
    redFlags: [
      'Guaranteed high returns with zero risk.',
      'Payments routed to personal individual VPAs rather than SEBI-registered brokers.',
      'Demand for extra deposits to unlock previous earnings.',
    ],
    victimAction:
      'Never transfer investment funds via personal UPI IDs. Verify SEBI registration at sebi.gov.in.',
  },
  {
    id: 'fake-job',
    name: 'Work-From-Home Task & Review Scam',
    severity: 'Medium',
    icon: Briefcase,
    summary:
      'Messages offering part-time roles liking YouTube videos, reviewing hotels, or completing merchant orders for daily commissions.',
    modusOperandi: [
      'Victim recruited via WhatsApp or SMS offering ₹3,000/day.',
      'Small payouts given for first 3 likes.',
      'Promoted to "Prepaid Merchant Tasks" requiring ₹10,000 to ₹50,000 deposits to unlock daily earnings.',
    ],
    redFlags: [
      'Job requiring upfront payment or security deposit.',
      'Communication conducted exclusively via Telegram or WhatsApp.',
    ],
    victimAction:
      'Legitimate employers never ask employees to pay money to receive work.',
  },
  {
    id: 'lottery-cashback',
    name: 'Lottery & Cashback Claim Scam',
    severity: 'Medium',
    icon: Gift,
    summary:
      'SMS or WhatsApp announcing the recipient has won Kaun Banega Crorepati (KBC), Maruti car lucky draw, or major Flipkart cashback.',
    modusOperandi: [
      'Victim receives audio note and photo claiming ₹25,00,000 lottery win.',
      'Told to pay ₹12,500 government GST or processing fee to release prize.',
    ],
    redFlags: [
      'Winning a contest you never entered.',
      'Demand to pay tax or processing charge via UPI before receiving payout.',
    ],
    victimAction:
      'Ignore lottery claims. Genuine winnings deduct tax at source (TDS) and never demand upfront UPI fees.',
  },
  {
    id: 'impersonation',
    name: 'Emergency Impersonation Scam',
    severity: 'High',
    icon: Users,
    summary:
      'Scammer hacks or clones a friend’s social media account, or uses voice cloning to claim an urgent hospital emergency.',
    modusOperandi: [
      'Message arrives: "Hey, I am stuck in hospital, UPI server down, please transfer ₹15,000 to this doctor UPI immediately."',
      'High emotional urgency preventing victim from verifying.',
    ],
    redFlags: [
      'Urgent medical or legal emergency requested over chat.',
      'Recipient UPI handle belongs to an unknown name.',
    ],
    victimAction:
      'Always call your friend or family member directly on their phone number before transferring any emergency funds.',
  },
  {
    id: 'collect-request',
    name: 'Disguised UPI Collect Request',
    severity: 'Medium',
    icon: WarningOctagon,
    summary:
      'Unsolicited collect request pop-up sent with fraudulent remarks such as "Tax Department Clearance" or "Pending Electricity Bill".',
    modusOperandi: [
      'Notification triggers on user phone: "XYZ requested ₹4,999".',
      'User instinctively taps notification, assumes it is a payment confirmation, and enters PIN.',
    ],
    redFlags: [
      'Pop-up asking you to authorize payment you did not initiate.',
      'Remark field showing confusing or intimidating text.',
    ],
    victimAction:
      'Decline unsolicited collect requests immediately in your UPI application.',
  },
]

export default function ScamAwareness() {
  const [search, setSearch] = useState('')
  const [selectedScam, setSelectedScam] = useState(SCAM_DATABASE[0])

  // Debounced search hook from cc-skill-frontend-patterns
  const debouncedSearch = useDebounce(search, 250)

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim()
    return SCAM_DATABASE.filter(
      (s) => s.name.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)
    )
  }, [debouncedSearch])

  return (
    <PageShell
      title="Threat Taxonomy & Scam Intelligence"
      subtitle="Comprehensive knowledge base on the 10 primary UPI fraud mechanisms targeting Indian consumers."
    >
      {/* Search Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search scam types or tactics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={MagnifyingGlass}
          />
        </div>
        <div className="text-xs text-[var(--color-content-tertiary)] font-data">
          Showing {filtered.length} of {SCAM_DATABASE.length} documented typologies
        </div>
      </div>

      {/* 2-Column Split: List on Left (4 cols), Deep Dive on Right (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Typology Navigation */}
        <div className="lg:col-span-4 space-y-2.5">
          {filtered.map((scam) => {
            const Icon = scam.icon
            const isSelected = selectedScam.id === scam.id
            return (
              <div
                key={scam.id}
                onClick={() => setSelectedScam(scam)}
                className={`card-weightless rounded-2xl p-4.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[var(--color-brand-deep)] bg-white ring-2 ring-[var(--color-brand-deep)]/20 shadow-md'
                    : 'bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        isSelected
                          ? 'bg-[var(--color-brand-deep)] text-white'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      <Icon size={18} weight="bold" />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-content-primary)]">
                      {scam.name}
                    </span>
                  </div>
                  <Badge
                    variant={
                      scam.severity === 'Critical'
                        ? 'critical'
                        : scam.severity === 'High'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {scam.severity}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] text-[var(--color-content-secondary)] line-clamp-2 leading-relaxed">
                  {scam.summary}
                </p>
              </div>
            )
          })}
        </div>

        {/* Right Column: Deep-Dive Card */}
        <div className="lg:col-span-8">
          <Card>
            <Card.Header>
              <div>
                <Card.Title>{selectedScam.name}</Card.Title>
                <Card.Description>
                  Severity Tier: {selectedScam.severity} • Categorized Threat Pattern
                </Card.Description>
              </div>
              <Card.Action>
                <Link to="/assess">
                  <Button variant="accent" size="sm" icon={ArrowRight} iconPosition="right">
                    Test This Attack Pattern
                  </Button>
                </Link>
              </Card.Action>
            </Card.Header>

            <Card.Content className="space-y-6">
              {/* Executive Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-content-secondary)] mb-1.5">
                  Executive Threat Summary
                </h4>
                <p className="text-xs text-[var(--color-content-primary)] leading-relaxed">
                  {selectedScam.summary}
                </p>
              </div>

              {/* Execution Sequence */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-content-secondary)] mb-2.5">
                  Typical Modus Operandi (Execution Sequence)
                </h4>
                <div className="space-y-2">
                  {selectedScam.modusOperandi.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-800 border border-zinc-100"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-deep)] text-white text-[10px] font-bold flex-shrink-0 font-data">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning Red Flags */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2.5">
                  Critical Warning Red Flags
                </h4>
                <div className="space-y-1.5">
                  {selectedScam.redFlags.map((flag, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 text-xs text-rose-900 bg-rose-50/70 p-2.5 rounded-xl border border-rose-200"
                    >
                      <WarningOctagon
                        size={15}
                        weight="bold"
                        className="text-rose-600 flex-shrink-0"
                      />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery Guidance */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-5 space-y-2">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <ShieldCheck size={17} weight="bold" className="text-blue-700" />
                  Recommended Victim Recovery Protocol
                </span>
                <p className="text-xs text-blue-900 leading-relaxed">
                  {selectedScam.victimAction}
                </p>
              </div>

              {/* National Portals */}
              <div className="flex flex-wrap items-center justify-between border-t border-zinc-100 pt-4 text-xs text-[var(--color-content-secondary)]">
                <span>Immediate Golden Hour Helpline: Dial 1930</span>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--color-brand-deep)] hover:underline inline-flex items-center gap-1"
                >
                  File Complaint on Cybercrime Portal <ArrowSquareOut size={13} />
                </a>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
