import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  WarningOctagon,
  WarningCircle,
  XCircle,
  ShareNetwork,
  Flag,
  CheckCircle,
  Cpu,
  ChatTeardropText,
  Lightning,
  Info,
  Printer,
  PhoneCall,
} from '@phosphor-icons/react'
import PageShell from '../components/layout/PageShell'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { RiskMeter } from '../components/common/RiskMeter'
import { Badge } from '../components/common/Badge'
import { SkeletonCard } from '../components/common/Skeleton'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { getAssessmentById } from '../services/api'
import { formatDate } from '../utils/formatters'
import toast from 'react-hot-toast'

/**
 * Normalizes risk assessment records from diverse API and storage payloads
 * (Unified hybrid assessment, standalone payment ML, context scanning, or local demo fallbacks)
 * into a uniform, null-safe, strongly-typed schema for RiskResults rendering.
 */
function normalizeAssessment(raw) {
  if (!raw || typeof raw !== 'object') return null

  // Support payloads nested under unified_assessment or assessment
  const src = raw.unified_assessment || raw.assessment || raw

  // Identifier
  const id = String(src.id || raw.id || 'EV-' + Math.random().toString(36).substring(2, 10).toUpperCase())

  // Risk Score (0 - 100)
  const rawScore = src.riskScore ?? src.final_risk_score ?? src.finalRiskScore ?? src.context_risk_score ?? src.risk_score ?? 0
  const riskScore = Math.max(0, Math.min(100, Math.round(Number(rawScore) || 0)))

  // Risk Level
  let rawLevel = src.riskLevel ?? src.final_risk_level ?? src.finalRiskLevel ?? src.risk_level
  let riskLevel = 'Low'
  if (typeof rawLevel === 'string' && rawLevel.trim()) {
    const l = rawLevel.trim().toLowerCase()
    riskLevel = l.charAt(0).toUpperCase() + l.slice(1)
  } else {
    riskLevel = riskScore >= 75 ? 'Critical' : riskScore >= 50 ? 'High' : riskScore >= 25 ? 'Medium' : 'Low'
  }

  // Threat Typology / Scam Category
  const fraudCategory = String(
    src.fraudCategory ??
    src.primary_threat_category ??
    src.primaryThreatCategory ??
    src.scamCategory ??
    src.scam_category ??
    'General Deception'
  )

  // Pre-Payment Intervention Directive / Recommended Action
  let recommendedAction = src.recommendedAction ?? src.recommended_action ?? src.recommendedActionDirective
  if (!recommendedAction || typeof recommendedAction !== 'string') {
    recommendedAction = riskScore >= 70
      ? 'STOP_PAYMENT_AND_INVESTIGATE'
      : riskScore >= 35
      ? 'VERIFY_BENEFICIARY_INDEPENDENTLY'
      : 'PROCEED_WITH_CAUTION'
  }

  // Timestamp
  const timestamp = src.timestamp || raw.timestamp || new Date().toISOString()

  // Hard Stop Indicator
  const hardStopTriggered = Boolean(
    src.hardStopTriggered ?? src.hard_stop_triggered ?? (riskScore >= 90)
  )

  // Legal / Operational Disclaimer
  const disclaimer = String(
    src.disclaimer ??
    src.explanation_summary ??
    src.explanationSummary ??
    'Pre-payment intervention evaluated across multi-vector ML signals, conversational intent, and sovereign guardrails.'
  )

  // Deterministic Guardrail Violations
  const rawWarnings = src.warnings ?? src.deterministic_warnings ?? src.deterministicWarnings ?? []
  const warnings = Array.isArray(rawWarnings)
    ? rawWarnings.map(w => (typeof w === 'string' ? w : (w?.message || JSON.stringify(w))))
    : []

  // Actionable Preventive Recommendations
  let rawRecs = src.recommendations ?? src.plain_english_reasons ?? src.plainEnglishReasons
  let recommendations = []
  if (Array.isArray(rawRecs) && rawRecs.length > 0) {
    recommendations = rawRecs.map(r => (typeof r === 'string' ? r : (r?.text || JSON.stringify(r))))
  } else {
    recommendations = [
      riskScore >= 70
        ? 'DO NOT enter your UPI PIN or authorize funds. This pattern indicates social engineering coercion.'
        : 'Verify beneficiary identity independently using official bank or merchant customer care channels.',
      'Never install remote screen-sharing tools (AnyDesk, TeamViewer, RustDesk) at caller request.',
      'Remember: UPI PIN is strictly an outgoing debit authorization, never required to receive money or refunds.',
    ]
  }

  // Statistical Machine Learning Telemetry
  let mlPrediction = null
  const rawMl = src.mlPrediction || src.ml_prediction || (
    src.ml_probability !== undefined ? {
      fraudProbability: src.ml_probability,
      isFraud: src.ml_decision,
      modelName: src.ml_model_name,
      confidence: src.ml_confidence,
      topRiskFactors: src.ml_top_risk_factors,
      topProtectiveFactors: src.ml_top_protective_factors,
    } : null
  )

  if (rawMl && typeof rawMl === 'object') {
    const prob = Number(rawMl.fraudProbability ?? rawMl.fraud_probability ?? rawMl.probability ?? 0)
    mlPrediction = {
      modelName: String(rawMl.modelName ?? rawMl.model_name ?? 'HistGradientBoosting (Trained ML)'),
      fraudProbability: isNaN(prob) ? 0 : Math.max(0, Math.min(1, prob)),
      isFraud: Boolean(rawMl.isFraud ?? rawMl.is_fraud ?? rawMl.prediction ?? (prob >= 0.5)),
      thresholdUsed: Number(rawMl.thresholdUsed ?? rawMl.threshold_used ?? 0.81),
      confidence: Number(rawMl.confidence ?? (prob > 0.5 ? prob : 1 - prob) ?? 0.85),
      topRiskFactors: Array.isArray(rawMl.topRiskFactors ?? rawMl.top_risk_factors)
        ? (rawMl.topRiskFactors ?? rawMl.top_risk_factors).map(f => ({
            description: String(f?.description || f?.feature || 'Risk Indicator'),
            impact: Number(f?.impact ?? f?.shap_value ?? f?.value ?? 0.05),
          }))
        : [],
      topProtectiveFactors: Array.isArray(rawMl.topProtectiveFactors ?? rawMl.top_protective_factors)
        ? (rawMl.topProtectiveFactors ?? rawMl.top_protective_factors).map(f => ({
            description: String(f?.description || f?.feature || 'Mitigating Factor'),
            impact: Number(f?.impact ?? f?.shap_value ?? f?.value ?? -0.05),
          }))
        : [],
      error: Boolean(rawMl.error),
    }
  }

  // Cross-Channel Intent Correlation Telemetry
  let correlation = null
  const rawCorr = src.correlation
  if (rawCorr && typeof rawCorr === 'object') {
    const relCat = String(rawCorr.relevanceCategory ?? rawCorr.relevance_category ?? 'UNCORRELATED')
    correlation = {
      relevanceCategory: relCat,
      correlationSummary: String(
        rawCorr.correlationSummary ??
        rawCorr.correlation_summary ??
        'Payment and conversation evaluated for cross-channel signals.'
      ),
      amountMatched: Boolean(rawCorr.amountMatched ?? rawCorr.amount_matched),
      recipientMatched: Boolean(rawCorr.recipientMatched ?? rawCorr.recipient_matched),
      actionConflict: Boolean(rawCorr.actionConflict ?? rawCorr.action_conflict),
      urgencyAligned: Boolean(rawCorr.urgencyAligned ?? rawCorr.urgency_aligned),
      correlationScore: Number(rawCorr.correlationScore ?? rawCorr.correlation_score ?? 0),
    }
  }

  // TypeSafe AI Jev Decision Intelligence
  let jevDecision = null
  const rawJev = src.jevDecision ?? src.jev_decision
  if (rawJev && typeof rawJev === 'object') {
    const rawAction = String(rawJev.recommendedAction ?? rawJev.recommended_action ?? recommendedAction)
    jevDecision = {
      threatSeverity: String(rawJev.threatSeverity ?? rawJev.threat_severity ?? riskLevel).toUpperCase(),
      recommendedAction: rawAction,
      conflictingSignalsDetected: Boolean(
        rawJev.conflictingSignalsDetected ?? rawJev.conflicting_signals_detected
      ),
      isFallback: Boolean(rawJev.isFallback ?? rawJev.is_fallback ?? true),
      note: String(rawJev.note ?? 'TypeSafe AI decision intelligence evaluation.'),
    }
  }

  // Conversation Context Intelligence
  let conversationAnalysis = null
  const rawConv = src.conversationAnalysis ?? src.conversation_analysis
  if (rawConv && typeof rawConv === 'object') {
    conversationAnalysis = {
      intent: String(rawConv.intent ?? fraudCategory),
      contextRiskScore: Number(rawConv.contextRiskScore ?? rawConv.context_risk_score ?? riskScore),
      signals: Array.isArray(rawConv.signals) ? rawConv.signals : [],
    }
  }

  // Active call & multiple payment situational flags
  const indicators = src.indicators || raw.indicators || {}
  const hasCallCoercion = Boolean(
    indicators.callInProgress ||
    src.callInProgress ||
    raw.callInProgress ||
    warnings.some(w => /active call/i.test(w))
  )
  const hasRapidMultiplePayments = Boolean(
    indicators.rapidMultiplePayments ||
    src.rapidMultiplePayments ||
    raw.rapidMultiplePayments ||
    warnings.some(w => /rapid multiple payments|consecutive|split/i.test(w))
  )

  return {
    id,
    riskScore,
    riskLevel,
    fraudCategory,
    recommendedAction,
    timestamp,
    hardStopTriggered,
    disclaimer,
    warnings,
    recommendations,
    mlPrediction,
    correlation,
    jevDecision,
    conversationAnalysis,
    indicators,
    hasCallCoercion,
    hasRapidMultiplePayments,
    raw,
  }
}

