import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  WarningOctagon,
  ChatTeardropText,
  Cpu,
  ArrowRight,
  LockKey,
  CheckCircle,
  Lightning,
  QrCode,
  HandCoins,
  Desktop,
  PhoneCall,
  Briefcase,
  Gift,
  Users,
  Sparkle,
  CaretDown,
  Play,
  Pause,
  ArrowClockwise,
  ShieldWarning,
  Check,
  MagnifyingGlass,
  SlidersHorizontal,
  X,
  Phone,
  Info,
  Scales,
} from '@phosphor-icons/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { Button } from '../components/common/Button'
import { Badge, RiskBadge } from '../components/common/Badge'
import { SpatialCard } from '../components/common/SpatialCard'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { formatINR } from '../utils/formatters'

// 5 Realistic Attack Scenarios for the Live Telemetry HUD
const TELEMETRY_SCENARIOS = [
  {
    id: 'refund',
    name: 'Inverted Refund Trap',
    category: 'Technical Trap',
    payee: 'refund.desk92@icici',
    amount: 24999,
    riskLevel: 'Critical',
    riskScore: 94,
    headline: 'PIN requested to "receive" incoming refund',
    layerA: { text: '97.2% High Fan-In Anomaly', status: 'critical' },
    layerB: { text: 'Inverted Credit Marker (PIN to Receive)', status: 'critical' },
    layerC: { text: 'Lure: E-Commerce Refund Impersonation', status: 'simulated' },
    layerD: { text: 'HARD STOP: Zero-Tolerance Violation', status: 'blocked' },
    advice: 'NEVER enter UPI PIN to receive money. Block this VPA immediately.',
  },
  {
    id: 'arrest',
    name: 'Digital Arrest Threat',
    category: 'Authority Impersonation',
    payee: 'cbi.hq.verification@sbi',
    amount: 150000,
    riskLevel: 'Critical',
    riskScore: 98,
    headline: 'Impersonating CBI Officer on Skype Video Call',
    layerA: { text: '99.4% Night Velocity Spike', status: 'critical' },
    layerB: { text: '14 Coercion Markers: Arrest, Custody, Skype', status: 'critical' },
    layerC: { text: 'Lure: False Narcotics/Passport Extortion', status: 'simulated' },
    layerD: { text: 'HARD STOP: Law Enforcement VPA Spoof', status: 'blocked' },
    advice: 'CBI and Police never demand money transfers via Skype. Disconnect and call 1930.',
  },
  {
    id: 'screen',
    name: 'Screen Sharing Takeover',
    category: 'Technical Trap',
    payee: 'customercare.desk@ybl',
    amount: 45000,
    riskLevel: 'High',
    riskScore: 86,
    headline: 'Victim asked to download AnyDesk / RustDesk',
    layerA: { text: '88.5% Unverified New Payee Handle', status: 'warning' },
    layerB: { text: 'Remote APK Installation Vector Detected', status: 'critical' },
    layerC: { text: 'Lure: Bank KYC / Technical Support Assist', status: 'simulated' },
    layerD: { text: 'HARD STOP: Remote Control Process Flagged', status: 'blocked' },
    advice: 'Uninstall AnyDesk immediately. Do not share your 9-digit code with callers.',
  },
  {
    id: 'electricity',
    name: 'Electricity Cut-off SMS',
    category: 'Social Engineering',
    payee: 'power.bill.desk@okaxis',
    amount: 3200,
    riskLevel: 'High',
    riskScore: 82,
    headline: 'Power disconnect deadline countdown intimidation',
    layerA: { text: '84.0% Velocity Outlier for Utility', status: 'warning' },
    layerB: { text: 'Artificial Urgency: "Power Cut at 9:30 PM"', status: 'critical' },
    layerC: { text: 'Lure: State Electricity Board Phishing', status: 'simulated' },
    layerD: { text: 'GUARD: Spoofed Unregistered Utility VPA', status: 'blocked' },
    advice: 'Pay electricity bills only through the official state portal or registered BBPS.',
  },
  {
    id: 'legit',
    name: 'Swiggy Merchant Payment',
    category: 'Verified Commercial',
    payee: 'swiggy.order@hdfcbank',
    amount: 480,
    riskLevel: 'Low',
    riskScore: 3,
    headline: 'Verified NPCI Merchant Settlement',
    layerA: { text: '0.01% Normal Behavioral Frequency', status: 'safe' },
    layerB: { text: 'Zero Coercive or Social Vectors', status: 'safe' },
    layerC: { text: 'Entity: Swiggy Food Delivery (Verified)', status: 'simulated' },
    layerD: { text: 'CLEAR: Authorized Merchant Pattern', status: 'clear' },
    advice: 'Safe to proceed. Beneficiary has verified corporate credentials.',
  },
]

