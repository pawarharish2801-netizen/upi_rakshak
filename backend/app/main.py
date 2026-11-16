import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

# Ensure both the backend directory and project root are always on sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))  # backend/app
_backend_dir = os.path.dirname(_current_dir)               # backend
_root_dir = os.path.dirname(_backend_dir)                  # project root
for _p in [_backend_dir, _root_dir]:
    if _p and _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, HTTPException, Query, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from app.ml_service import ml_service, MLPredictionInput
except ImportError:
    from backend.app.ml_service import ml_service, MLPredictionInput

try:
    from app.context.schemas import (
        ConversationAnalysisRequest,
        ConversationAnalysisResult,
        ProgressiveScanRequest,
        ProgressiveScanResponse,
        UnifiedAssessmentRequest,
        UnifiedAssessmentResponse,
        ScreenshotOCRAnalysisResponse,
        ScreenshotEntities,
        ScreenshotTextAnalysisRequest,
    )
    from app.context.conversation_intelligence import conversation_engine
    from app.context.intent_correlation import correlation_engine
    from app.context.jev_client import jev_client
    from app.context.progressive_scanner import progressive_scanner
    from app.context.unified_service import unified_assessment_service
    from app.context.ocr_service import ocr_service, InvalidImageFormatError, FileSizeLimitExceededError
except ImportError:
    from backend.app.context.schemas import (
        ConversationAnalysisRequest,
        ConversationAnalysisResult,
        ProgressiveScanRequest,
        ProgressiveScanResponse,
        UnifiedAssessmentRequest,
        UnifiedAssessmentResponse,
        ScreenshotOCRAnalysisResponse,
        ScreenshotEntities,
        ScreenshotTextAnalysisRequest,
    )
    from backend.app.context.conversation_intelligence import conversation_engine
    from backend.app.context.intent_correlation import correlation_engine
    from backend.app.context.jev_client import jev_client
    from backend.app.context.progressive_scanner import progressive_scanner
    from backend.app.context.unified_service import unified_assessment_service
    from backend.app.context.ocr_service import ocr_service, InvalidImageFormatError, FileSizeLimitExceededError

app = FastAPI(
    title="UPI Rakshak Security Engine",
    description="Pre-transaction fraud prevention and social engineering risk intelligence API.",
    version="2.4.0",
)

# Defense-in-depth HTTP Security Headers Middleware (OWASP ASVS V14 / CWE-693)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# CORS configuration - explicit safe origins (OWASP API8 / CWE-942)
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# In-memory storage with MongoDB Atlas hook
MONGODB_URI = os.getenv("MONGODB_URI")
db_client = None

# Local in-memory session audit storage with bounded capacity (OWASP API4 / CWE-400 DoS defense)
MAX_AUDIT_STORE_ITEMS = 500
MAX_SCAM_REPORTS_ITEMS = 500

audit_store: List[Dict[str, Any]] = []
scam_reports: List[Dict[str, Any]] = []


def _append_audit_record(record: Dict[str, Any]) -> None:
    """Inserts record into audit trail with bounded memory cap to prevent DoS."""
    audit_store.insert(0, record)
    if len(audit_store) > MAX_AUDIT_STORE_ITEMS:
        audit_store.pop()


def _append_scam_report(report: Dict[str, Any]) -> None:
    """Inserts scam report with bounded memory cap to prevent DoS."""
    scam_reports.insert(0, report)
    if len(scam_reports) > MAX_SCAM_REPORTS_ITEMS:
        scam_reports.pop()