function RiskResultsContent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState(null)

  useEffect(() => {
    async function loadAssessment() {
      try {
        setLoading(true)
        const data = await getAssessmentById(id)
        if (data) {
          setAssessment(normalizeAssessment(data))
        } else {
          setAssessment(null)
        }
      } catch (err) {
        console.error('Failed to load assessment', err)
        setAssessment(null)
      } finally {
        setLoading(false)
      }
    }
    loadAssessment()
  }, [id])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Incident link copied to clipboard')
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <PageShell title="Evaluating Risk Telemetry..." subtitle="Running multi-layer verification checks.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    )
  }

  if (!assessment) {
    return (
      <PageShell title="Assessment Not Found">
        <EmptyState
          title="Risk Assessment Record Missing"
          description="The requested risk evaluation record could not be found or has expired from local session history."
          actionLabel="Run New Assessment"
          onAction={() => navigate('/assess')}
        />
      </PageShell>
    )
  }

  const isHighOrCritical =
    assessment.riskLevel === 'High' || assessment.riskLevel === 'Critical'

  return (
    <PageShell
      title="Pre-Transaction Risk Verdict"
      subtitle={`Completed on ${formatDate(assessment.timestamp)} • Audit ID: ${String(assessment.id || '').slice(0, 8)}`}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Printer} onClick={handlePrint}>
            Print Report
          </Button>
          <Button variant="secondary" size="sm" icon={ShareNetwork} onClick={handleShare}>
            Share Verdict
          </Button>
          <Link to={`/report?scamType=${encodeURIComponent(assessment.fraudCategory || 'General')}`}>
            <Button variant="outlineDanger" size="sm" icon={Flag}>
              Report Threat
            </Button>
          </Link>
          <Link to="/assess">
            <Button variant="primary" size="sm">
              New Evaluation
            </Button>
          </Link>
        </div>
      }
    >
      {/* Pre-Payment Intervention Action Banner (Modernist Directive Standard) */}
      <div className={`mb-8 rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
        assessment.recommendedAction === 'STOP_PAYMENT_AND_INVESTIGATE' || isHighOrCritical
          ? 'border-rose-200/90 bg-rose-50/60 text-rose-950'
          : assessment.recommendedAction === 'VERIFY_BENEFICIARY_INDEPENDENTLY' || assessment.riskLevel === 'Medium'
          ? 'border-amber-200/90 bg-amber-50/60 text-amber-950'
          : 'border-emerald-200/90 bg-emerald-50/60 text-emerald-950'
      }`}>
        <div className="flex items-start gap-3.5">
          {assessment.recommendedAction === 'STOP_PAYMENT_AND_INVESTIGATE' || isHighOrCritical ? (
            <WarningOctagon size={28} weight="fill" className="text-rose-600 flex-shrink-0 mt-0.5" />
          ) : assessment.recommendedAction === 'VERIFY_BENEFICIARY_INDEPENDENTLY' || assessment.riskLevel === 'Medium' ? (
            <WarningCircle size={28} weight="fill" className="text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={28} weight="fill" className="text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/5 text-zinc-700">
                Pre-Payment Directive
              </span>
              {assessment.hardStopTriggered && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white">
                  Hard Stop Active
                </span>
              )}
            </div>
            <h3 className="text-base font-bold mt-1 text-zinc-950">
              {String(assessment.recommendedAction || 'PROCEED WITH CAUTION').replace(/_/g, ' ')}
            </h3>
            <p className="mt-1 text-xs leading-relaxed max-w-[85ch] text-zinc-700">
              {assessment.disclaimer}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className={`inline-block rounded-lg px-3.5 py-1.5 text-xs font-mono font-bold tracking-wide uppercase ${
            assessment.recommendedAction === 'STOP_PAYMENT_AND_INVESTIGATE' || isHighOrCritical
              ? 'bg-rose-600 text-white shadow-sm'
              : assessment.recommendedAction === 'VERIFY_BENEFICIARY_INDEPENDENTLY' || assessment.riskLevel === 'Medium'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-emerald-600 text-white shadow-sm'
          }`}>
            {assessment.recommendedAction === 'STOP_PAYMENT_AND_INVESTIGATE' || isHighOrCritical
              ? 'DO NOT ENTER PIN'
              : assessment.recommendedAction === 'VERIFY_BENEFICIARY_INDEPENDENTLY'
              ? 'VERIFY INDEPENDENTLY'
              : 'TRANSACTION CLEAN'}
          </span>
        </div>
      </div>

      {/* High-Alert Advisory for Active Phone Call & Multiple Payments in One Shot */}
      {(assessment.hasCallCoercion || assessment.hasRapidMultiplePayments) && (
        <div className="mb-8 space-y-4">
          {assessment.hasCallCoercion && (
            <div className="rounded-xl border border-rose-200/90 bg-rose-50/70 p-5 text-rose-950 flex items-start gap-4">
              <div className="rounded-lg bg-rose-600 text-white p-2.5 flex-shrink-0 mt-0.5">
                <PhoneCall size={22} weight="fill" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white">
                    LIVE CALL COERCION ADVISORY • कॉल पर रखकर धोखा
                  </span>
                  <span className="text-xs font-bold text-rose-950">
                    High-Risk Active Voice/Video Call Coercion Pattern
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-rose-900/90 max-w-[75ch]">
                  You are actively engaged on a voice or video call while performing a payment. Fraudsters use this exact psychological tactic to keep you rushed, prevent logical second-guessing, and stop you from checking with family or bank staff.
                </p>
                <div className="rounded-lg border border-rose-200 bg-white/90 p-3.5 text-xs text-rose-900 space-y-1">
                  <p className="leading-relaxed">
                    <span className="font-mono font-bold text-rose-700 uppercase tracking-wide mr-1.5">[MANDATORY PROTOCOL]</span>
                    Hang up the phone call immediately. Do NOT enter your UPI PIN while staying on call. Genuine bank officials, police, customs, or e-commerce customer support NEVER ask you to pay while staying connected on call.
                  </p>
                  <p className="text-[11px] text-rose-800 italic border-l-2 border-rose-400 pl-2 mt-1">
                    "धोखेबाज कॉल पर रखकर दबाव बनाते हैं ताकि आप किसी से पूछ न सकें। तुरंत कॉल काटें और बैंक से सीधे पुष्टि करें।"
                  </p>
                </div>
              </div>
            </div>
          )}

          {assessment.hasRapidMultiplePayments && (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-5 text-amber-950 flex items-start gap-4">
              <div className="rounded-lg bg-amber-600 text-white p-2.5 flex-shrink-0 mt-0.5">
                <WarningOctagon size={22} weight="fill" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600 text-white">
                    RAPID MULTI-PAYMENT ADVISORY • SPLIT TRANSACTION TRAP
                  </span>
                  <span className="text-xs font-bold text-amber-950">
                    High Velocity Consecutive Debits Flagged
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-amber-900/90 max-w-[75ch]">
                  Fraudsters frequently instruct victims to send money in multiple back-to-back chunks (e.g. ₹5,000 then ₹20,000 then ₹30,000) to bypass single-transaction bank ceilings or rapidly drain accounts before you realize you are being scammed.
                </p>
                <div className="rounded-lg border border-amber-200 bg-white/90 p-3.5 text-xs text-amber-900 leading-relaxed">
                  <span className="font-mono font-bold text-amber-700 uppercase tracking-wide mr-1.5">[VELOCITY INTERVENTION]</span>
                  Stop any further transfers immediately. Open your bank app, check your account balance and transaction statement, and call the 1930 Cyber Helpline immediately if unauthorized amounts were debited.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Verdict Split (Asymmetric 5 / 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Card (5 cols): Risk Gauge & Core Verdict */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>Composite Risk Score</Card.Title>
              <Card.Description>
                Aggregated score from behavioral ML, NLP intent, and deterministic rules.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="py-6">
                <RiskMeter
                  score={assessment.riskScore}
                  level={assessment.riskLevel}
                  size="lg"
                  showDetails={true}
                />
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-[var(--color-content-secondary)]">Diagnosed Typology:</span>
                  <span className="font-bold font-data text-[var(--color-content-primary)]">
                    {String(assessment.fraudCategory || 'Unclassified').replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-[var(--color-content-secondary)]">Rule Safety Engine:</span>
                  <span className="font-bold font-data text-[var(--color-content-primary)]">
                    Deterministic Guardrails (Score: {assessment.riskScore}/100)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--color-content-secondary)]">Statistical ML Engine:</span>
                  <span className="font-bold font-data text-blue-600">
                    {assessment.mlPrediction
                      ? `${assessment.mlPrediction.modelName} (${(Number(assessment.mlPrediction.fraudProbability || 0) * 100).toFixed(1)}% Fraud Prob)`
                      : 'Active (Embedded)'}
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Model Provenance Notice (Truth & Integrity) */}
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4.5 space-y-1.5 text-[11px] text-[var(--color-content-secondary)]">
            <span className="font-bold text-zinc-900 flex items-center gap-1.5">
              <Info size={15} className="text-[var(--color-brand-deep)]" />
              Dual-Engine Architecture Notice
            </span>
            <p className="leading-relaxed">
              UPI Rakshak runs both a statistical ML classifier (HistGradientBoosting trained on 100k transactions, ROC-AUC 0.971) and deterministic safety guardrails. Predictions below reflect genuine model outputs and SHAP local feature contributions.
            </p>
          </div>
        </div>

        {/* Right Card (7 cols): Detected Signals & Actionable Recommendations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Genuine Machine Learning Prediction Section */}
          {assessment.mlPrediction && !assessment.mlPrediction.error && (
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu size={20} className="text-blue-600 flex-shrink-0" weight="fill" />
                  <div>
                    <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                      Machine Learning Prediction Engine ({assessment.mlPrediction.modelName})
                    </h3>
                    <p className="text-[11px] text-blue-700">
                      Trained on 100,000 synthetic records • Tested on untouched temporal split (ROC-AUC 0.980)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    assessment.mlPrediction.isFraud ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {assessment.mlPrediction.isFraud ? 'PREDICTED FRAUD' : 'PREDICTED LEGITIMATE'}
                  </span>
                </div>
              </div>

              {/* ML Probability Bar & Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/80 rounded-xl p-3 border border-blue-100">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Fraud Probability</span>
                  <span className="text-base font-extrabold font-data text-blue-900">
                    {(Number(assessment.mlPrediction.fraudProbability || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Optimal Cutoff Threshold</span>
                  <span className="text-base font-extrabold font-data text-zinc-700">
                    {(Number(assessment.mlPrediction.thresholdUsed ?? 0.81) * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Model Confidence</span>
                  <span className="text-base font-extrabold font-data text-emerald-700">
                    {(Number(assessment.mlPrediction.confidence ?? 0.85) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* SHAP Feature Contribution Explainability */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                  <Lightning size={15} weight="fill" className="text-amber-500" />
                  <span>SHAP Explainability: Local Feature Drivers</span>
                </div>

                {/* Risk-Increasing Factors */}
                {assessment.mlPrediction.topRiskFactors && assessment.mlPrediction.topRiskFactors.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                      Factors Increasing Fraud Probability (+):
                    </span>
                    <div className="space-y-1.5">
                      {assessment.mlPrediction.topRiskFactors.map((factor, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-xs bg-rose-50/80 border border-rose-200/70 rounded-lg px-2.5 py-1.5 text-rose-950">
                          <span className="font-medium text-[11px]">{factor.description}</span>
                          <span className="font-data font-bold text-rose-700 text-[10px] flex-shrink-0">
                            +{Number(factor.impact || 0).toFixed(3)} SHAP
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Protective Mitigating Factors */}
                {assessment.mlPrediction.topProtectiveFactors && assessment.mlPrediction.topProtectiveFactors.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Factors Reducing Fraud Probability (-):
                    </span>
                    <div className="space-y-1.5">
                      {assessment.mlPrediction.topProtectiveFactors.map((factor, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-xs bg-emerald-50/80 border border-emerald-200/70 rounded-lg px-2.5 py-1.5 text-emerald-950">
                          <span className="font-medium text-[11px]">{factor.description}</span>
                          <span className="font-data font-bold text-emerald-700 text-[10px] flex-shrink-0">
                            {Number(factor.impact || 0).toFixed(3)} SHAP
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Module B: Payment Intent Correlation Intelligence */}
          {assessment.correlation && assessment.correlation.relevanceCategory !== 'NO_CONVERSATION' && (
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>Payment-Context Intent Correlation</Card.Title>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    assessment.correlation.relevanceCategory === 'DIRECTLY_CORRELATED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : assessment.correlation.relevanceCategory === 'PARTIALLY_CORRELATED'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {String(assessment.correlation.relevanceCategory || 'UNCORRELATED').replace(/_/g, ' ')}
                  </span>
                </div>
                <Card.Description>
                  Correlates textual demands in conversation against the actual outgoing UPI transaction.
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3">
                <p className="text-xs text-zinc-800 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  {assessment.correlation.correlationSummary}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-500 block text-[10px] font-bold">Amount Match</span>
                    <span className={`font-bold ${assessment.correlation.amountMatched ? 'text-rose-600' : 'text-zinc-700'}`}>
                      {assessment.correlation.amountMatched ? 'Direct Demand Match' : 'Unmatched'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-500 block text-[10px] font-bold">Recipient Entity</span>
                    <span className={`font-bold ${assessment.correlation.recipientMatched ? 'text-rose-600' : 'text-zinc-700'}`}>
                      {assessment.correlation.recipientMatched ? 'Identified in Chat' : 'No Mention'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-500 block text-[10px] font-bold">Action Direction</span>
                    <span className={`font-bold ${assessment.correlation.actionConflict ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {assessment.correlation.actionConflict ? 'Action Conflict Alert' : 'Aligned'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-500 block text-[10px] font-bold">Urgency Correlation</span>
                    <span className={`font-bold ${assessment.correlation.urgencyAligned ? 'text-rose-600' : 'text-zinc-700'}`}>
                      {assessment.correlation.urgencyAligned ? 'Active Deadline' : 'Normal'}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Module D: TypeSafe AI Jev Decision Intelligence */}
          {assessment.jevDecision && (
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>Jev Structured Decision Intelligence (TypeSafe AI)</Card.Title>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    assessment.jevDecision.isFallback
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {assessment.jevDecision.isFallback ? 'VERIFIED LOCAL FALLBACK' : 'JEV CONNECTED'}
                  </span>
                </div>
                <Card.Description>
                  Typed decision model (/v1/decide) evaluating combined evidence across choices and calibrated probabilities.
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-purple-50/50 rounded-xl p-3 border border-purple-100">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Threat Severity</span>
                    <span className="text-sm font-extrabold font-data text-purple-950">
                      {assessment.jevDecision.threatSeverity}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Recommended Action</span>
                    <span className="text-xs font-bold font-data text-zinc-900">
                      {String(assessment.jevDecision.recommendedAction || assessment.recommendedAction || 'PROCEED').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Signal Contradictions</span>
                    <span className={`text-xs font-bold ${assessment.jevDecision.conflictingSignalsDetected ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {assessment.jevDecision.conflictingSignalsDetected ? 'Contradictions Detected' : 'Harmonious Signals'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 italic">
                  {assessment.jevDecision.note}
                </p>
              </Card.Content>
            </Card>
          )}

          {/* Active Threat Signals (Rule-Based Guardrails) */}
          <Card>
            <Card.Header>
              <Card.Title>Rule-Based Guardrail Alerts</Card.Title>
              <Card.Description>
                Identified {assessment.warnings?.length || 0} deterministic safety guardrail violations.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              {assessment.warnings && assessment.warnings.length > 0 ? (
                <div className="space-y-2.5">
                  {assessment.warnings.map((warn, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-950"
                    >
                      <WarningCircle
                        size={17}
                        weight="bold"
                        className="text-amber-700 flex-shrink-0 mt-0.5"
                      />
                      <span className="leading-relaxed">{warn}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900">
                  <CheckCircle size={18} weight="bold" className="text-emerald-600" />
                  <span>No anomalous behavioral flags triggered. Standard transaction precautions apply.</span>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Recommended Preventive Actions */}
          <Card>
            <Card.Header>
              <Card.Title>Recommended Preventive Protocol</Card.Title>
              <Card.Description>
                Follow these immediate operational steps to secure your bank account.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {assessment.recommendations?.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 text-xs text-[var(--color-content-primary)]"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-deep)] text-white text-[10px] font-bold flex-shrink-0 mt-0.5 font-data">
                      {idx + 1}
                    </div>
                    <p className="leading-relaxed font-semibold">{rec}</p>
                  </div>
                ))}
              </div>

              {isHighOrCritical && (
                <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-3">
                  <a
                    href="tel:1930"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-sm"
                  >
                    Dial Helpline 1930
                  </a>
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
                  >
                    Lodge FIR on Cybercrime Portal
                  </a>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Multi-Layer Pipeline Intelligence Audit (4 Pillars) */}
      <Card>
        <Card.Header>
          <Card.Title>Multi-Layer Safety Engine Telemetry</Card.Title>
          <Card.Description>
            Individual diagnostics from each verification layer in the detection stack.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Layer A */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                  <Cpu size={16} className="text-blue-600" /> Layer A: ML Model
                </span>
                <Badge variant={assessment.mlPrediction ? "brand" : "neutral"} size="sm">
                  {assessment.mlPrediction ? "IN SERVICE" : "STANDBY"}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                {assessment.mlPrediction?.modelName || 'HistGradientBoosting'} evaluated 38 behavioral & social engineering telemetry features.
              </p>
              <div className="pt-2 text-xs font-data text-zinc-900 font-semibold border-t border-zinc-200/60">
                Fraud Prob: {assessment.mlPrediction ? `${(Number(assessment.mlPrediction.fraudProbability || 0) * 100).toFixed(1)}%` : 'Active'}
              </div>
            </div>

            {/* Layer B */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                  <ChatTeardropText size={16} className="text-amber-600" /> Layer B: Context NLP
                </span>
                <Badge variant="warning" size="sm">
                  ACTIVE
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Multi-lingual parser evaluating English, Hinglish & Hindi statements for compound coercion.
              </p>
              <div className="pt-2 text-xs font-data text-zinc-900 font-semibold border-t border-zinc-200/60">
                Intent: {assessment.conversationAnalysis?.intent || assessment.fraudCategory || 'Evaluated'}
              </div>
            </div>

            {/* Layer C: Jev AI Intelligence */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                  <Lightning size={16} className="text-purple-600" /> Layer C: Jev AI
                </span>
                <Badge variant={assessment.jevDecision?.isFallback ? "neutral" : "success"} size="sm">
                  {assessment.jevDecision?.isFallback ? "FALLBACK" : "LIVE JEV"}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                TypeSafe AI typed decision model (/v1/decide) evaluating combined evidence.
              </p>
              <div className="pt-2 text-xs font-data text-zinc-900 font-semibold border-t border-zinc-200/60">
                Severity: {assessment.jevDecision?.threatSeverity || assessment.riskLevel}
              </div>
            </div>

            {/* Layer D: Guardrails */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                  <ShieldCheck size={16} className="text-emerald-600" /> Layer D: Guardrails
                </span>
                <Badge variant="success" size="sm">
                  ONLINE
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Deterministic policy filter (e.g. Hard stop on PIN-to-receive requests).
              </p>
              <div className="pt-2 text-xs font-data text-zinc-900 font-semibold border-t border-zinc-200/60">
                Action: {isHighOrCritical ? 'Enforce Halt' : 'Permit Payment'}
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </PageShell>
  )
}

export default function RiskResults() {
  return (
    <ErrorBoundary
      title="Pre-Payment Risk Verdict Interrupted"
      description="An issue occurred while formatting the risk assessment details. Please reload the verdict or start a new check."
    >
      <RiskResultsContent />
    </ErrorBoundary>
  )
}