// 10 Detailed Scam Typology Knowledge Base
const TYPOLOGY_DATABASE = [
  {
    id: 'refund',
    name: 'Fake Refund & Reversal Scam',
    category: 'social',
    badge: 'High Frequency',
    threat: 'Tricks victims into entering their UPI PIN under the false premise that it is required to "receive" a refund or prize money.',
    mechanics: 'Criminals trigger a UPI Collect Request or generate a malicious collect link. When the victim enters the PIN, money is debited instead of credited.',
    vulnerability: 'Misunderstanding of UPI protocol: Many citizens believe entering a PIN receives credits.',
    goldenHour: '1. Call bank within 2 hours to reverse collect request. 2. Report UTR number at cybercrime.gov.in. 3. Dial 1930.',
  },
  {
    id: 'arrest',
    name: 'Digital Arrest / Cyber Police Scam',
    category: 'impersonation',
    badge: 'Severe Financial Loss',
    threat: 'Criminals impersonate police, CBI, ED, or Customs officers over Skype or WhatsApp video, claiming the victim’s Aadhaar was found in narcotics or money laundering.',
    mechanics: 'Victims are kept on video call for hours ("digital arrest") and coerced into transferring funds to an "RBI verification account" for clearance.',
    vulnerability: 'Fear of legal prosecution, social stigma, and intimidation by fake uniforms and spoofed police stations.',
    goldenHour: '1. Disconnect immediately—no Indian agency conducts video trials. 2. Call local police or 1930. 3. Do not send further funds.',
  },
  {
    id: 'screenshare',
    name: 'Screen Sharing Remote Access',
    category: 'technical',
    badge: 'Device Compromise',
    threat: 'Fraudsters convince victims to install AnyDesk, TeamViewer QuickSupport, or RustDesk under the guise of customer support.',
    mechanics: 'Once installed, the attacker views the victim’s screen, observes banking OTPs, and captures UPI PIN keystrokes.',
    vulnerability: 'Technical confusion and trust in customer service representatives.',
    goldenHour: '1. Enable Airplane mode instantly. 2. Uninstall the remote app. 3. Call bank from another phone to freeze UPI IDs.',
  },
  {
    id: 'customercare',
    name: 'Spoofed Customer Care Helpline',
    category: 'impersonation',
    badge: 'Search Engine Poisoning',
    threat: 'Scammers buy Google Ads and edit Google Maps listings with fake customer support phone numbers for airlines, courier firms, or banks.',
    mechanics: 'When callers dial seeking refund or parcel updates, scammers extract UPI details and send phishing links.',
    vulnerability: 'Trust in top search engine results as authoritative customer support.',
    goldenHour: '1. Only verify phone numbers on the official app or website. 2. Block the dialed number. 3. File complaint on 1930.',
  },
  {
    id: 'investment',
    name: 'Telegram VIP Investment Scam',
    category: 'social',
    badge: 'High Value Drain',
    threat: 'Promises compounding 200% daily returns via fake crypto, forex, or institutional stock trading platforms.',
    mechanics: 'Victims are shown fake dashboard profits on bogus websites. Withdrawals are blocked until exorbitant "service taxes" are paid via UPI.',
    vulnerability: 'Greed, promise of effortless passive income, and social proof in manipulated Telegram groups.',
    goldenHour: '1. Stop all payments immediately. 2. Screenshot chat history and UPI transaction IDs. 3. File cyber complaint.',
  },
  {
    id: 'qrcode',
    name: 'OLX / Marketplace QR Code Trap',
    category: 'technical',
    badge: 'Seller Target',
    threat: 'A purported buyer on OLX or Facebook Marketplace agrees to buy goods and sends a QR code claiming "Scan this QR to receive advance token money".',
    mechanics: 'Scanning a QR code on PhonePe, Google Pay, or Paytm ALWAYS initiates a debit from your account, never a deposit.',
    vulnerability: 'Confusion regarding QR code directionality: QR codes only send money, never receive.',
    goldenHour: '1. Immediately inform marketplace admins. 2. Lodge report on National Cyber Crime Portal.',
  },
  {
    id: 'collect',
    name: 'Disguised UPI Collect Request',
    category: 'technical',
    badge: 'Stealth Phishing',
    threat: 'Victim receives an unsolicited notification on their UPI app disguised as an official cashback, rebate, or bill payment.',
    mechanics: 'The payment note says "Approved Cashback ₹5,000", but the underlying UPI transaction is a payment request for ₹5,000 from the victim.',
    vulnerability: 'App notification fatigue and hastily pressing "Approve" without reading the amount direction.',
    goldenHour: '1. Never click Approve on unexpected notifications. 2. Decline request and report spam inside the UPI app.',
  },
  {
    id: 'joboffer',
    name: 'Part-Time Work / YouTube Like Scam',
    category: 'social',
    badge: 'Youth & Student Target',
    threat: 'Unsolicited WhatsApp/Telegram messages offering ₹3,000 daily for liking YouTube videos or writing Google hotel reviews.',
    mechanics: 'Victims receive small payouts initially (₹150) to build trust, then are asked to deposit "security deposits" of ₹50,000+ for higher payout tiers.',
    vulnerability: 'Lure of flexible remote work and false validation from early micro-payments.',
    goldenHour: '1. Keep evidence of all initial micro-transfers. 2. Report associated Telegram handles and UPI VPAs to 1930.',
  },
  {
    id: 'lottery',
    name: 'Lottery / Cashback Advance Tax Scam',
    category: 'social',
    badge: 'Phishing Voucher',
    threat: 'Fake scratch cards in courier packages or SMS links claiming a car or ₹25 Lakhs cash prize in an anniversary lucky draw.',
    mechanics: 'Scammers demand 18% "GST advance clearance" or "processing stamp duty" to release the grand prize.',
    vulnerability: 'Excitement over unexpected winnings.',
    goldenHour: '1. Real lotteries deduct taxes from winnings; they never ask for UPI advance payments. 2. Disregard and block sender.',
  },
  {
    id: 'friend',
    name: 'Emergency Friend / Hospital Impersonation',
    category: 'impersonation',
    badge: 'Social Hijack',
    threat: 'Criminals compromise an acquaintance’s WhatsApp account or create a duplicate profile with their photo, pleading for urgent hospital surgery money.',
    mechanics: 'They claim UPI daily limit is exhausted or bank server is down and ask you to transfer funds to a "doctor’s" UPI ID.',
    vulnerability: 'Compassion and urgency to help a friend in distress.',
    goldenHour: '1. ALWAYS call the friend directly on their standard cellular phone number before sending money. 2. Verify with mutual contacts.',
  },
]

