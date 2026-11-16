import axios from 'axios'
import { API_BASE } from '../constants'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor for auth
api.interceptors.request.use(config => {
  const token = localStorage.getItem('upi_rakshak_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.detail || error.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

/* ============================================
   Risk Assessment API
   ============================================ */

export async function assessPaymentRisk(paymentData) {
  try {
    const result = await api.post('/assess/payment', paymentData)
    saveAssessment(result)
    return result
  } catch {
    // Fallback to local computation when backend is unavailable
    const fallback = computeLocalRiskAssessment(paymentData)
    saveAssessment(fallback)
    return fallback
  }
}

export async function predictFraudML(paymentData) {
  return await api.post('/ml/predict', paymentData)
}

export async function getMLStatus() {
  return await api.get('/ml/status')
}

export async function scanProgressiveConversation(messages) {
  return await api.post('/conversation/progressive', { messages })
}

export async function assessUnifiedPayment(payload) {
  const result = await api.post('/assess/unified', payload)
  saveAssessment(result)
  return result
}

export async function getJevStatus() {
  return await api.get('/jev/status')
}

export async function scanConversation(conversationText) {
  try {
    return await api.post('/assess/conversation', { text: conversationText })
  } catch {
    return computeLocalConversationScan(conversationText)
  }
}

export async function scanScreenshot(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_consent', options.consent !== false ? 'true' : 'false')
  if (options.amount) formData.append('amount', options.amount)
  if (options.recipient_vpa) formData.append('recipient_vpa', options.recipient_vpa)
  if (options.payment_purpose) formData.append('payment_purpose', options.payment_purpose)

  const token = localStorage.getItem('upi_rakshak_token')
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await axios.post(`${API_BASE}/scan/screenshot`, formData, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export async function reanalyzeScreenshotText(payload) {
  return await api.post('/scan/screenshot-text', payload)
}

export async function getAssessmentById(id) {
  try {
    return await api.get(`/assessments/${id}`)
  } catch {
    return getStoredAssessment(id)
  }
}

/* ============================================
   Transaction History API
   ============================================ */

export async function getTransactionHistory(params) {
  try {
    return await api.get('/transactions', { params })
  } catch {
    return getStoredTransactions(params)
  }
}

/* ============================================
   Analytics API
   ============================================ */

export async function getAnalytics(timeRange = '30d') {
  try {
    return await api.get('/analytics', { params: { range: timeRange } })
  } catch {
    return getStoredAnalytics()
  }
}

/* ============================================
   Scam Reporting API
   ============================================ */

export async function submitScamReport(reportData) {
  try {
    return await api.post('/reports', reportData)
  } catch {
    return saveReportLocally(reportData)
  }
}

/* ============================================
   Auth API
   ============================================ */

export async function loginUser(email, password) {
  return api.post('/auth/login', { email, password })
}

export async function registerUser(name, email, password) {
  return api.post('/auth/register', { name, email, password })
}

/* ============================================
   Local Computation Fallbacks
   These run when the backend is unavailable.
   Clearly labelled as demonstration results.
   ============================================ */

const ASSESSMENTS_KEY = 'upi_rakshak_assessments'

function getStoredAssessments() {
  try {
    return JSON.parse(localStorage.getItem(ASSESSMENTS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveAssessment(assessment) {
  const all = getStoredAssessments()
  all.unshift(assessment)
  localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(all.slice(0, 200)))
}

function getStoredAssessment(id) {
  return getStoredAssessments().find(a => a.id === id) || null
}

function getStoredTransactions(params = {}) {
  let all = getStoredAssessments()
  if (params.riskLevel) all = all.filter(a => a.riskLevel === params.riskLevel)
  if (params.search) {
    const q = params.search.toLowerCase()
    all = all.filter(a =>
      a.recipientId?.toLowerCase().includes(q) ||
      a.paymentPurpose?.toLowerCase().includes(q) ||
      a.fraudCategory?.toLowerCase().includes(q)
    )
  }
  return {
    transactions: all,
    total: all.length,
    page: params.page || 1,
    perPage: params.perPage || 20,
  }
}

function getStoredAnalytics() {
  const all = getStoredAssessments()
  const total = all.length
  const byRisk = { Low: 0, Medium: 0, High: 0, Critical: 0 }
  const byCategory = {}
  all.forEach(a => {
    byRisk[a.riskLevel] = (byRisk[a.riskLevel] || 0) + 1
    if (a.fraudCategory && a.fraudCategory !== 'Legitimate') {
      byCategory[a.fraudCategory] = (byCategory[a.fraudCategory] || 0) + 1
    }
  })
  return {
    totalAssessments: total,
    riskDistribution: byRisk,
    categoryDistribution: byCategory,
    recentTrend: all.slice(0, 30).map((a, i) => ({ day: i + 1, score: a.riskScore || 0 })),
    isDemo: total === 0,
  }
}

function saveReportLocally(reportData) {
  const reports = JSON.parse(localStorage.getItem('upi_rakshak_reports') || '[]')
  const report = { ...reportData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'submitted_locally' }
  reports.unshift(report)
  localStorage.setItem('upi_rakshak_reports', JSON.stringify(reports.slice(0, 100)))
  return report
}

/* ============================================
   Local Risk Assessment Engine
   Uses rule-based scoring when ML backend is
   unavailable. Results are clearly marked as
   demonstration/rule-based.
   ============================================ */

function computeLocalRiskAssessment(data) {
  let score = 0
  const warnings = []
  const indicators = {}

  // Amount-based signals
  const amount = parseFloat(data.amount) || 0
  if (amount > 50000) { score += 15; warnings.push('Transaction amount exceeds Rs 50,000') }
  else if (amount > 20000) { score += 8; warnings.push('High transaction amount') }
  else if (amount > 10000) { score += 4 }

  // Recipient signals
  if (data.isFirstTimeRecipient) { score += 12; warnings.push('First-time recipient — no prior transaction history') }
  if (data.recipientVerification === 'Unverified') { score += 15; warnings.push('Recipient identity is unverified') }
  if (data.recipientVerification === 'Name_Mismatch') { score += 20; warnings.push('Recipient name does not match account') }

  // Channel signals
  if (data.paymentChannel === 'Collect_Request') { score += 8; indicators.collectRequest = true }
  if (data.paymentChannel === 'Payment_Link') { score += 6; indicators.paymentLink = true }

  // Social engineering indicators
  const seIndicators = [
    ['urgency', 'Transaction marked as urgent — pressure tactic detected', 10],
    ['refundClaim', 'Framed as refund or reward claim', 14],
    ['impersonation', 'Potential impersonation detected', 16],
    ['pinToReceive', 'UPI PIN requested to receive money — definite fraud indicator', 25],
    ['suspiciousLink', 'Suspicious link detected', 12],
    ['screenSharing', 'Screen sharing or remote access requested', 18],
    ['callerAuthority', 'Caller claims government or bank authority', 20],
    ['unsolicitedContact', 'Unsolicited contact initiated the transaction', 8],
    ['secrecyRequested', 'Secrecy requested — told not to inform others', 15],
    ['emotionalPressure', 'Emotional pressure or threats detected', 14],
    ['callInProgress', 'ACTIVE CALL COERCION: Live call in progress during transaction — high probability of social engineering or digital arrest trick', 20],
    ['rapidMultiplePayments', 'RAPID MULTI-PAYMENT: Consecutive or split payments in a single session — high risk of rapid account draining', 22],
  ]

  seIndicators.forEach(([key, warning, weight]) => {
    if (data[key]) {
      score += weight
      warnings.push(warning)
      indicators[key] = true
    }
  })

  // Compound Synergy: Active call + Rapid multiple payments
  if (data.callInProgress && data.rapidMultiplePayments) {
    score = Math.max(82, score + 15)
    warnings.unshift('COMPOUND EXTREME RISK: Concurrent active call with rapid consecutive payments is primary signature of active coercion (Digital Arrest / Task scam).')
  }

  // QR-specific
  if (data.paymentChannel === 'QR_Scan' && data.qrMismatch) {
    score += 18
    warnings.push('QR code payee does not match claimed merchant')
    indicators.qrMismatch = true
  }

  // Collect request unsolicited
  if (data.paymentChannel === 'Collect_Request' && data.collectUnsolicited) {
    score += 15
    warnings.push('Unsolicited collect request — you did not initiate this')
    indicators.collectUnsolicited = true
  }

  // Night transaction
  const hour = new Date().getHours()
  if (hour >= 23 || hour < 6) { score += 4; indicators.nightTransaction = true }

  // Normalize to 0-100
  score = Math.min(100, Math.max(0, score))

  let riskLevel = 'Low'
  if (score >= 70) riskLevel = 'Critical'
  else if (score >= 45) riskLevel = 'High'
  else if (score >= 25) riskLevel = 'Medium'

  // Determine likely fraud category
  let fraudCategory = 'Legitimate'
  if (score >= 25) {
    if (indicators.pinToReceive) fraudCategory = 'Fake_Refund'
    else if (indicators.callerAuthority && indicators.secrecyRequested) fraudCategory = 'Digital_Arrest'
    else if (indicators.screenSharing) fraudCategory = 'Screen_Sharing_Scam'
    else if (indicators.impersonation && indicators.emotionalPressure) fraudCategory = 'Impersonation_Scam'
    else if (indicators.callerAuthority) fraudCategory = 'Fake_Customer_Care'
    else if (indicators.refundClaim) fraudCategory = 'Lottery_Cashback_Scam'
    else if (indicators.qrMismatch) fraudCategory = 'QR_Code_Scam'
    else if (indicators.collectUnsolicited) fraudCategory = 'Collect_Request_Scam'
    else if (data.paymentPurpose === 'investment') fraudCategory = 'Investment_Scam'
    else if (data.paymentPurpose === 'registration_fee') fraudCategory = 'Fake_Job_Offer'
    else fraudCategory = 'Suspicious_Activity'
  }

  // Generate recommendations
  const recommendations = []
  if (data.callInProgress) {
    recommendations.push('DISCONNECT THE PHONE CALL NOW. Legitimate banks and police never require you to stay on call while entering your UPI PIN.')
  }
  if (data.rapidMultiplePayments) {
    recommendations.push('HALT REPEATED TRANSFERS IMMEDIATELY. Check your account statement before sending any further amount.')
  }
  if (riskLevel === 'Critical') {
    recommendations.push('Do NOT proceed with this transaction')
    recommendations.push('Block this recipient immediately')
    recommendations.push('Report to your bank and cybercrime.gov.in (Helpline 1930)')
  } else if (riskLevel === 'High') {
    recommendations.push('Verify the recipient through an independent channel before proceeding')
    recommendations.push('Never share UPI PIN, OTP, or screen access')
    recommendations.push('Contact your bank if you suspect fraud')
  } else if (riskLevel === 'Medium') {
    recommendations.push('Double-check recipient details before confirming')
    recommendations.push('Verify any refund or reward claims independently')
  } else {
    recommendations.push('Transaction appears safe based on available signals')
  }

  const assessment = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    riskScore: score,
    riskLevel,
    fraudCategory,
    warnings,
    indicators,
    recommendations,
    paymentDetails: {
      amount,
      recipientId: data.recipientId || '',
      paymentPurpose: data.paymentPurpose || '',
      paymentChannel: data.paymentChannel || '',
    },
    source: 'rule_based_local',
    disclaimer: 'This assessment was generated using a local rule-based engine. Connect the ML backend for model-based predictions.',
  }

  saveAssessment(assessment)
  return assessment
}

function computeLocalConversationScan(text) {
  if (!text || text.trim().length < 10) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      riskScore: 0,
      riskLevel: 'Low',
      warnings: [],
      detectedPatterns: [],
      recommendations: ['No suspicious patterns detected in the provided text.'],
      source: 'rule_based_local',
      disclaimer: 'This scan was performed using keyword matching. Connect the NLP backend for deep analysis.',
    }
  }

  const lower = text.toLowerCase()
  let score = 0
  const patterns = []

  const keywords = [
    { pattern: /\bupi\s*pin\b/i, label: 'UPI PIN mention', weight: 20 },
    { pattern: /\b(otp|one.?time.?password)\b/i, label: 'OTP reference', weight: 18 },
    { pattern: /\brefund\b/i, label: 'Refund claim', weight: 12 },
    { pattern: /\b(police|cbi|rbi|trai|customs|income.?tax)\b/i, label: 'Authority impersonation', weight: 22 },
    { pattern: /\b(arrested?|warrant|legal.?action|case.?filed)\b/i, label: 'Legal threat', weight: 20 },
    { pattern: /\b(screen.?shar|anydesk|teamviewer|quick.?support)\b/i, label: 'Screen sharing app', weight: 25 },
    { pattern: /\b(don.?t\s+tell|keep.?secret|do\s*not\s*inform)\b/i, label: 'Secrecy demand', weight: 18 },
    { pattern: /\b(urgent|immediately|right\s*now|within\s*\d+\s*(hour|minute|min))\b/i, label: 'Urgency pressure', weight: 14 },
    { pattern: /\b(cashback|lottery|prize|winner|congratulat)\b/i, label: 'Prize or lottery claim', weight: 15 },
    { pattern: /\b(kyc|verify.?account|account.?block|suspend)\b/i, label: 'KYC or account scare', weight: 16 },
    { pattern: /\b(investment|guaranteed.?return|double.?money|high.?return)\b/i, label: 'Investment lure', weight: 14 },
    { pattern: /\b(job|hiring|registration.?fee|security.?deposit)\b/i, label: 'Job scam indicator', weight: 10 },
    { pattern: /\b(whatsapp|telegram)\b/i, label: 'Messaging app reference', weight: 4 },
    { pattern: /\b(click|link|http|www\.)\b/i, label: 'External link reference', weight: 8 },
    { pattern: /\b(money.?launder|hawala|black.?money)\b/i, label: 'Money laundering reference', weight: 22 },
  ]

  keywords.forEach(({ pattern, label, weight }) => {
    if (pattern.test(text)) {
      score += weight
      patterns.push(label)
    }
  })

  score = Math.min(100, Math.max(0, score))
  let riskLevel = 'Low'
  if (score >= 70) riskLevel = 'Critical'
  else if (score >= 45) riskLevel = 'High'
  else if (score >= 25) riskLevel = 'Medium'

  const warnings = patterns.map(p => `Detected: ${p}`)
  const recommendations = []
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    recommendations.push('This conversation contains strong fraud indicators')
    recommendations.push('Do not share any personal or financial information')
    recommendations.push('Block and report this contact')
    recommendations.push('File a report at cybercrime.gov.in if money was lost')
  } else if (riskLevel === 'Medium') {
    recommendations.push('Exercise caution with this contact')
    recommendations.push('Verify claims independently before acting')
  } else {
    recommendations.push('No strong fraud indicators found, but always stay vigilant')
  }

  const assessment = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    riskScore: score,
    riskLevel,
    warnings,
    detectedPatterns: patterns,
    recommendations,
    conversationExcerpt: text.slice(0, 200),
    source: 'rule_based_local',
    disclaimer: 'This scan used keyword-based pattern matching. Connect the NLP backend for intent analysis and social engineering detection.',
  }

  saveAssessment(assessment)
  return assessment
}

export default api