# ----------------------------------------------------------------------------
# Models (with OWASP input boundary validation)
# ----------------------------------------------------------------------------
class PaymentAssessmentRequest(BaseModel):
    amount: float = Field(
        ...,
        gt=0.0,
        le=100000.0,
        description="Transaction amount in INR (must be positive and <= NPCI limit of Rs 1,00,000)"
    )
    recipientId: str = Field(
        ...,
        min_length=3,
        max_length=128,
        description="Recipient UPI handle or identifier"
    )
    paymentChannel: str = Field("UPI_ID_Manual", max_length=64)
    paymentPurpose: str = Field("merchant_payment", max_length=64)
    recipientVerification: str = Field("Bank_Name_Verified", max_length=64)
    isFirstTimeRecipient: bool = True
    urgency: bool = False
    refundClaim: bool = False
    impersonation: bool = False
    pinToReceive: bool = False
    suspiciousLink: bool = False
    screenSharing: bool = False
    callerAuthority: bool = False
    unsolicitedContact: bool = False
    secrecyRequested: bool = False
    emotionalPressure: bool = False
    callInProgress: bool = False
    rapidMultiplePayments: bool = False
    recentPaymentCount: Optional[int] = Field(None, ge=1, le=50)
    qrMismatch: bool = False
    collectUnsolicited: bool = False
    conversationNotes: Optional[str] = Field(None, max_length=5000)


class ConversationScanRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=20000,
        description="Text content to scan for social engineering cues (bounded to 20KB)"
    )


class ScamReportRequest(BaseModel):
    scamCategory: str = Field(..., max_length=64)
    fraudsterUPI: Optional[str] = Field(None, max_length=128)
    fraudsterPhone: Optional[str] = Field(None, max_length=32)
    phishingUrl: Optional[str] = Field(None, max_length=1024)
    amountLost: Optional[str] = Field(None, max_length=32)
    description: str = Field(..., min_length=5, max_length=5000)
    incidentDate: str = Field(..., max_length=32)