export default function Landing() {
  const isReduced = useReducedMotion()

  // Telemetry HUD state
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0)
  const [isLiveCycling, setIsLiveCycling] = useState(true)
  const activeScenario = TELEMETRY_SCENARIOS[activeScenarioIdx]

  // Layer Architecture Interactive State
  const [activeLayer, setActiveLayer] = useState('layerA')

  // Typology state
  const [typologyFilter, setTypologyFilter] = useState('all')
  const [typologySearch, setTypologySearch] = useState('')
  const [selectedTypology, setSelectedTypology] = useState(null)

  // Interactive Live Pre-PIN Calculator Sandbox State
  const [calcAmount, setCalcAmount] = useState(24999)
  const [calcVpa, setCalcVpa] = useState('refund.desk92@icici')
  const [calcFlags, setCalcFlags] = useState({
    firstTime: true,
    pinToReceive: true,
    screenShare: false,
    urgencyClaim: true,
    authoritySpoof: false,
  })

  // Auto-cycle live telemetry preview every 5 seconds if not paused
  useEffect(() => {
    if (!isLiveCycling || isReduced) return
    const interval = setInterval(() => {
      setActiveScenarioIdx((prev) => (prev + 1) % TELEMETRY_SCENARIOS.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [isLiveCycling, isReduced])

  // Real-time calculation of Sandbox Score based on safety engine heuristics
  const sandboxVerdict = useMemo(() => {
    let score = 5
    const warnings = []

    if (calcAmount > 50000) {
      score += 20
      warnings.push('High-value transfer exceeds standard bilateral thresholds')
    } else if (calcAmount > 15000) {
      score += 10
      warnings.push('Elevated transaction amount')
    }

    if (calcFlags.pinToReceive) {
      score += 55
      warnings.push('CRITICAL: PIN requested to receive funds (Inverted Credit Trap)')
    }
    if (calcFlags.screenShare) {
      score += 50
      warnings.push('CRITICAL: Remote screen sharing application (AnyDesk/RustDesk) active')
    }
    if (calcFlags.authoritySpoof) {
      score += 35
      warnings.push('Police/CBI/RBI legal intimidation vector detected')
    }
    if (calcFlags.urgencyClaim) {
      score += 20
      warnings.push('Artificial coercive time pressure countdown enforced')
    }
    if (calcFlags.firstTime) {
      score += 12
      warnings.push('First-time recipient with zero prior verified history')
    }

    const finalScore = Math.min(100, Math.max(0, score))
    let level = 'Low'
    if (finalScore >= 80) level = 'Critical'
    else if (finalScore >= 55) level = 'High'
    else if (finalScore >= 30) level = 'Medium'

    return { score: finalScore, level, warnings }
  }, [calcAmount, calcFlags])

  const filteredTypologies = useMemo(() => {
    return TYPOLOGY_DATABASE.filter((t) => {
      const matchCat = typologyFilter === 'all' || t.category === typologyFilter
      const matchSearch =
        !typologySearch ||
        t.name.toLowerCase().includes(typologySearch.toLowerCase()) ||
        t.threat.toLowerCase().includes(typologySearch.toLowerCase())
      return matchCat && matchSearch
    })
  }, [typologyFilter, typologySearch])

  // Framer Motion accessible variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: isReduced ? 0.03 : 0.07,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: isReduced ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: isReduced
        ? { duration: 0.15 }
        : { type: 'spring', stiffness: 120, damping: 20 },
    },
  }

  const scrollToNext = () => {
    document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="bg-[var(--color-brand-midnight)] text-white selection:bg-[var(--color-brand-accent)] selection:text-white relative overflow-x-hidden font-sans">
      {/* Background Spatial Atmosphere */}
      <div className="fixed inset-0 bg-spatial-grid-dark opacity-35 pointer-events-none" />
      <div className="fixed top-[-150px] left-[-150px] w-[500px] h-[500px] rounded-full bg-[var(--color-brand-deep)]/40 blur-[140px] pointer-events-none" />
      <div className="fixed top-[40%] right-[-100px] w-[500px] h-[500px] rounded-full bg-[var(--color-brand-accent)]/10 blur-[160px] pointer-events-none" />

      {/* =========================================================================
          CHAPTER 1: FULL VIEWPORT HERO FOLD
          Guaranteed single-screen stage (h-[100dvh] min-h-[680px] max-h-[1100px])
          Section 2 will NEVER peek into this screen!
          ========================================================================= */}
      <div className="h-[100dvh] min-h-[680px] max-h-[1100px] flex flex-col justify-between relative z-20 border-b border-white/[0.08] overflow-hidden">
        {/* Top Sovereign Trust Ribbon */}
        <div className="border-b border-white/[0.08] bg-black/60 backdrop-blur-md px-4 py-2 text-xs text-white/70 flex-shrink-0">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <LockKey size={14} className="text-emerald-400" />
              Zero-Knowledge Sovereign Payment Defense • No Credential Storage • Client-Side NLP
            </span>
            <span className="hidden sm:inline font-data text-white/50">
              National Cyber Crime Reporting Helpline: <strong className="text-white">1930</strong>
            </span>
          </div>
        </div>

        {/* Floating Navbar */}
        <div className="flex-shrink-0">
          <Navbar />
        </div>

        {/* Hero Content Stage (Vertically Centered) */}
        <div className="mx-auto max-w-[1400px] w-full px-4 sm:px-6 lg:px-8 my-auto py-2">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left 7 Columns: Swiss Precision Pitch & Call to Action */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5 lg:col-span-7"
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs text-white/90 backdrop-blur-md shadow-sm"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--color-brand-accent)] animate-pulse" />
                <span className="font-semibold tracking-wide uppercase text-[11px] text-white/80">
                  Pre-Transaction Behavioral AI Engine
                </span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.08]"
              >
                Intercept UPI scams{' '}
                <span className="text-[var(--color-brand-accent)] underline decoration-white/20 underline-offset-8">
                  before
                </span>{' '}
                you authorize the PIN.
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-sm sm:text-base lg:text-lg text-white/75 leading-relaxed max-w-[56ch]"
              >
                Multi-agent cybersecurity intelligence synthesizing transaction velocity, social engineering NLP, and deterministic safety rules to protect Indian citizens from digital arrest, fake refunds, and collect-request fraud.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 pt-1">
                <Link to="/assess">
                  <Button
                    variant="accent"
                    size="lg"
                    icon={ArrowRight}
                    iconPosition="right"
                    className="shadow-[0_12px_24px_-8px_rgba(232,97,58,0.5)] glow-accent"
                  >
                    Evaluate Payment Risk
                  </Button>
                </Link>
                <Link to="/scan">
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={ChatTeardropText}
                    className="bg-white/10 text-white border-white/20 hover:bg-white/15 backdrop-blur-md"
                  >
                    Scan Suspicious Chat
                  </Button>
                </Link>
              </motion.div>

              {/* Trust Metric Chips with Swiss Opacity Hierarchy */}
              <motion.div
                variants={itemVariants}
                className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-white/70"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>100k Synthesized Real Scenarios</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Zero-Trust / No Credential Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>10 Documented Scam Typologies</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right 5 Columns: Interactive Cyber Telemetry Simulator HUD */}
            <div className="lg:col-span-5">
              <SpatialCard dark maxTilt={8} className="p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                {/* Radar Sweep Effect (Tier 1 Motion Gated) */}
                {!isReduced && (
                  <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20 overflow-hidden">
                    <div className="w-full h-full rounded-full border border-emerald-400/30 animate-radar" />
                  </div>
                )}

                {/* HUD Header with WCAG 2.2.2 Autoplay Pause Toggle */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      {isLiveCycling && !isReduced && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          activeScenario.riskLevel === 'Critical'
                            ? 'bg-rose-500'
                            : activeScenario.riskLevel === 'High'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </span>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-white/90">
                      Live Telemetry Interceptor
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLiveCycling(!isLiveCycling)}
                      aria-pressed={!isLiveCycling}
                      title={isLiveCycling ? 'Pause live auto-cycle' : 'Resume live auto-cycle'}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] flex items-center gap-1 transition-colors border border-white/10"
                    >
                      {isLiveCycling ? <Pause size={10} /> : <Play size={10} />}
                      <span>{isLiveCycling ? 'LIVE' : 'PAUSED'}</span>
                    </button>

                    <RiskBadge level={activeScenario.riskLevel} size="sm" />
                  </div>
                </div>

                {/* Attack Scenario Switcher Pills */}
                <div className="flex items-center gap-1.5 pt-3 pb-1 overflow-x-auto no-scrollbar">
                  {TELEMETRY_SCENARIOS.map((scen, idx) => (
                    <button
                      key={scen.id}
                      onClick={() => {
                        setActiveScenarioIdx(idx)
                        setIsLiveCycling(false)
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                        activeScenarioIdx === idx
                          ? 'bg-white/15 text-white shadow-sm border border-white/25'
                          : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                      }`}
                    >
                      {scen.name}
                    </button>
                  ))}
                </div>

                {/* Animated Scenario Card Body */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScenario.id}
                    initial={{ opacity: 0, y: isReduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: isReduced ? 0 : -8 }}
                    transition={{ duration: isReduced ? 0.12 : 0.22 }}
                    className="mt-3 space-y-3"
                  >
                    {/* Payee Target Strip */}
                    <div
                      className={`rounded-xl border p-3.5 backdrop-blur-md transition-colors ${
                        activeScenario.riskLevel === 'Critical'
                          ? 'border-rose-500/40 bg-rose-950/40'
                          : activeScenario.riskLevel === 'High'
                          ? 'border-amber-500/40 bg-amber-950/40'
                          : 'border-emerald-500/30 bg-emerald-950/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider ${
                              activeScenario.riskLevel === 'Critical'
                                ? 'text-rose-300'
                                : activeScenario.riskLevel === 'High'
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            Flagged Beneficiary VPA
                          </span>
                          <p className="text-sm font-bold font-data text-white mt-0.5">
                            {activeScenario.payee}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold font-data text-white">
                            {formatINR(activeScenario.amount)}
                          </span>
                          <span className="block text-[10px] font-data text-white/50">
                            Score: {activeScenario.riskScore}/100
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 text-xs text-white/90 border-t border-white/10 pt-2">
                        {activeScenario.riskLevel === 'Critical' || activeScenario.riskLevel === 'High' ? (
                          <WarningOctagon size={16} weight="fill" className="text-rose-400 flex-shrink-0" />
                        ) : (
                          <CheckCircle size={16} weight="fill" className="text-emerald-400 flex-shrink-0" />
                        )}
                        <span className="line-clamp-1">{activeScenario.headline}</span>
                      </div>
                    </div>

                    {/* 4-Layer Diagnostic Pipeline Live Output */}
                    <div className="space-y-2 rounded-xl bg-black/60 p-3.5 border border-white/[0.08] text-xs">
                      <p className="font-semibold text-white/80 uppercase tracking-wider text-[10px] flex items-center justify-between">
                        <span>4-Layer Detection Engine Status</span>
                        <span className="font-data text-emerald-400">LATENCY: 38ms</span>
                      </p>

                      <div className="flex items-center justify-between text-white/75">
                        <span className="flex items-center gap-1.5">
                          <Cpu size={14} className="text-blue-400" /> Layer A: ML Gradient Classifier
                        </span>
                        <span className="font-data font-semibold text-white text-[11px]">
                          {activeScenario.layerA.text}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-white/75">
                        <span className="flex items-center gap-1.5">
                          <ChatTeardropText size={14} className="text-amber-400" /> Layer B: NLP Coercion Parser
                        </span>
                        <span className="font-data font-semibold text-white text-[11px]">
                          {activeScenario.layerB.text}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-white/75">
                        <span className="flex items-center gap-1.5">
                          <Lightning size={14} className="text-purple-400" /> Layer C: Jev AI Intelligence
                        </span>
                        <span className="font-data font-semibold text-purple-300 text-[11px]">
                          {activeScenario.layerC.text}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-white/75">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-emerald-400" /> Layer D: Deterministic Rules
                        </span>
                        <span
                          className={`font-data font-bold text-[11px] ${
                            activeScenario.layerD.status === 'blocked' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {activeScenario.layerD.text}
                        </span>
                      </div>
                    </div>

                    {/* Quick Preventive Action Footer */}
                    <div className="pt-1 flex items-center gap-2">
                      <Link to="/assess" className="flex-1">
                        <Button variant="accent" size="sm" className="w-full text-xs">
                          Test Your Own Transaction →
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </SpatialCard>
            </div>
          </div>
        </div>

        {/* Scroll Invitation Anchor at the Base of Hero Fold */}
        <div
          onClick={scrollToNext}
          className="mx-auto flex flex-col items-center justify-center pb-3 text-xs text-white/50 tracking-wider font-semibold cursor-pointer group hover:text-white transition-colors select-none flex-shrink-0"
        >
          <span className="text-[10px] uppercase tracking-widest text-white/40 group-hover:text-white/75 mb-1 transition-colors">
            Scroll to Inspect Architecture Pipeline
          </span>
          <motion.div
            animate={isReduced ? { y: 0 } : { y: [0, 4, 0] }}
            transition={
              isReduced ? { duration: 0 } : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
            }
          >
            <CaretDown size={16} className="text-[var(--color-brand-accent)]" />
          </motion.div>
        </div>
      </div>

      {/* =========================================================================
          CHAPTER 2: MULTI-LAYER DEFENSE ARCHITECTURE
          Dedicated full-viewport stage (min-h-[100dvh]) with interactive layer switcher
          ========================================================================= */}
      <section
        id="architecture"
        className="px-4 py-20 lg:py-28 lg:px-8 bg-zinc-950/95 border-b border-white/[0.08] relative min-h-[100dvh] flex flex-col justify-center"
      >
        <div className="mx-auto max-w-[1400px] w-full my-auto">
          {/* Section Header */}
          <div className="mb-10 max-w-[65ch]">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-accent)]">
              Multi-Layer Defense Pipeline
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Why traditional banking rules fail against UPI social engineering
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
              UPI transfers execute in milliseconds via cryptographic authorization. Criminals do not hack encryption; they hack human psychology. UPI Rakshak evaluates both behavioral telemetry and psychological coercion before you enter your PIN.
            </p>
          </div>

          {/* Layer Selector Tab Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8 bg-white/[0.03] p-1.5 rounded-xl border border-white/10">
            {[
              { id: 'layerA', label: 'Layer A: ML Classifier', icon: Cpu, badge: '97.2% AUC' },
              { id: 'layerB', label: 'Layer B: NLP Intent', icon: ChatTeardropText, badge: '15 Vectors' },
              { id: 'layerC', label: 'Layer C: Jev AI Intelligence', icon: Lightning, badge: 'Simulated Engine' },
              { id: 'layerD', label: 'Layer D: Deterministic Rules', icon: ShieldCheck, badge: 'Hard Stops' },
            ].map((tab) => {
              const Icon = tab.icon
              const isSelected = activeLayer === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveLayer(tab.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--color-brand-deep)] text-white shadow-lg border border-white/20'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon size={20} className={isSelected ? 'text-[var(--color-brand-accent)]' : 'text-white/50'} />
                  <div>
                    <span className="text-[10px] block font-data text-white/40 uppercase">
                      {tab.badge}
                    </span>
                    <span className="text-xs font-bold line-clamp-1">{tab.label}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Layer Detail Focus Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left 7 Columns: Technical Specifications */}
            <div className="lg:col-span-7 glass-panel-dark rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              {activeLayer === 'layerA' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-data text-blue-400 font-bold uppercase tracking-wider">
                      STAGE 01 • GRADIENT BOOSTED TREES
                    </span>
                    <Badge variant="neutral" size="sm">0.972 Stratified AUC</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Behavioral Anomaly & Velocity Classifier
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    Trained on 100,000 synthesized transactions with stratified temporal holdout validation. Evaluates high-frequency fan-in anomalies, 30-day sender deviation spikes, and high-risk nocturnal payment velocity clusters.
                  </p>

                  <div className="space-y-2 pt-3">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider block">
                      Feature Importance Weights:
                    </span>
                    <div className="space-y-1.5 text-xs font-data">
                      <div>
                        <div className="flex justify-between text-white/80 mb-0.5">
                          <span>Payee Fan-In Ratio (distinct senders/hour)</span>
                          <span className="text-blue-400 font-bold">34%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full w-[34%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-white/80 mb-0.5">
                          <span>Sender 30-Day Historical Deviation</span>
                          <span className="text-blue-400 font-bold">28%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full w-[28%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-white/80 mb-0.5">
                          <span>Nocturnal Velocity Clustering (2 AM - 5 AM)</span>
                          <span className="text-blue-400 font-bold">20%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full w-[20%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeLayer === 'layerB' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-data text-amber-400 font-bold uppercase tracking-wider">
                      STAGE 02 • SOCIAL ENGINEERING NLP
                    </span>
                    <Badge variant="warning" size="sm">15 Semantic Vectors</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Psychological Coercion & Dialogue Parser
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    Scans chat dialogue, SMS alerts, and transaction notes for deception vectors. Specifically traps authority impersonation (police, CBI, RBI), artificial countdowns, and instructions requesting a PIN to receive incoming refunds.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                    <div className="rounded-xl bg-black/40 p-3 border border-white/10">
                      <span className="text-amber-400 font-bold block mb-1">Authority Cloaking</span>
                      <p className="text-white/60">Flags mentions of CBI, ED, Mumbai Police, and RBI verification accounts.</p>
                    </div>
                    <div className="rounded-xl bg-black/40 p-3 border border-white/10">
                      <span className="text-amber-400 font-bold block mb-1">Inverted Credit Marker</span>
                      <p className="text-white/60">Detects claims that entering a 4/6 digit PIN will deposit money into your account.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeLayer === 'layerC' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-data text-purple-400 font-bold uppercase tracking-wider">
                      STAGE 03 • DECISION INTELLIGENCE
                    </span>
                    <Badge variant="neutral" size="sm">Simulated Jev AI</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Structured Decision Intelligence
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    Synthesizes statistical risk scores and linguistic tokens into a transparent, defensible risk narrative. Translates raw probabilities into plain-language advice that a user can understand in under 3 seconds before authorizing payment.
                  </p>

                  <div className="rounded-xl bg-purple-950/30 p-4 border border-purple-500/20 text-xs space-y-2">
                    <span className="text-purple-300 font-bold block">Production Integration Notice:</span>
                    <p className="text-white/70 leading-relaxed">
                      UPI Rakshak clearly marks Layer C as simulated demonstration intelligence until the official Jev API enterprise key is connected. The deterministic local engine mirrors the planned production response schema.
                    </p>
                  </div>
                </div>
              )}

              {activeLayer === 'layerD' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-data text-emerald-400 font-bold uppercase tracking-wider">
                      STAGE 04 • DETERMINISTIC SAFETY ENGINE
                    </span>
                    <Badge variant="critical" size="sm">Zero Override</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Programmatic Python Hard Stops
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    Statistically high confidence cannot override non-negotiable safety rules. If any unconditional scam signature is triggered, Layer D halts execution immediately, advising a complete transaction stop.
                  </p>

                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-white/80">
                      <Check size={16} className="text-emerald-400 flex-shrink-0" />
                      <span>Inverted Credit Check: Hard stop if PIN requested for credit.</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Check size={16} className="text-emerald-400 flex-shrink-0" />
                      <span>Remote Process Check: Hard stop if AnyDesk/TeamViewer active.</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Check size={16} className="text-emerald-400 flex-shrink-0" />
                      <span>Law Enforcement Spoof: Automatic block on unverified official VPAs.</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50 font-data">
                <span>Inference Pipeline Latency: &lt; 42ms</span>
                <span>Calibrated against 100k Synthesized Transactions</span>
              </div>
            </div>

            {/* Right 5 Columns: Interactive Multi-Layer Execution Trace */}
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/70 p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-brand-accent)]">
                  Simulate Execution Pipeline
                </span>
                <h4 className="text-lg font-bold text-white">
                  Inspect How a Transaction Flows Through All 4 Layers
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Every transaction passes through all 4 layers in strict sequential order. No layer can be bypassed.
                </p>

                {/* Pipeline Flowchart Visualization */}
                <div className="space-y-2 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      <span>Layer A: ML Velocity Filter</span>
                    </span>
                    <span className="font-data text-blue-400">PASSED (0.972)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span>Layer B: NLP Social Vector</span>
                    </span>
                    <span className="font-data text-amber-400">COERCION DETECTED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>Layer C: Jev AI Synthesis</span>
                    </span>
                    <span className="font-data text-purple-300">NARRATIVE GENERATED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span>Layer D: Hard Guardrails</span>
                    </span>
                    <span className="font-data text-rose-400 font-bold">HARD STOP ENFORCED</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link to="/assess">
                  <Button variant="accent" size="sm" className="w-full text-xs">
                    Evaluate Your Transaction in Full Console →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 3: INTERACTIVE PRE-PIN RISK SANDBOX WIDGET
          A live testing console directly on the landing page!
          ========================================================================= */}
      <section className="px-4 py-20 lg:py-28 lg:px-8 relative min-h-[100dvh] flex flex-col justify-center border-b border-white/[0.08] bg-[var(--color-brand-midnight)]">
        <div className="mx-auto max-w-[1400px] w-full my-auto">
          <div className="mb-10 text-center max-w-[65ch] mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-accent)]">
              Interactive Pre-PIN Sandbox
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Test Any Transaction Scenario in Real Time
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Adjust the payment amount and toggle threat indicators below to see how UPI Rakshak’s multi-agent decision engine evaluates risk before authorization.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Columns: Interactive Controls */}
            <div className="lg:col-span-7 glass-panel-dark rounded-2xl p-6 sm:p-8 space-y-6">
              {/* VPA Target & Quick Chips */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-2">
                  Target UPI ID (VPA):
                </label>
                <input
                  type="text"
                  value={calcVpa}
                  onChange={(e) => setCalcVpa(e.target.value)}
                  className="w-full rounded-xl bg-black/50 border border-white/20 p-3 text-sm font-data text-white placeholder-white/30 focus:border-[var(--color-brand-accent)] focus:outline-none"
                  placeholder="e.g. refund.desk92@icici"
                />
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] uppercase font-semibold text-white/40">Quick Presets:</span>
                  {[
                    { label: 'refund.support@icici', flag: 'pin' },
                    { label: 'cbi.verification@sbi', flag: 'cbi' },
                    { label: 'swiggy.orders@hdfcbank', flag: 'safe' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setCalcVpa(p.label)
                        if (p.flag === 'pin') {
                          setCalcFlags({ firstTime: true, pinToReceive: true, screenShare: false, urgencyClaim: true, authoritySpoof: false })
                          setCalcAmount(24999)
                        } else if (p.flag === 'cbi') {
                          setCalcFlags({ firstTime: true, pinToReceive: false, screenShare: false, urgencyClaim: true, authoritySpoof: true })
                          setCalcAmount(150000)
                        } else {
                          setCalcFlags({ firstTime: false, pinToReceive: false, screenShare: false, urgencyClaim: false, authoritySpoof: false })
                          setCalcAmount(480)
                        }
                      }}
                      className="text-[10px] font-data px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Payment Amount:
                  </label>
                  <span className="text-lg font-bold font-data text-[var(--color-brand-accent)]">
                    {formatINR(calcAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={200000}
                  step={500}
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand-accent)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/40 font-data">
                  <span>₹100 (Micro)</span>
                  <span>₹50,000 (Average)</span>
                  <span>₹2,00,000 (Limit)</span>
                </div>
              </div>

              {/* Threat Indicator Toggles */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70 block">
                  Active Situational Threat Markers:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: 'pinToReceive', label: 'PIN requested to "receive" funds', desc: 'Inverted credit fraud trap' },
                    { key: 'screenShare', label: 'AnyDesk / Screen share requested', desc: 'Remote device takeover APK' },
                    { key: 'authoritySpoof', label: 'Caller claims CBI / Police / RBI', desc: 'Digital arrest coercion' },
                    { key: 'urgencyClaim', label: 'Urgent deadline countdown', desc: 'Threat of power cut or freeze' },
                    { key: 'firstTime', label: 'First-time recipient VPA', desc: 'Zero prior bilateral transfers' },
                  ].map((t) => {
                    const active = calcFlags[t.key]
                    return (
                      <button
                        key={t.key}
                        onClick={() =>
                          setCalcFlags((prev) => ({ ...prev, [t.key]: !prev[t.key] }))
                        }
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          active
                            ? 'bg-rose-950/40 border-rose-500/50 text-white'
                            : 'bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span
                          className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center flex-shrink-0 border ${
                            active ? 'bg-rose-600 border-rose-500 text-white' : 'border-white/30'
                          }`}
                        >
                          {active && <Check size={12} weight="bold" />}
                        </span>
                        <div>
                          <span className="font-semibold block text-white">{t.label}</span>
                          <span className="text-[10px] text-white/50 block mt-0.5">{t.desc}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Live Calculated Risk Verdict */}
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/80 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Calculated Risk Assessment
                </span>
                <RiskBadge level={sandboxVerdict.level} size="md" />
              </div>

              {/* Dynamic Score Gauge & Number */}
              <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center h-24 w-24 rounded-full border-4 border-white/10 flex-shrink-0">
                  <div
                    className={`absolute inset-0 rounded-full blur-lg opacity-40 ${
                      sandboxVerdict.level === 'Critical'
                        ? 'bg-rose-500'
                        : sandboxVerdict.level === 'High'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-3xl font-extrabold font-data text-white relative z-10">
                    {sandboxVerdict.score}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {sandboxVerdict.level === 'Critical'
                      ? 'Critical Threat Detected'
                      : sandboxVerdict.level === 'High'
                      ? 'High Risk Pattern'
                      : 'Low Risk — Standard Vigilance'}
                  </h4>
                  <p className="text-xs text-white/65 mt-1 leading-relaxed">
                    {sandboxVerdict.level === 'Critical'
                      ? 'Immediate hard stop enforced. Do NOT authorize with PIN.'
                      : sandboxVerdict.level === 'High'
                      ? 'Multiple coercion markers detected. Verify recipient identity.'
                      : 'No critical coercion signals found. Safe to proceed.'}
                  </p>
                </div>
              </div>

              {/* Detected Warning List */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                  Active Risk Flags ({sandboxVerdict.warnings.length}):
                </span>
                <div className="space-y-1.5 text-xs">
                  {sandboxVerdict.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-rose-300">
                      <WarningOctagon size={14} className="mt-0.5 flex-shrink-0 text-rose-400" />
                      <span>{w}</span>
                    </div>
                  ))}
                  {sandboxVerdict.warnings.length === 0 && (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle size={14} />
                      <span>Zero high-risk coercion or velocity patterns flagged.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Link to="/assess">
                  <Button variant="accent" size="sm" className="w-full">
                    Launch Full Assessment Suite →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CHAPTER 4: 10 SCAM TYPOLOGIES THREAT MATRIX
          Full-viewport stage with category filter and search
          ========================================================================= */}
      <section className="px-4 py-20 lg:py-28 lg:px-8 relative min-h-[100dvh] flex flex-col justify-center border-b border-white/[0.08]">
        <div className="mx-auto max-w-[1400px] w-full my-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-accent)]">
                Threat Knowledge Base
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Protection across 10 critical UPI fraud typologies
              </h2>
            </div>
            <Link
              to="/awareness"
              className="text-sm font-semibold text-[var(--color-brand-accent)] hover:underline inline-flex items-center gap-1 flex-shrink-0"
            >
              Browse complete citizen recovery handbook <ArrowRight size={14} />
            </Link>
          </div>

          {/* Search & Category Filter Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All 10 Typologies' },
                { id: 'social', label: 'Social Engineering' },
                { id: 'impersonation', label: 'Authority Impersonation' },
                { id: 'technical', label: 'Technical Traps' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTypologyFilter(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
                    typologyFilter === cat.id
                      ? 'bg-white text-zinc-950 font-bold shadow-md'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <MagnifyingGlass size={14} className="absolute left-3 top-3 text-white/40" />
              <input
                type="text"
                placeholder="Search scams..."
                value={typologySearch}
                onChange={(e) => setTypologySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Typology Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {filteredTypologies.map((scam, i) => (
              <motion.div
                key={scam.id}
                layout
                onClick={() => setSelectedTypology(scam)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/30 hover:bg-white/[0.06] transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between text-white/50 text-xs">
                    <span className="font-data font-bold">#{String(i + 1).padStart(2, '0')}</span>
                    <Badge variant="neutral" size="sm">
                      {scam.badge}
                    </Badge>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-white group-hover:text-[var(--color-brand-accent)] transition-colors">
                    {scam.name}
                  </h4>
                  <p className="mt-2 text-xs text-white/65 leading-relaxed line-clamp-3">
                    {scam.threat}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-white/40">
                    {scam.category}
                  </span>
                  <span className="text-[11px] text-[var(--color-brand-accent)] group-hover:underline flex items-center gap-1 font-semibold">
                    Inspect Anatomy <ArrowRight size={10} />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Scam Anatomy Modal / Drawer */}
      <AnimatePresence>
        {selectedTypology && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl w-full rounded-2xl glass-panel-dark border border-white/20 p-6 sm:p-8 space-y-5 relative shadow-2xl"
            >
              <button
                onClick={() => setSelectedTypology(null)}
                className="absolute top-5 right-5 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-accent)] font-data">
                  TYPOLOGY DEEP-DIVE
                </span>
                <Badge variant="neutral" size="sm">{selectedTypology.badge}</Badge>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white">{selectedTypology.name}</h3>

              <div className="space-y-3 text-xs leading-relaxed text-white/80">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="font-bold text-white block">Modus Operandi & Technical Vector</span>
                  <p className="text-white/70">{selectedTypology.mechanics}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="font-bold text-amber-300 block">Psychological Vulnerability Leveraged</span>
                  <p className="text-white/70">{selectedTypology.vulnerability}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-1">
                  <span className="font-bold text-rose-300 block">Golden-Hour Incident Response (0 - 2 Hours)</span>
                  <p className="text-white/85">{selectedTypology.goldenHour}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="tel:1930"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline"
                >
                  <Phone size={14} /> National Helpline: Dial 1930
                </a>
                <Button variant="accent" size="sm" onClick={() => setSelectedTypology(null)}>
                  Close Inspection
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CHAPTER 5: FINAL CITIZEN CALL TO ACTION
          ========================================================================= */}
      <section className="px-4 py-24 lg:py-32 bg-gradient-to-b from-[var(--color-brand-deep)]/40 to-transparent relative">
        <div className="mx-auto max-w-[1400px] text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-white/80 backdrop-blur-md">
            <ShieldWarning size={14} className="text-[var(--color-brand-accent)]" />
            <span>Protect yourself before entering your 4 or 6 digit UPI PIN</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Ready to evaluate your next transaction?
          </h2>

          <p className="text-sm sm:text-base text-white/75 max-w-[55ch] mx-auto leading-relaxed">
            Verify recipient history, detect hidden social engineering indicators, and inspect dialogue before authorizing payment.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/assess">
              <Button
                variant="accent"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className="shadow-[0_12px_24px_-8px_rgba(232,97,58,0.5)] glow-accent"
              >
                Launch Payment Assessment
              </Button>
            </Link>
            <Link to="/scan">
              <Button
                variant="secondary"
                size="lg"
                icon={ChatTeardropText}
                className="bg-white/10 text-white border-white/20 hover:bg-white/15"
              >
                Scan Dialogue Transcript
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <Footer />
    </div>
  )
}
