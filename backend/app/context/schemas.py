"""
UPI Rakshak - Context Intelligence & Hybrid Decision Schemas
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class ScamSignal(BaseModel):
    id: str
    category: str
    label: str
    evidence: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    weight: float = Field(..., ge=0.0, le=100.0)
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    reason: Optional[str] = None


class ConversationAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000, description="Message or conversation text to scan")
    sender_role: Optional[str] = Field("counterparty", description="Role of sender: counterparty, user, or educational")


class ConversationAnalysisResult(BaseModel):
    intent: str
    scam_category: str
    language: str = "en"
    context_risk_score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_educational_or_benign: bool = False
    signals: List[ScamSignal] = []
    evidence_snippets: List[str] = []
    relationship_detected: Optional[str] = None
    extracted_amounts: List[float] = []
    extracted_entities: List[str] = []
    explanation: str


class ProgressiveMessageInput(BaseModel):
    id: str = Field(..., max_length=64)
    sender: str = Field("caller", max_length=32)
    text: str = Field(..., min_length=1, max_length=4000)
    timestamp: Optional[str] = Field(None, max_length=64)


class ProgressiveScanRequest(BaseModel):
    messages: List[ProgressiveMessageInput] = Field(..., min_length=1, max_length=50)


class ProgressiveScanStep(BaseModel):
    message_id: str
    message_text: str
    sender: str
    step_risk_score: int
    step_risk_level: str
    new_signals: List[ScamSignal]
    cumulative_signals: List[ScamSignal]
    threat_trajectory: Literal["ESCALATING", "STABLE", "DE-ESCALATING"]


class ProgressiveScanResponse(BaseModel):
    total_messages: int
    current_risk_score: int
    current_risk_level: str
    primary_scam_category: str
    threat_trajectory: str
    steps: List[ProgressiveScanStep]
    final_analysis: ConversationAnalysisResult


class PaymentIntentInfo(BaseModel):
    amount: float = Field(..., ge=0.0)
    recipient_vpa: str
    recipient_name: Optional[str] = None
    payment_purpose: str = "merchant_payment"
    payment_channel: str = "UPI_ID_Manual"
    recipient_verification: str = "Bank_Name_Verified"
    transaction_note: Optional[str] = None


class CorrelationResult(BaseModel):
    correlation_score: float = Field(..., ge=0.0, le=1.0)
    amount_matched: bool = False
    extracted_amount: Optional[float] = None
    amount_discrepancy: Optional[float] = None
    recipient_matched: bool = False
    purpose_matched: bool = False
    urgency_aligned: bool = False
    action_conflict: bool = False  # e.g. caller said 'receive refund' but transaction is an outgoing debit
    relevance_category: Literal["DIRECTLY_CORRELATED", "PARTIALLY_CORRELATED", "UNRELATED", "NO_CONVERSATION"]
    correlation_summary: str
    risk_multiplier: float = Field(1.0, ge=0.0, le=2.0)


class JevDecisionResponse(BaseModel):
    status: Literal["connected", "fallback_active", "pending_credentials", "timeout_fallback", "error_fallback"]
    provider: str = "TypeSafe AI - Jev"
    model: str = "jev-latest"
    decision_type: Literal["structured_threat_triage", "calibrated_classification"]
    threat_severity: Literal["BENIGN", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    is_fraud_suspected: bool
    confidence: float
    confidence_calibrated: bool = False
    recommended_action: str
    conflicting_signals_detected: bool = False
    conflict_notes: Optional[str] = None
    is_fallback: bool = True
    note: str


class UnifiedAssessmentRequest(BaseModel):
    # Payment parameters
    amount: float = Field(..., ge=0.0, le=100000.0, description="Amount in INR, capped at Rs 1,00,000")
    recipientId: str = Field(..., min_length=3, max_length=128)
    paymentChannel: str = Field("UPI_ID_Manual", max_length=64)
    paymentPurpose: str = Field("merchant_payment", max_length=64)
    recipientVerification: str = Field("Bank_Name_Verified", max_length=64)
    isFirstTimeRecipient: bool = True
    transactionNote: Optional[str] = Field(None, max_length=1000)

    # Contextual conversation
    conversationText: Optional[str] = Field(None, max_length=20000)
    conversationMessages: Optional[List[ProgressiveMessageInput]] = Field(None, max_length=50)

    # Situational flags (from UI toggles if selected)
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


class UnifiedAssessmentResponse(BaseModel):
    id: str
    timestamp: str
    final_risk_score: int = Field(..., ge=0, le=100)
    final_risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    recommended_action: Literal[
        "PROCEED_WITH_CAUTION",
        "VERIFY_BENEFICIARY_INDEPENDENTLY",
        "DO_NOT_PROCEED_WITHOUT_VERIFICATION",
        "STOP_PAYMENT_AND_INVESTIGATE"
    ]
    primary_threat_category: str
    explanation_summary: str

    # Sub-engines
    ml_probability: float
    ml_decision: bool
    ml_risk_level: str
    ml_model_name: str
    ml_confidence: float
    ml_top_risk_factors: List[Dict[str, Any]]
    ml_top_protective_factors: List[Dict[str, Any]]

    conversation_risk_score: int
    conversation_intent: Optional[str] = None
    conversation_signals: List[ScamSignal] = []
    has_conversation_context: bool = False

    correlation: Optional[CorrelationResult] = None
    jev_decision: JevDecisionResponse
    hard_stop_triggered: bool = False
    deterministic_warnings: List[str] = []
    plain_english_reasons: List[str] = []


class ScreenshotEntities(BaseModel):
    upi_ids: List[str] = Field(default_factory=list)
    phone_numbers: List[str] = Field(default_factory=list)
    currency_amounts: List[float] = Field(default_factory=list)
    urls: List[str] = Field(default_factory=list)
    dates_and_timestamps: List[str] = Field(default_factory=list)
    payment_instructions: List[str] = Field(default_factory=list)


class ScreenshotOCRAnalysisResponse(BaseModel):
    extracted_text: str
    ocr_engine: str
    average_confidence: float = Field(..., ge=0.0, le=1.0)
    line_count: int
    is_blurry: bool = False
    blur_score: float = 0.0
    warning_notes: List[str] = Field(default_factory=list)
    entities: ScreenshotEntities
    context_analysis: ConversationAnalysisResult
    unified_assessment: Optional[UnifiedAssessmentResponse] = None
    transaction_ml_assessed: bool = False
    privacy_notice: str = "Screenshot processed strictly in-memory. Zero disk persistence or long-term storage."


class ScreenshotTextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000, description="Edited or extracted screenshot text")
    amount: Optional[float] = Field(None, ge=0.0, le=100000.0)
    recipient_vpa: Optional[str] = Field(None, max_length=128)
    payment_purpose: Optional[str] = Field("merchant_payment", max_length=64)