# ----------------------------------------------------------------------------
# Safety & Decision Engine Logic
# ----------------------------------------------------------------------------
def evaluate_payment_risk(req: PaymentAssessmentRequest) -> Dict[str, Any]:
    score = 0.0
    warnings = []
    indicators = {}

    # 1. Amount signals
    if req.amount > 50000:
        score += 15.0
        warnings.append("High-value transaction exceeds Rs 50,000 threshold")
    elif req.amount > 20000:
        score += 8.0
        warnings.append("Transaction amount is above standard peer-to-peer average")

    # 2. Recipient profile
    if req.isFirstTimeRecipient:
        score += 12.0
        warnings.append("First-time recipient with zero prior bilateral transactions")
    if req.recipientVerification == "Unverified":
        score += 15.0
        warnings.append("Recipient UPI handle identity is unverified")
    elif req.recipientVerification == "Name_Mismatch":
        score += 20.0
        warnings.append("Recipient bank account title does not match claimed name")

    # 3. Channel vulnerability
    if req.paymentChannel == "Collect_Request":
        score += 8.0
        indicators["collectRequest"] = True
    elif req.paymentChannel == "Payment_Link":
        score += 6.0
        indicators["paymentLink"] = True

    # 4. Critical Social Engineering Checks (Deterministic Guardrails)
    if req.pinToReceive:
        score += 35.0
        warnings.append("CRITICAL: PIN requested to receive funds (UPI never requires PIN to credit account)")
        indicators["pinToReceive"] = True

    if req.screenSharing:
        score += 25.0
        warnings.append("CRITICAL: Remote screen sharing app requested (AnyDesk/TeamViewer takeover signature)")
        indicators["screenSharing"] = True

    if req.callerAuthority:
        score += 20.0
        warnings.append("Impersonation of law enforcement, police, CBI or regulatory authority")
        indicators["callerAuthority"] = True

    if req.secrecyRequested:
        score += 18.0
        warnings.append("Coercive secrecy: told not to inform family, bank, or authorities")
        indicators["secrecyRequested"] = True

    if req.emotionalPressure:
        score += 15.0
        warnings.append("Psychological intimidation or arrest threats detected")
        indicators["emotionalPressure"] = True

    if req.refundClaim:
        score += 14.0
        warnings.append("Transaction framed as refund or prize processing fee")
        indicators["refundClaim"] = True

    if req.urgency:
        score += 10.0
        warnings.append("Artificial urgency deadline forcing hurried authorization")
        indicators["urgency"] = True

    if req.unsolicitedContact:
        score += 8.0
        warnings.append("Unsolicited inbound contact initiated this payment request")
        indicators["unsolicitedContact"] = True

    # High-Priority Situational Threat: Active Call Coercion
    if req.callInProgress:
        score += 20.0
        warnings.append("ACTIVE CALL COERCION DETECTED: Caller is on a live phone/video call with you during payment. Scamsters keep victims on call to induce panic and prevent independent verification. Hang up immediately!")
        indicators["callInProgress"] = True

    # High-Priority Situational Threat: Rapid Multiple Payments / Velocity Burst
    if req.rapidMultiplePayments or (req.recentPaymentCount and req.recentPaymentCount > 1):
        score += 22.0
        warnings.append("RAPID MULTIPLE PAYMENTS IN ONE SHOT: Multiple rapid consecutive transfers requested. Fraudsters commonly demand split payments in quick succession to bypass banking caps or quickly drain accounts.")
        indicators["rapidMultiplePayments"] = True

    # Compound Threat Synergy: Active Call + Rapid Multiple Payments
    if req.callInProgress and (req.rapidMultiplePayments or (req.recentPaymentCount and req.recentPaymentCount > 1)):
        score += 15.0
        warnings.append("CRITICAL COMPOUND THREAT: Active phone call combined with rapid back-to-back payments. This is a hallmark signature of live coercion (Digital Arrest or Task Scam).")

    if req.paymentChannel == "QR_Scan" and req.qrMismatch:
        score += 18.0
        warnings.append("QR payee name does not match claimed merchant")
        indicators["qrMismatch"] = True

    if req.paymentChannel == "Collect_Request" and req.collectUnsolicited:
        score += 16.0
        warnings.append("Unexpected collect request received without prior invoice")
        indicators["collectUnsolicited"] = True

    # Normalize score
    final_score = min(100, max(0, int(round(score))))

    # Risk level determination
    if final_score >= 70:
        risk_level = "Critical"
    elif final_score >= 45:
        risk_level = "High"
    elif final_score >= 25:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Fraud Category classification
    if final_score >= 25:
        if req.pinToReceive or req.refundClaim:
            fraud_cat = "Fake_Refund"
        elif req.callerAuthority and req.secrecyRequested:
            fraud_cat = "Digital_Arrest"
        elif req.screenSharing:
            fraud_cat = "Screen_Sharing_Scam"
        elif req.impersonation:
            fraud_cat = "Impersonation_Scam"
        elif req.callerAuthority:
            fraud_cat = "Fake_Customer_Care"
        elif req.qrMismatch:
            fraud_cat = "QR_Code_Scam"
        elif req.collectUnsolicited:
            fraud_cat = "Collect_Request_Scam"
        elif req.paymentPurpose == "investment":
            fraud_cat = "Investment_Scam"
        elif req.paymentPurpose == "registration_fee":
            fraud_cat = "Fake_Job_Offer"
        else:
            fraud_cat = "Suspicious_Activity"
    else:
        fraud_cat = "Legitimate"

    # Actionable recommendations
    recommendations = []
    if risk_level == "Critical":
        recommendations.append("DO NOT ENTER YOUR UPI PIN under any circumstance.")
        recommendations.append("Block this UPI ID and sender contact immediately.")
        recommendations.append("Report the incident to 1930 (National Cyber Crime Helpline).")
    elif risk_level == "High":
        recommendations.append("Verify beneficiary through a separate, known official phone number.")
        recommendations.append("Never share OTP, install remote apps, or accept collect requests.")
        recommendations.append("Do not proceed until identity is independently authenticated.")
    elif risk_level == "Medium":
        recommendations.append("Review payee name and amount carefully on your bank's UPI screen.")
        recommendations.append("Verify any claimed bill or refund with the official merchant portal.")
    else:
        recommendations.append("Transaction appears consistent with safe behavioral baselines.")

    # High-Priority Call & Velocity Directives
    if req.callInProgress:
        recommendations.insert(0, "DISCONNECT THE PHONE CALL NOW: Real bank executives, police, or merchants NEVER require you to remain on a phone call while entering your UPI PIN. Scamsters keep victims on the line to manipulate and rush them.")
    if req.rapidMultiplePayments:
        recommendations.insert(0, "HALT REPEATED TRANSFERS: Fraudsters frequently demand multiple back-to-back split payments in one shot to drain your account before fraud systems react. Stop and check your statement.")

    record_id = str(uuid.uuid4())

    # Evaluate using Machine Learning prediction engine in parallel
    ml_prediction = None
    if ml_service.is_loaded:
        try:
            dump_data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
            ml_input = MLPredictionInput(**dump_data)
            ml_prediction = ml_service.predict(ml_input)
        except Exception as e:
            ml_prediction = {"error": str(e), "status": "unavailable"}

    assessment = {
        "id": record_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "riskScore": final_score,
        "riskLevel": risk_level,
        "fraudCategory": fraud_cat,
        "warnings": warnings,
        "indicators": indicators,
        "recommendations": recommendations,
        "mlPrediction": ml_prediction,
        "paymentDetails": {
            "amount": req.amount,
            "recipientId": req.recipientId,
            "paymentChannel": req.paymentChannel,
            "paymentPurpose": req.paymentPurpose,
        },
        "source": "python_safety_engine",
        "disclaimer": "Evaluated using Python Safety Engine and synthetic UPI Rakshak behavioral baselines. Jev intelligence is emulated until API credentials are linked.",
    }

    _append_audit_record(assessment)
    return assessment


# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "UPI Rakshak Risk API",
        "version": "2.4.0",
        "mongoConnected": bool(MONGODB_URI),
        "mlModelLoaded": ml_service.is_loaded,
        "mlModelName": ml_service.metadata.get("model_name"),
    }


@app.get("/api/ml/status")
def get_ml_status():
    """Returns ML model status, metadata, thresholds and evaluation metrics."""
    return ml_service.get_status()


@app.post("/api/ml/predict")
def predict_fraud_ml(req: MLPredictionInput):
    """
    Dedicated Machine Learning fraud prediction endpoint.
    Applies identical preprocessing pipeline and returns probability,
    classification verdict, and SHAP-based local explainability factors.
    """
    try:
        prediction = ml_service.predict(req)
        return prediction
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML Service Unavailable: {str(re)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Inference error: {str(e)}",
        )


@app.post("/api/assess/payment")
def assess_payment(req: PaymentAssessmentRequest):
    return evaluate_payment_risk(req)


@app.post("/api/assess/conversation")
def scan_conversation(req: ConversationScanRequest):
    """
    Advanced Conversation Scanner (Module A).
    Evaluates multi-lingual statements (English, Hinglish, Hindi),
    relational threats, false positive educational discussions, and entity amounts.
    """
    analysis = conversation_engine.analyze(req.text)
    record_id = str(uuid.uuid4())

    level = (
        "Critical" if analysis.context_risk_score >= 80 else
        "High" if analysis.context_risk_score >= 60 else
        "Medium" if analysis.context_risk_score >= 30 else
        "Low"
    )

    warnings = [f"Detected pattern: {s.label} ('{s.evidence}')" for s in analysis.signals]
    recommendations = []
    if level == "Critical":
        recommendations.append("DO NOT ENTER YOUR UPI PIN or transfer funds. This matches an active coercion script.")
        recommendations.append("Block and report this contact immediately on WhatsApp / messaging app.")
        recommendations.append("Dial 1930 (National Cyber Crime Helpline) if any amount was authorized.")
    elif level == "High":
        recommendations.append("Independently verify beneficiary using official bank/helpline contact.")
        recommendations.append("Never share OTPs, passwords, or install AnyDesk/TeamViewer apps.")
    elif level == "Medium":
        recommendations.append("Verify payment context carefully with official merchant channel.")
    else:
        recommendations.append("Dialogue appears safe. Standard cyber hygiene precautions apply.")

    res = {
        "id": record_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "riskScore": analysis.context_risk_score,
        "riskLevel": level,
        "intent": analysis.intent,
        "scamCategory": analysis.scam_category,
        "language": analysis.language,
        "isEducational": analysis.is_educational_or_benign,
        "confidence": analysis.confidence,
        "warnings": warnings,
        "detectedPatterns": [s.label for s in analysis.signals],
        "evidenceSnippets": analysis.evidence_snippets,
        "signals": [s.model_dump() for s in analysis.signals],
        "relationshipDetected": analysis.relationship_detected,
        "extractedAmounts": analysis.extracted_amounts,
        "extractedEntities": analysis.extracted_entities,
        "recommendations": recommendations,
        "conversationExcerpt": req.text[:200],
        "source": "advanced_conversation_intelligence_engine",
        "disclaimer": analysis.explanation,
    }
    _append_audit_record(res)
    return res


