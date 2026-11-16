export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  ASSESS: '/assess',
  SCAN_CONVERSATION: '/scan',
  RESULTS: '/results/:id',
  HISTORY: '/history',
  ANALYTICS: '/analytics',
  AWARENESS: '/awareness',
  AWARENESS_DETAIL: '/awareness/:slug',
  REPORT: '/report',
  PROFILE: '/profile',
}

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'SquaresFour' },
  { label: 'Assess Payment', path: '/assess', icon: 'ShieldCheck' },
  { label: 'Scan Conversation', path: '/scan', icon: 'ChatTeardrop' },
  { label: 'History', path: '/history', icon: 'ClockCounterClockwise' },
  { label: 'Analytics', path: '/analytics', icon: 'ChartLine' },
  { label: 'Scam Awareness', path: '/awareness', icon: 'BookOpen' },
  { label: 'Report Scam', path: '/report', icon: 'Flag' },
]

export const RISK_LEVELS = {
  LOW: { label: 'Low Risk', color: 'var(--color-risk-low)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  MEDIUM: { label: 'Medium Risk', color: 'var(--color-risk-medium)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  HIGH: { label: 'High Risk', color: 'var(--color-risk-high)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  CRITICAL: { label: 'Critical Risk', color: 'var(--color-risk-critical)', bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },
}

export const FRAUD_CATEGORIES = [
  { key: 'Fake_Refund', label: 'Fake Refund', description: 'Scammer claims to process a refund but tricks victim into sending money.' },
  { key: 'Fake_Customer_Care', label: 'Fake Customer Care', description: 'Impersonating bank or company support to extract payment details.' },
  { key: 'QR_Code_Scam', label: 'QR Code Scam', description: 'Malicious QR codes that trigger payments to scammer accounts.' },
  { key: 'Collect_Request_Scam', label: 'Collect Request Scam', description: 'Unsolicited UPI collect requests disguised as refunds.' },
  { key: 'Fake_Job_Offer', label: 'Fake Job Offer', description: 'Demands registration fees for non-existent job opportunities.' },
  { key: 'Investment_Scam', label: 'Investment Scam', description: 'Promises high returns on fake investment schemes.' },
  { key: 'Lottery_Cashback_Scam', label: 'Lottery / Cashback Scam', description: 'Claims of lottery winnings or cashback requiring payment to claim.' },
  { key: 'Impersonation_Scam', label: 'Impersonation Scam', description: 'Pretending to be a family member, friend, or boss to request urgent money.' },
  { key: 'Digital_Arrest', label: 'Digital Arrest', description: 'Fake police or government threats demanding immediate payment.' },
  { key: 'Screen_Sharing_Scam', label: 'Screen Sharing Scam', description: 'Convincing victims to install remote access apps to steal credentials.' },
]

export const PAYMENT_CHANNELS = [
  'QR_Scan', 'UPI_ID_Manual', 'Collect_Request', 'Contact_Pick', 'Payment_Link', 'Merchant_Intent',
]

export const PAYMENT_PURPOSES = [
  'grocery', 'merchant_payment', 'family_transfer', 'shopping', 'bill_payment',
  'food_delivery', 'p2p_friends', 'rent', 'education_fees', 'investment',
  'marketplace_sale', 'other', 'refund_claim', 'service_fee', 'registration_fee',
  'prize_claim', 'fine_or_penalty', 'kyc_update',
]

export const VERIFICATION_STATUSES = [
  'Verified_Merchant', 'Saved_Contact', 'Bank_Name_Verified', 'Name_Mismatch', 'Unverified',
]

export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || '/api'
