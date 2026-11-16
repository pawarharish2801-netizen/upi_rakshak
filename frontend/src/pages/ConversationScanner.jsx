import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatTeardropText,
  Sparkle,
  ArrowRight,
  WarningCircle,
  Lightning,
  CircleNotch,
  CheckCircle,
  Play,
  ArrowsClockwise,
  ShieldWarning,
  TrendUp,
  Cpu,
  Camera,
  UploadSimple,
  X,
  FileText,
  CurrencyInr,
  Phone,
  LinkSimple,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  scanConversation,
  scanProgressiveConversation,
  scanScreenshot,
  reanalyzeScreenshotText,
} from '../services/api'
import toast from 'react-hot-toast'

export default function ConversationScanner() {
  const navigate = useNavigate()
  const isReduced = useReducedMotion()
  const [activeTab, setActiveTab] = useState('direct') // 'direct' | 'progressive'
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanStage, setScanStage] = useState('')

  // Progressive state
  const [progSteps, setProgSteps] = useState([])
  const [currentProgIndex, setCurrentProgIndex] = useState(0)
  const [progressiveResult, setProgressiveResult] = useState(null)
  const [progLoading, setProgLoading] = useState(false)

  // Screenshot OCR state
  const fileInputRef = useRef(null)
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [screenshotConsent, setScreenshotConsent] = useState(true)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrStage, setOcrStage] = useState('')
  const [ocrResult, setOcrResult] = useState(null)
  const [editedOcrText, setEditedOcrText] = useState('')
  const [reanalyzing, setReanalyzing] = useState(false)
  const [correlateWithPayment, setCorrelateWithPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [recipientVpa, setRecipientVpa] = useState('')
  const [paymentPurpose, setPaymentPurpose] = useState('merchant_payment')

  // Real scam samples from Indian Cybercrime incident records (Multi-lingual & Relational)
  const directSamples = [
    {
      label: 'Digital Arrest / Cyber Police Coercion',
      text: 'This is Sub-Inspector Sharma from Delhi Cyber Police Headquarters. A package under your Aadhaar number containing contraband has been intercepted. You are ordered to remain on this Skype video call in digital arrest until your funds are transferred to the RBI verification clearing account immediately to avoid FIR.',
    },
    {
      label: 'Hinglish Bank KYC Suspension Script',
      text: 'Sir main SBI Mumbai head office vigilance department se bol raha hu. Aapka KYC expired ho gaya hai aur khata 2 ghante me block ho jayega. Turant ₹5,000 security deposit account verify karne ke liye transfer kijiye warna account freeze ho jayega.',
    },
    {
      label: 'Fake Refund QR Inversion Scam',
      text: 'Sir your Swiggy refund of ₹850 is approved. Please scan this payment reversal QR code and enter your 6-digit UPI PIN to receive the money directly into your bank account right now.',
    },
    {
      label: 'Educational Awareness (Safe / Negation)',
      text: 'RBI public awareness message: Beware of fraudulent callers pretending to be police or bank managers. Never share your OTP or enter your UPI PIN to receive funds. Banks never conduct video calls or digital arrests.',
    },
  ]

  // Pre-configured Progressive Multi-Turn Sequences
  const progressivePresets = [
    {
      title: 'Digital Arrest Coercion Escalation',
      category: 'Digital Arrest',
      turns: [
        { id: '1', sender: 'Caller', text: 'Hello, I am calling from TRAI and Mumbai Cyber Crime Branch.' },
        { id: '2', sender: 'Caller', text: 'Your Aadhaar card has been linked to 14 illegal bank accounts involved in international money laundering.' },
        { id: '3', sender: 'Caller', text: 'A non-bailable arrest warrant has been issued against you by the court. Stay on this video call, do not disconnect or alert your family.' },
        { id: '4', sender: 'Caller', text: 'To prove your innocence before formal arrest, transfer ₹48,000 to the Supreme Court verification escrow account immediately.' },
      ],
    },
    {
      title: 'Fake KYC & Remote Access Takeover',
      category: 'Screen Sharing Takeover',
      turns: [
        { id: '1', sender: 'Caller', text: 'Good morning, this is customer care support from your bank.' },
        { id: '2', sender: 'Caller', text: 'Your mobile banking access has been halted due to unverified KYC documents.' },
        { id: '3', sender: 'Caller', text: 'Please install AnyDesk remote support app from Play Store so our technical executive can assist you in verifying your certificate.' },
        { id: '4', sender: 'Caller', text: 'Now open your UPI app, approve the verification collect request, and type your UPI PIN to synchronize.' },
      ],
    },
  ]

  const [selectedPreset, setSelectedPreset] = useState(progressivePresets[0])

  const handleScan = async (e) => {
    e?.preventDefault()
    if (!text.trim() || text.trim().length < 10) {
      toast.error('Please enter at least 10 characters of message dialogue')
      return
    }

    try {
      setLoading(true)
      setScanStage('Extracting multi-lingual tokens (EN / Hinglish / Hindi)...')
      await new Promise((r) => setTimeout(r, isReduced ? 100 : 250))

      setScanStage('Evaluating 12 threat vectors & relational consequence patterns...')
      await new Promise((r) => setTimeout(r, isReduced ? 100 : 250))

      setScanStage('Computing context risk score...')
      const result = await scanConversation(text)

      toast.success('Conversation intelligence scan completed')
      navigate(`/results/${result.id}`)
    } catch (err) {
      toast.error(err.message || 'Scan failed')
    } finally {
      setLoading(false)
      setScanStage('')
    }
  }

  // Progressive simulation runner
  const runProgressiveTurn = async (turnIndex) => {
    const activeMessages = selectedPreset.turns.slice(0, turnIndex + 1)
    try {
      setProgLoading(true)
      const res = await scanProgressiveConversation(activeMessages)
      setProgressiveResult(res)
      setCurrentProgIndex(turnIndex)
      toast.success(`Evaluated Turn ${turnIndex + 1} of ${selectedPreset.turns.length}`)
    } catch (err) {
      toast.error(err.message || 'Progressive analysis failed')
    } finally {
      setProgLoading(false)
    }
  }

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset)
    setProgressiveResult(null)
    setCurrentProgIndex(0)
  }

  // Screenshot OCR handlers
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    processSelectedFile(file)
  }

  const processSelectedFile = (file) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file format. Please upload a PNG, JPEG, or WebP screenshot.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller screenshot.')
      return
    }

    setScreenshotFile(file)
    setOcrResult(null)
    setEditedOcrText('')

    const reader = new FileReader()
    reader.onload = (event) => {
      setScreenshotPreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleClearScreenshot = () => {
    setScreenshotFile(null)
    setScreenshotPreview(null)
    setOcrResult(null)
    setEditedOcrText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleScanScreenshot = async (e) => {
    e?.preventDefault()
    if (!screenshotFile) {
      toast.error('Please select or drop a screenshot first')
      return
    }
    if (!screenshotConsent) {
      toast.error('Please check the privacy consent checkbox to proceed')
      return
    }

    try {
      setOcrLoading(true)
      setOcrStage('Validating image integrity & format...')
      await new Promise((r) => setTimeout(r, isReduced ? 100 : 250))

      setOcrStage('Running in-memory OCR inference (RapidOCR ONNX)...')
      await new Promise((r) => setTimeout(r, isReduced ? 100 : 250))

      setOcrStage('Extracting fintech entities & relational scam triggers...')

      const options = {
        consent: screenshotConsent,
      }
      if (correlateWithPayment && paymentAmount) {
        options.amount = parseFloat(paymentAmount)
      }
      if (correlateWithPayment && recipientVpa) {
        options.recipient_vpa = recipientVpa
        options.payment_purpose = paymentPurpose
      }

      const res = await scanScreenshot(screenshotFile, options)
      setOcrResult(res)
      setEditedOcrText(res.extracted_text || '')

      if (res.entities?.currency_amounts?.length && !paymentAmount) {
        setPaymentAmount(res.entities.currency_amounts[0])
      }
      if (res.entities?.upi_ids?.length && !recipientVpa) {
        setRecipientVpa(res.entities.upi_ids[0])
      }

      toast.success('Screenshot analyzed successfully!')
    } catch (err) {
      toast.error(err.message || 'OCR processing failed')
    } finally {
      setOcrLoading(false)
      setOcrStage('')
    }
  }

  const handleReanalyzeEditedText = async () => {
    if (!editedOcrText.trim()) {
      toast.error('Extracted text cannot be empty')
      return
    }

    try {
      setReanalyzing(true)
      const payload = {
        text: editedOcrText,
      }
      if (correlateWithPayment && paymentAmount) {
        payload.amount = parseFloat(paymentAmount)
      }
      if (correlateWithPayment && recipientVpa) {
        payload.recipient_vpa = recipientVpa
        payload.payment_purpose = paymentPurpose
      }

      const res = await reanalyzeScreenshotText(payload)
      setOcrResult(res)
      toast.success('Re-analyzed edited text')
    } catch (err) {
      toast.error(err.message || 'Re-analysis failed')
    } finally {
      setReanalyzing(false)
    }
  }

  const generatePresetImage = (title, lines, bgColor = '#ffffff', textColor = '#111827') => {
    const canvas = document.createElement('canvas')
    canvas.width = 650
    canvas.height = 40 + lines.length * 36
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add subtle header bar
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, 36)
    ctx.fillStyle = '#6b7280'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText('UPI Rakshak Simulated Screenshot Capture: ' + title, 16, 23)

    ctx.fillStyle = textColor
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    lines.forEach((line, idx) => {
      ctx.fillText(line, 24, 70 + idx * 36)
    })

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${title.toLowerCase().replace(/\s+/g, '_')}.png`, {
          type: 'image/png',
        })
        processSelectedFile(file)
        toast.success(`Loaded preset screenshot: ${title}`)
      }
    }, 'image/png')
  }

  return (
    <PageShell
      title="Advanced Context Intelligence Console"
      subtitle="Screen deceptive SMS, WhatsApp chats, or progressive multi-turn voice scripts for psychological manipulation and relational coercion."
    >
      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-zinc-200 mb-6">
        <button
          onClick={() => setActiveTab('direct')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'direct'
              ? 'border-[var(--color-brand-deep)] text-[var(--color-brand-deep)]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Direct Message / Dialogue Scanner
        </button>
        <button
          onClick={() => setActiveTab('screenshot')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'screenshot'
              ? 'border-[var(--color-brand-deep)] text-[var(--color-brand-deep)]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Camera size={16} />
          Screenshot Scanner (OCR)
        </button>
        <button
          onClick={() => setActiveTab('progressive')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'progressive'
              ? 'border-[var(--color-brand-deep)] text-[var(--color-brand-deep)]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <TrendUp size={16} />
          Progressive Call Simulator (Multi-Turn)
        </button>
      </div>

      {activeTab === 'direct' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (8 cols): Input Console */}
          <div className="lg:col-span-8 space-y-6">
            <Card>
              <Card.Header>
                <Card.Title>Suspicious Message, Chat or Caller Script</Card.Title>
                <Card.Description>
                  Supports English, Hinglish transliterations, and Hindi Devanagari with relational threat extraction.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <form onSubmit={handleScan} className="space-y-4">
                  <div className="relative">
                    <textarea
                      rows={8}
                      disabled={loading}
                      placeholder="Paste incoming SMS, WhatsApp message, or call transcript here... (e.g. 'Sir aapka account block ho jayega turant ₹5,000 transfer kijiye' or 'SBI alert: enter UPI PIN to claim refund...')"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 p-4 text-sm text-[var(--color-content-primary)] placeholder-zinc-400 focus:border-[var(--color-brand-deep)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-deep)] font-sans leading-relaxed disabled:bg-zinc-50"
                    />
                    <div className="absolute right-4 bottom-4 text-xs text-zinc-400 font-data">
                      {text.length} characters
                    </div>
                  </div>

                  {/* Accessible Pipeline Progress Indicator */}
                  <AnimatePresence>
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0, y: isReduced ? 0 : -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: isReduced ? 0 : -6 }}
                        transition={{ duration: 0.15 }}
                        className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-blue-900 font-medium">
                          <span className="flex items-center gap-2">
                            <CircleNotch size={16} className="animate-spin text-blue-600" />
                            <span>{scanStage}</span>
                          </span>
                          <span className="font-data font-bold">Semantic NLP Active</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-blue-200 overflow-hidden">
                          <motion.div
                            className="h-full bg-[var(--color-brand-accent)] rounded-full"
                            initial={{ width: '15%' }}
                            animate={{ width: '90%' }}
                            transition={
                              isReduced
                                ? { duration: 0.2 }
                                : { duration: 0.8, ease: 'easeInOut' }
                            }
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-[var(--color-content-secondary)]">
                      Zero-knowledge screening: Text is parsed locally against linguistic coercion vectors.
                    </p>
                    <div className="flex items-center gap-2">
                      {text && !loading && (
                        <Button variant="ghost" size="sm" onClick={() => setText('')}>
                          Clear
                        </Button>
                      )}
                      <Button
                        type="submit"
                        variant="accent"
                        size="md"
                        loading={loading}
                        icon={Sparkle}
                        iconPosition="right"
                      >
                        Scan Dialogue
                      </Button>
                    </div>
                  </div>
                </form>
              </Card.Content>
            </Card>

            {/* Linguistic Capabilities Cards */}
            <div className="card-weightless rounded-2xl bg-white p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-content-tertiary)]">
                Linguistic & Relational Reasoning Architecture
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="rounded-xl bg-zinc-50/80 p-4 space-y-1.5 border border-zinc-100">
                  <span className="font-bold text-zinc-900 block">1. Multi-Lingual & Hinglish</span>
                  <p className="text-zinc-600 leading-relaxed">
                    Recognizes Hindi Devanagari and transliterated Hinglish idioms (e.g. <em>khata band, turant paise bhejo, CBI arrest</em>) used in Indian scam calls.
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50/80 p-4 space-y-1.5 border border-zinc-100">
                  <span className="font-bold text-zinc-900 block">2. Relational Synergies</span>
                  <p className="text-zinc-600 leading-relaxed">
                    Detects compound relationships: <strong>[Authority Threat] + [Urgency Deadline] + [Payment/PIN Demand]</strong>.
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50/80 p-4 space-y-1.5 border border-zinc-100">
                  <span className="font-bold text-zinc-900 block">3. False Positive Mitigation</span>
                  <p className="text-zinc-600 leading-relaxed">
                    Suppresses false alarms for educational cyber safety alerts, news quotes, and advisory discussions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Quick Test Samples */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <Card.Header>
                <Card.Title>Real-World Attack Scripts</Card.Title>
                <Card.Description>
                  Click any sample to populate and test the multi-lingual engine.
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3">
                {directSamples.map((sample, idx) => (
                  <div
                    key={idx}
                    onClick={() => !loading && setText(sample.text)}
                    className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 hover:bg-zinc-100/80 hover:border-zinc-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-content-primary)] group-hover:text-[var(--color-brand-deep)]">
                        {sample.label}
                      </span>
                      <Lightning size={15} className="text-[var(--color-brand-accent)]" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[var(--color-content-secondary)] line-clamp-2 leading-relaxed">
                      "{sample.text}"
                    </p>
                  </div>
                ))}
              </Card.Content>
            </Card>

            {/* Golden Rule Callout */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-2 text-xs text-amber-950">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <WarningCircle size={17} weight="fill" className="text-amber-600" />
                Sovereign UPI Security Standard
              </span>
              <p className="leading-relaxed">
                UPI PIN is strictly a <strong>debit authorization credential</strong>. Entering a PIN will always debit funds from your account, never deposit them.
              </p>
            </div>
          </div>
        </div>
      ) : activeTab === 'screenshot' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (8 cols): Upload, Verification & Editing */}
          <div className="lg:col-span-8 space-y-6">
            <Card>
              <Card.Header>
                <Card.Title>Screenshot Ingestion & OCR Pre-Processing</Card.Title>
                <Card.Description>
                  Upload WhatsApp chats, SMS alerts, fake collect requests, or QR payment screens. Processed strictly in-memory.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <form onSubmit={handleScanScreenshot} className="space-y-4">
                  {/* File Dropzone / Selector */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                      screenshotFile
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-zinc-300 hover:border-[var(--color-brand-deep)] bg-zinc-50/50 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {screenshotPreview ? (
                      <div className="space-y-3">
                        <div className="relative inline-block max-h-56 max-w-full overflow-hidden rounded-xl border border-zinc-200 shadow-sm bg-white">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot preview"
                            className="max-h-56 object-contain mx-auto"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleClearScreenshot()
                            }}
                            className="absolute top-2 right-2 rounded-full bg-black/70 hover:bg-black p-1 text-white shadow-md transition-all"
                            title="Remove image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-3 text-xs text-zinc-600 font-data">
                          <span className="font-medium text-zinc-900">{screenshotFile?.name}</span>
                          <span>•</span>
                          <span>{((screenshotFile?.size || 0) / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle size={14} /> Ready for OCR
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 space-y-2">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
                          <UploadSimple size={24} />
                        </div>
                        <div className="text-sm font-medium text-zinc-800">
                          Click to select or drag and drop screenshot
                        </div>
                        <p className="text-xs text-zinc-400">
                          Supports PNG, JPEG, and WebP (up to 5 MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Privacy Consent Checkbox */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="screenshotConsent"
                      checked={screenshotConsent}
                      onChange={(e) => setScreenshotConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]"
                    />
                    <label htmlFor="screenshotConsent" className="text-xs text-zinc-700 leading-relaxed cursor-pointer">
                      <strong>Zero-Storage Privacy Consent:</strong> I agree to process this screenshot strictly in-memory.
                      The image bytes and recognized personal credentials will <em>never</em> be permanently stored on server disks.
                    </label>
                  </div>

                  {/* Optional Payment Correlation Collapsible */}
                  <div className="rounded-xl border border-zinc-200 p-4 space-y-3 bg-white">
                    <button
                      type="button"
                      onClick={() => setCorrelateWithPayment(!correlateWithPayment)}
                      className="w-full flex items-center justify-between text-xs font-bold text-zinc-800 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <CurrencyInr size={16} className="text-[var(--color-brand-accent)]" />
                        Optional: Correlate with Proposed UPI Payment Details
                      </span>
                      <span className="text-xs text-zinc-400 font-normal">
                        {correlateWithPayment ? 'Collapse ▲' : 'Expand ▼'}
                      </span>
                    </button>

                    {correlateWithPayment && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-100">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                            Amount (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 4999"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 p-2 text-xs font-data focus:border-[var(--color-brand-deep)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                            Recipient UPI ID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. merchant@oksbi"
                            value={recipientVpa}
                            onChange={(e) => setRecipientVpa(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 p-2 text-xs font-data focus:border-[var(--color-brand-deep)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                            Payment Purpose
                          </label>
                          <select
                            value={paymentPurpose}
                            onChange={(e) => setPaymentPurpose(e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 p-2 text-xs focus:border-[var(--color-brand-deep)] focus:outline-none bg-white"
                          >
                            <option value="merchant_payment">Merchant Payment</option>
                            <option value="bill_payment">Bill Payment</option>
                            <option value="refund_claim">Refund Claim</option>
                            <option value="family_transfer">Family Transfer</option>
                            <option value="service_fee">Service Fee</option>
                          </select>
                        </div>
                        <p className="sm:col-span-3 text-[11px] text-zinc-400 italic">
                          If omitted, screenshot context is analyzed independently without synthetic ML speculation.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OCR Progress Indicator */}
                  <AnimatePresence>
                    {ocrLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: isReduced ? 0 : -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: isReduced ? 0 : -6 }}
                        className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-blue-900 font-medium">
                          <span className="flex items-center gap-2">
                            <CircleNotch size={16} className="animate-spin text-blue-600" />
                            <span>{ocrStage}</span>
                          </span>
                          <span className="font-data font-bold">RapidOCR Active</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-blue-200 overflow-hidden">
                          <motion.div
                            className="h-full bg-[var(--color-brand-accent)] rounded-full"
                            initial={{ width: '20%' }}
                            animate={{ width: '92%' }}
                            transition={isReduced ? { duration: 0.2 } : { duration: 0.9, ease: 'easeInOut' }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit / Extract Button */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-zinc-400">
                      ONNX Runtime CPU Inference • Multi-lingual & Hinglish
                    </p>
                    <Button
                      type="submit"
                      variant="accent"
                      size="md"
                      loading={ocrLoading}
                      disabled={!screenshotFile || !screenshotConsent}
                      icon={Camera}
                      iconPosition="right"
                    >
                      Extract & Scan Screenshot
                    </Button>
                  </div>
                </form>
              </Card.Content>
            </Card>

            {/* OCR Extracted Text & Interactive Entities */}
            {ocrResult && (
              <Card>
                <Card.Header>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Card.Title>Recognized Text & Extracted Entities</Card.Title>
                      <Card.Description>
                        Review and edit recognized message content. Click entities to correlate with payment.
                      </Card.Description>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-zinc-100 font-medium text-zinc-700">
                        {ocrResult.ocr_engine}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-data font-bold">
                        {(ocrResult.average_confidence * 100).toFixed(1)}% Conf
                      </span>
                      <span className={`px-2.5 py-1 rounded-full font-data ${ocrResult.is_blurry ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
                        {ocrResult.is_blurry ? '⚠️ Blurry' : '✓ Sharp'}
                      </span>
                    </div>
                  </div>
                </Card.Header>
                <Card.Content className="space-y-4">
                  {/* Warning Notes if any */}
                  {ocrResult.warning_notes?.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
                      {ocrResult.warning_notes.map((w, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <WarningCircle size={15} className="text-amber-600 flex-shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Entity Chips */}
                  <div className="rounded-xl bg-zinc-50 p-3.5 border border-zinc-200/80 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Parsed Fintech Entities (Click to apply)
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {ocrResult.entities?.upi_ids?.map((upi, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setRecipientVpa(upi)
                            setCorrelateWithPayment(true)
                            toast.success(`Set recipient: ${upi}`)
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-data font-bold hover:bg-purple-100 transition-all flex items-center gap-1"
                        >
                          <span>@ {upi}</span>
                        </button>
                      ))}
                      {ocrResult.entities?.currency_amounts?.map((amt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setPaymentAmount(amt)
                            setCorrelateWithPayment(true)
                            toast.success(`Set amount: ₹${amt}`)
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-data font-bold hover:bg-emerald-100 transition-all flex items-center gap-1"
                        >
                          <span>₹ {amt.toLocaleString('en-IN')}</span>
                        </button>
                      ))}
                      {ocrResult.entities?.phone_numbers?.map((ph, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-data flex items-center gap-1">
                          <Phone size={13} /> {ph}
                        </span>
                      ))}
                      {ocrResult.entities?.urls?.map((url, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-data flex items-center gap-1 max-w-xs truncate" title={url}>
                          <LinkSimple size={13} /> {url}
                        </span>
                      ))}
                      {ocrResult.entities?.upi_ids?.length === 0 &&
                        ocrResult.entities?.currency_amounts?.length === 0 &&
                        ocrResult.entities?.phone_numbers?.length === 0 && (
                          <span className="text-zinc-400 italic text-xs">No explicit VPA or numbers found.</span>
                        )}
                    </div>
                  </div>

                  {/* Editable OCR text */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
                      <span>Extracted Screenshot Content (Editable)</span>
                      <span className="font-normal font-data text-zinc-400">{editedOcrText.length} chars</span>
                    </label>
                    <textarea
                      rows={5}
                      value={editedOcrText}
                      onChange={(e) => setEditedOcrText(e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 p-3 text-xs font-mono leading-relaxed focus:border-[var(--color-brand-deep)] focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={reanalyzing}
                        onClick={handleReanalyzeEditedText}
                        icon={ArrowsClockwise}
                      >
                        Re-analyze Edited Text
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>

          {/* Right Column (4 cols): Risk Assessment Verdict or Test Presets */}
          <div className="lg:col-span-4 space-y-6">
            {ocrResult ? (
              <Card>
                <Card.Header>
                  <Card.Title>Screenshot Risk Verdict</Card.Title>
                  <Card.Description>
                    Context intelligence + decision triage output.
                  </Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  {/* Risk Score Pill */}
                  <div className={`rounded-2xl p-4 text-center border ${
                    ocrResult.context_analysis?.context_risk_score >= 65
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : ocrResult.context_analysis?.context_risk_score >= 35
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}>
                    <span className="text-[11px] uppercase tracking-wider font-bold block opacity-70">
                      Context Threat Score
                    </span>
                    <div className="text-3xl font-data font-black my-1">
                      {ocrResult.context_analysis?.context_risk_score} / 100
                    </div>
                    <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-white/80 shadow-xs">
                      {ocrResult.context_analysis?.scam_category?.replace(/_/g, ' ') || 'Benign Dialogue'}
                    </span>
                  </div>

                  {/* Educational Flag if True */}
                  {ocrResult.context_analysis?.is_educational_or_benign && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                      <span>
                        <strong>Educational / Benign Awareness:</strong> Warning keywords recognized in safe advisory context. False alarm suppressed.
                      </span>
                    </div>
                  )}

                  {/* Signals List */}
                  {ocrResult.context_analysis?.signals?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-zinc-700 block">
                        Detected Psychological & Fraud Triggers:
                      </span>
                      <div className="space-y-1.5">
                        {ocrResult.context_analysis.signals.map((sig, idx) => (
                          <div key={idx} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs">
                            <div className="flex items-center justify-between font-bold text-zinc-900">
                              <span>{sig.label}</span>
                              <span className="font-data text-rose-600">+{sig.weight}</span>
                            </div>
                            {sig.evidence && (
                              <p className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">
                                "{sig.evidence}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relational Consequence */}
                  {ocrResult.context_analysis?.relationship_detected && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <Lightning size={14} className="text-rose-600" /> Relational Coercion Detected:
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {ocrResult.context_analysis.relationship_detected}
                      </p>
                    </div>
                  )}

                  {/* Unified Assessment if payment details provided */}
                  {ocrResult.transaction_ml_assessed && ocrResult.unified_assessment && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-indigo-950">
                        <span>Unified Hybrid ML Verdict</span>
                        <Badge variant={ocrResult.unified_assessment.final_risk_level === 'CRITICAL' ? 'critical' : 'warning'}>
                          {ocrResult.unified_assessment.final_risk_level}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-data">
                        <div>
                          <span className="text-zinc-500 block">ML Probability</span>
                          <span className="font-bold text-zinc-900">
                            {(ocrResult.unified_assessment.ml_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Correlation</span>
                          <span className="font-bold text-zinc-900">
                            {ocrResult.unified_assessment.correlation?.relevance_category || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-indigo-900 font-medium">
                        Action: {ocrResult.unified_assessment.recommended_action.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}

                  {/* Action Button: Send to Assess */}
                  <Button
                    variant="accent"
                    size="md"
                    className="w-full"
                    icon={ArrowRight}
                    iconPosition="right"
                    onClick={() => {
                      const amountToPass = paymentAmount || ocrResult.entities?.currency_amounts?.[0] || ''
                      const recipientToPass = recipientVpa || ocrResult.entities?.upi_ids?.[0] || ''
                      navigate('/assess', {
                        state: {
                          amount: amountToPass,
                          recipientId: recipientToPass,
                          conversationNotes: editedOcrText || ocrResult.extracted_text,
                        },
                      })
                    }}
                  >
                    Transfer to Unified Payment Screener
                  </Button>
                </Card.Content>
              </Card>
            ) : null}

            {/* Test Screenshot Presets */}
            <Card>
              <Card.Header>
                <Card.Title>Simulated Screenshot Presets</Card.Title>
                <Card.Description>
                  Generate sample screenshot images directly in-browser to test OCR accuracy without uploading personal files.
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3">
                <div
                  onClick={() =>
                    generatePresetImage('WhatsApp Electricity Bill Scam', [
                      'Electricity Board Alert',
                      'Your power will be disconnected at 9:30 PM tonight',
                      'due to unpaid electricity bill of Rs 4999.',
                      'Pay immediately via UPI: bijli-bill@oksbi',
                      'Helpline: +91 9876543210',
                      'Or download bill app: https://power-discom.xyz/bill.apk',
                    ])
                  }
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 hover:bg-zinc-100 transition-all cursor-pointer group text-xs"
                >
                  <span className="font-bold text-zinc-900 group-hover:text-[var(--color-brand-deep)] block">
                    ⚡ WhatsApp Electricity Disconnection
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Bill extortion, fake helpline phone, and malicious APK URL.
                  </p>
                </div>

                <div
                  onClick={() =>
                    generatePresetImage('Hinglish SBI KYC Account Freeze', [
                      'SBI Customer Security Alert',
                      'Aapka SBI khata suspend hone wala hai.',
                      'KYC update karne ke liye turant Rs 5000 bhejo.',
                      'Pay to sbi-verify@upi varna account permanently band hoga.',
                      'Helpline: 1800-11-2211',
                    ])
                  }
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 hover:bg-zinc-100 transition-all cursor-pointer group text-xs"
                >
                  <span className="font-bold text-zinc-900 group-hover:text-[var(--color-brand-deep)] block">
                    🏦 Hinglish SBI KYC Account Freeze
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Hindi/Hinglish suspension threat with urgent deposit demand.
                  </p>
                </div>

                <div
                  onClick={() =>
                    generatePresetImage('Legitimate HDFC Bank Credit Alert', [
                      'HDFC Bank Alert: Your A/C XX4102 has been credited',
                      'with INR 15000.00 on 10/11/2026 by NEFT.',
                      'Available balance is INR 48250.75.',
                      'Never share your UPI PIN or OTP with anyone.',
                      'Helpline: 18002664332',
                    ])
                  }
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 hover:bg-zinc-100 transition-all cursor-pointer group text-xs"
                >
                  <span className="font-bold text-zinc-900 group-hover:text-[var(--color-brand-deep)] block">
                    ✅ Legitimate HDFC Bank Credit Alert
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Real banking SMS with legitimate balance and toll-free helpline.
                  </p>
                </div>

                <div
                  onClick={() =>
                    generatePresetImage('RBI Caution Cyber Awareness Infographic', [
                      'RBI CAUTION NOTICE: BEWARE OF FRAUD',
                      'RBI says: Never enter your UPI PIN to receive money.',
                      'Scammers send fake QR codes asking to scan to get cashback.',
                      'Stay alert and report fraud to cybercrime.gov.in',
                    ])
                  }
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 hover:bg-zinc-100 transition-all cursor-pointer group text-xs"
                >
                  <span className="font-bold text-zinc-900 group-hover:text-[var(--color-brand-deep)] block">
                    🛡️ RBI Public Cyber Awareness Notice
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Educational advisory: tests false-positive suppression logic.
                  </p>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      ) : (
        /* Progressive Simulator View (Inspired by UPI Intent Guard) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <Card.Header>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Card.Title>Progressive Multi-Turn Dialogue Simulator</Card.Title>
                    <Card.Description>
                      Observe how scam signals accumulate and escalate risk message-by-message during a phone call or chat.
                    </Card.Description>
                  </div>
                  <div className="flex gap-2">
                    {progressivePresets.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePresetChange(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          selectedPreset.title === p.title
                            ? 'bg-[var(--color-brand-deep)] text-white border-[var(--color-brand-deep)]'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {p.category}
                      </button>
                    ))}
                  </div>
                </div>
              </Card.Header>
              <Card.Content className="space-y-4">
                {/* Simulated Conversation Feed */}
                <div className="space-y-3 bg-zinc-50/80 rounded-2xl p-4 border border-zinc-200/80 max-h-[380px] overflow-y-auto">
                  {selectedPreset.turns.map((turn, idx) => {
                    const isEvaluated = idx <= currentProgIndex && progressiveResult !== null
                    return (
                      <div
                        key={turn.id}
                        className={`rounded-xl p-3.5 transition-all text-xs ${
                          isEvaluated
                            ? 'bg-white border border-rose-200 shadow-sm'
                            : 'bg-zinc-100/50 border border-transparent opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-zinc-100">
                          <span className="font-bold text-[var(--color-content-primary)] flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                            Turn {idx + 1} ({turn.sender})
                          </span>
                          {isEvaluated && progressiveResult?.steps[idx] && (
                            <span className="font-data font-bold text-rose-600 text-[11px]">
                              Risk: {progressiveResult.steps[idx].step_risk_score}/100
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-800 leading-relaxed font-sans mt-1">"{turn.text}"</p>
                      </div>
                    )
                  })}
                </div>

                {/* Turn Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Play}
                      loading={progLoading}
                      onClick={() => runProgressiveTurn(Math.min(currentProgIndex + 1, selectedPreset.turns.length - 1))}
                      disabled={progressiveResult && currentProgIndex >= selectedPreset.turns.length - 1}
                    >
                      Advance Next Turn ({currentProgIndex + 1}/{selectedPreset.turns.length})
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => runProgressiveTurn(selectedPreset.turns.length - 1)}
                      loading={progLoading}
                    >
                      Run Full Sequence
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ArrowsClockwise}
                      onClick={() => {
                        setProgressiveResult(null)
                        setCurrentProgIndex(0)
                      }}
                    >
                      Reset
                    </Button>
                  </div>

                  {progressiveResult && (
                    <Button
                      variant="accent"
                      size="sm"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={() => {
                        const fullText = selectedPreset.turns.slice(0, currentProgIndex + 1).map((t) => t.text).join(' \n')
                        navigate('/assess', { state: { conversationNotes: fullText } })
                      }}
                    >
                      Test Intent with Payment
                    </Button>
                  )}
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Right Column (5 cols): Live Escalation Telemetry */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <Card.Header>
                <Card.Title>Live Escalation Telemetry</Card.Title>
                <Card.Description>
                  Cumulative threat trajectory computed at each dialogue step.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                {progressiveResult ? (
                  <div className="space-y-5">
                    {/* Trajectory Header */}
                    <div className="rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 p-4 border border-rose-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-700">Trajectory Status:</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                          <TrendUp size={14} weight="bold" /> {progressiveResult.threat_trajectory}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Current Risk Score</span>
                          <span className="text-2xl font-extrabold font-data text-rose-900">
                            {progressiveResult.current_risk_score} / 100
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Current Risk Tier</span>
                          <span className="text-sm font-extrabold text-rose-700 font-data">
                            {progressiveResult.current_risk_level} TIER
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Cumulative Signals */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                        Detected Psychological Tactics:
                      </span>
                      <div className="space-y-1.5">
                        {progressiveResult.final_analysis.signals.map((sig, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-2.5 rounded-lg border border-rose-200/80 bg-rose-50/50 text-xs text-rose-950"
                          >
                            <ShieldWarning size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[11px]">{sig.label}</span>
                              <p className="text-[10px] text-rose-800 line-clamp-1 italic mt-0.5">
                                "{sig.evidence}"
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Relational Summary */}
                    {progressiveResult.final_analysis.relationship_detected && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950 space-y-1">
                        <span className="font-bold block text-[11px] text-blue-900">Compound Relational Threat:</span>
                        <p className="text-[11px] text-blue-800 leading-relaxed">
                          {progressiveResult.final_analysis.relationship_detected}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
                    <ChatTeardropText size={32} className="mx-auto text-zinc-300" />
                    <p>Click "Advance Next Turn" or "Run Full Sequence" to start progressive conversational evaluation.</p>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  )
}