@app.post("/api/conversation/progressive")
def progressive_scan(req: ProgressiveScanRequest):
    """
    Progressive Conversation Assessment (Module E).
    Tracks message-by-message risk escalation over multi-turn interactions.
    """
    return progressive_scanner.scan_progressive(req.messages)


@app.post("/api/assess/unified")
def assess_unified(req: UnifiedAssessmentRequest):
    """
    Unified Multi-Vector Pre-Payment Assessment (Module C & F).
    Fuses Behavioral ML, Conversation Intelligence, Intent Correlation,
    TypeSafe AI Jev Decision Engine, and Deterministic Guardrails.
    """
    result = unified_assessment_service.evaluate(req)

    # Store in audit trail for unified transaction history and reporting
    audit_entry = {
        "id": result.id,
        "timestamp": result.timestamp,
        "riskScore": result.final_risk_score,
        "riskLevel": result.final_risk_level.title(),
        "fraudCategory": result.primary_threat_category,
        "recommendedAction": result.recommended_action,
        "warnings": result.deterministic_warnings,
        "plainEnglishReasons": result.plain_english_reasons,
        "mlPrediction": {
            "fraudProbability": result.ml_probability,
            "isFraud": result.ml_decision,
            "modelName": result.ml_model_name,
            "confidence": result.ml_confidence,
            "topRiskFactors": result.ml_top_risk_factors,
            "topProtectiveFactors": result.ml_top_protective_factors,
        },
        "conversationAnalysis": {
            "intent": result.conversation_intent,
            "contextRiskScore": result.conversation_risk_score,
            "signals": [s.model_dump() for s in result.conversation_signals],
        } if result.has_conversation_context else None,
        "correlation": {
            **result.correlation.model_dump(),
            "relevanceCategory": result.correlation.relevance_category,
            "correlationSummary": result.correlation.correlation_summary,
            "amountMatched": result.correlation.amount_matched,
            "recipientMatched": result.correlation.recipient_matched,
            "actionConflict": result.correlation.action_conflict,
            "urgencyAligned": result.correlation.urgency_aligned,
            "correlationScore": result.correlation.correlation_score,
        } if result.correlation else None,
        "jevDecision": {
            **result.jev_decision.model_dump(),
            "threatSeverity": result.jev_decision.threat_severity,
            "recommendedAction": result.jev_decision.recommended_action,
            "conflictingSignalsDetected": result.jev_decision.conflicting_signals_detected,
            "isFallback": result.jev_decision.is_fallback,
            "note": result.jev_decision.note,
        } if result.jev_decision else None,
        "recommendations": [
            "DO NOT enter your UPI PIN or authorize funds. This pattern indicates social engineering coercion."
            if result.final_risk_score >= 70
            else "Verify beneficiary identity independently using bank or merchant customer care.",
            "Never install remote screen-sharing tools (AnyDesk, TeamViewer) at caller's request.",
            "Remember: UPI PIN is strictly an outgoing debit PIN, never required to receive money or refunds.",
        ],
        "paymentDetails": {
            "amount": req.amount,
            "recipientId": req.recipientId,
            "paymentChannel": req.paymentChannel,
            "paymentPurpose": req.paymentPurpose,
        },
        "source": "unified_hybrid_intelligence_engine",
        "disclaimer": result.explanation_summary,
    }
    _append_audit_record(audit_entry)
    return result


@app.post("/api/scan/screenshot", response_model=ScreenshotOCRAnalysisResponse)
async def scan_screenshot(
    file: UploadFile = File(...),
    user_consent: bool = Form(True),
    amount: Optional[float] = Form(None),
    recipient_vpa: Optional[str] = Form(None),
    payment_purpose: Optional[str] = Form("merchant_payment"),
):
    """
    Privacy-preserving in-memory screenshot OCR and threat intelligence scanner.
    Analyzes WhatsApp chats, SMS alerts, fake collect requests, and QR screenshots.
    Reuses conversation_engine and unified_assessment_service.
    """
    if not user_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit user consent is required before processing screenshot data.",
        )

    try:
        image_bytes = await file.read()
        ocr_result = ocr_service.process_screenshot(
            image_bytes=image_bytes, filename=file.filename or "screenshot.png"
        )
    except FileSizeLimitExceededError as e:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(e))
    except InvalidImageFormatError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}",
        )

    extracted_text = ocr_result["extracted_text"]
    entities_dict = ocr_result["entities"]

    # Run conversation intelligence engine on extracted text
    scan_text = extracted_text if extracted_text.strip() else "Empty screenshot with no text detected."
    context_res = conversation_engine.analyze(scan_text)

    # Correlate with transaction if details provided
    unified_res = None
    transaction_assessed = False

    eval_amount = amount
    if eval_amount is None and entities_dict.get("currency_amounts"):
        eval_amount = entities_dict["currency_amounts"][0]

    eval_recipient = recipient_vpa
    if not eval_recipient and entities_dict.get("upi_ids"):
        eval_recipient = entities_dict["upi_ids"][0]

    if eval_amount is not None and eval_recipient:
        try:
            req = UnifiedAssessmentRequest(
                amount=float(eval_amount),
                recipientId=str(eval_recipient),
                paymentPurpose=payment_purpose or "merchant_payment",
                conversationText=extracted_text,
            )
            unified_res = unified_assessment_service.assess(req)
            transaction_assessed = True
        except Exception:
            pass

    return ScreenshotOCRAnalysisResponse(
        extracted_text=extracted_text,
        ocr_engine=ocr_result["ocr_engine"],
        average_confidence=ocr_result["average_confidence"],
        line_count=ocr_result["line_count"],
        is_blurry=ocr_result["is_blurry"],
        blur_score=ocr_result["blur_score"],
        warning_notes=ocr_result["warning_notes"],
        entities=ScreenshotEntities(**entities_dict),
        context_analysis=context_res.model_dump() if hasattr(context_res, "model_dump") else context_res.dict(),
        unified_assessment=unified_res.model_dump() if (unified_res and hasattr(unified_res, "model_dump")) else (unified_res.dict() if unified_res else None),
        transaction_ml_assessed=transaction_assessed,
        privacy_notice=ocr_result["privacy_notice"],
    )


@app.post("/api/scan/screenshot-text", response_model=ScreenshotOCRAnalysisResponse)
def reanalyze_screenshot_text(req: ScreenshotTextAnalysisRequest):
    """
    Re-analyzes user-edited screenshot text after manual review or correction.
    """
    entities_dict = ocr_service.extract_entities(req.text)
    context_res = conversation_engine.analyze(req.text)

    unified_res = None
    transaction_assessed = False

    eval_amount = req.amount
    if eval_amount is None and entities_dict.get("currency_amounts"):
        eval_amount = entities_dict["currency_amounts"][0]

    eval_recipient = req.recipient_vpa
    if not eval_recipient and entities_dict.get("upi_ids"):
        eval_recipient = entities_dict["upi_ids"][0]

    if eval_amount is not None and eval_recipient:
        try:
            u_req = UnifiedAssessmentRequest(
                amount=float(eval_amount),
                recipientId=str(eval_recipient),
                paymentPurpose=req.payment_purpose or "merchant_payment",
                conversationText=req.text,
            )
            unified_res = unified_assessment_service.assess(u_req)
            transaction_assessed = True
        except Exception:
            pass

    return ScreenshotOCRAnalysisResponse(
        extracted_text=req.text,
        ocr_engine="User Edited (Manual Verification)",
        average_confidence=1.0,
        line_count=len([l for l in req.text.splitlines() if l.strip()]),
        is_blurry=False,
        blur_score=100.0,
        warning_notes=[],
        entities=ScreenshotEntities(**entities_dict),
        context_analysis=context_res.model_dump() if hasattr(context_res, "model_dump") else context_res.dict(),
        unified_assessment=unified_res.model_dump() if (unified_res and hasattr(unified_res, "model_dump")) else (unified_res.dict() if unified_res else None),
        transaction_ml_assessed=transaction_assessed,
        privacy_notice="Screenshot text processed strictly in-memory.",
    )


@app.get("/api/jev/status")
def get_jev_status():
    """Returns TypeSafe AI Jev API connection status and fallback indicator."""
    configured = jev_client.is_configured()
    return {
        "configured": configured,
        "provider": "TypeSafe AI - Jev",
        "model": "jev-latest",
        "status": "connected" if configured else "pending_credentials",
        "fallbackActive": not configured,
        "decisionEndpoint": "/v1/decide",
        "supportedDecisionTypes": ["choice", "noul", "score"],
        "note": "TypeSafe AI Jev endpoint active." if configured else "Jev credentials pending. Operating via local deterministic decision triage fallback.",
    }


@app.get("/api/assessments/{assessment_id}")
def get_assessment(assessment_id: str):
    for a in audit_store:
        if a["id"] == assessment_id:
            return a
    raise HTTPException(status_code=404, detail="Assessment not found")


@app.get("/api/transactions")
def get_transactions(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    riskLevel: Optional[str] = None,
):
    items = audit_store
    if riskLevel and riskLevel != "ALL":
        items = [i for i in items if i.get("riskLevel") == riskLevel]
    if search:
        s = search.lower()
        items = [
            i for i in items
            if s in str(i.get("paymentDetails", {}).get("recipientId", "")).lower()
            or s in str(i.get("paymentDetails", {}).get("paymentPurpose", "")).lower()
            or s in str(i.get("conversationExcerpt", "")).lower()
            or s in str(i.get("fraudCategory", "")).lower()
        ]

    start = (page - 1) * perPage
    end = start + perPage
    return {
        "transactions": items[start:end],
        "total": len(items),
        "page": page,
        "perPage": perPage,
    }


@app.get("/api/analytics")
def get_analytics():
    test_eval = ml_service.metadata.get("test_evaluation", {})
    return {
        "totalAssessments": len(audit_store),
        "datasetRows": 100000,
        "fraudPrevalence": 0.15,
        "modelAUC": test_eval.get("roc_auc", 0.9712),
        "modelPRAUC": test_eval.get("pr_auc", 0.9312),
        "modelF1": test_eval.get("f1", 0.8658),
        "modelName": ml_service.metadata.get("model_name", "HistGradientBoosting"),
        "scamTypologiesTracked": 10,
    }


@app.post("/api/reports")
def submit_report(report: ScamReportRequest):
    data = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    data["id"] = str(uuid.uuid4())
    data["createdAt"] = datetime.now(timezone.utc).isoformat()
    _append_scam_report(data)
    return data
