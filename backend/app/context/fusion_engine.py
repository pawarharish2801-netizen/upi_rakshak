"""
UPI Rakshak - Module C: Multi-Vector ML + Context Fusion Engine
Fuses Statistical ML Telemetry, Conversation Intelligence, Payment Correlation,
and Deterministic Safety Guardrails into an explainable pre-payment decision.
"""

from typing import Dict, Any, List, Optional, Tuple
try:
    from app.context.schemas import (
        ConversationAnalysisResult,
        CorrelationResult,
        UnifiedAssessmentRequest,
        PaymentIntentInfo,
    )
except ImportError:
    from backend.app.context.schemas import (
        ConversationAnalysisResult,
        CorrelationResult,
        UnifiedAssessmentRequest,
        PaymentIntentInfo,
    )


class MultiVectorFusionEngine:
    """
    Transparent, non-double-counting fusion engine uniting tabular ML probabilities
    with conversational NLP semantics, recipient graph signals, and deterministic guardrails.
    """

    def fuse(
        self,
        ml_result: Dict[str, Any],
        conversation_result: Optional[ConversationAnalysisResult],
        correlation_result: Optional[CorrelationResult],
        req: UnifiedAssessmentRequest,
    ) -> Tuple[int, str, str, bool, List[str], List[str]]:
        """
        Computes final risk score (0-100), risk level, recommended action,
        hard-stop trigger status, rule warnings, and plain-English reasons.
        """
        rule_warnings: List[str] = []
        plain_reasons: List[str] = []

        # 1. Hard-Stop Deterministic Guardrails (Supremacy Rule)
        hard_stop = False
        has_pin_scam = (
            req.pinToReceive or
            (conversation_result and any(s.category == "PIN_TO_RECEIVE" for s in conversation_result.signals))
        )
        if has_pin_scam:
            hard_stop = True
            rule_warnings.append("CRITICAL GUARDRAIL VIOLATION: UPI PIN requested to receive funds or refund.")
            plain_reasons.append("1. UPI PINs are exclusively used to debit money from your account, never to receive or reverse funds.")

        has_screen_share = (
            req.screenSharing or
            (conversation_result and any(s.category == "REMOTE_ACCESS" for s in conversation_result.signals))
        )
        if has_screen_share:
            hard_stop = True
            rule_warnings.append("CRITICAL GUARDRAIL VIOLATION: Remote screen-sharing application requested (AnyDesk/TeamViewer signature).")
            plain_reasons.append("2. Remote access software allows attackers to view bank OTPs and seize control of your device.")

        has_authority_extortion = (
            (req.callerAuthority and req.secrecyRequested) or
            (conversation_result and any(s.category == "DIGITAL_ARREST" for s in conversation_result.signals))
        )
        if has_authority_extortion:
            hard_stop = True
            rule_warnings.append("CRITICAL GUARDRAIL VIOLATION: Coercive law enforcement / digital arrest impersonation detected.")
            plain_reasons.append("3. Police, CBI, and RBI never conduct 'digital arrests' over video calls or demand funds into clearing accounts.")

        has_qr_mismatch = (
            (req.paymentChannel == "QR_Scan" and req.qrMismatch) or
            (conversation_result and any(s.category == "QR_MANIPULATION" for s in conversation_result.signals))
        )
        if has_qr_mismatch:
            rule_warnings.append("HIGH GUARDRAIL ALERT: QR payee name mismatches claimed merchant identity.")
            plain_reasons.append("4. Counterfeit QR code detected directing payment to an unverified individual payee.")

        # Active Call Coercion Guardrail
        has_call_coercion = bool(req.callInProgress)
        if has_call_coercion:
            rule_warnings.append("ACTIVE CALL COERCION DETECTED: Transaction being executed during a live phone or video call. Scamsters frequently keep victims on call to manipulate, create panic, and isolate them from consulting family or bank.")
            plain_reasons.append("Active phone call detected during transaction: Scamsters often trick victims by keeping them on call. Hang up immediately and verify independently.")

        # Rapid Multiple Payments / Split Velocity Burst Guardrail
        has_rapid_multi_payments = bool(req.rapidMultiplePayments or (req.recentPaymentCount and req.recentPaymentCount > 1))
        if has_rapid_multi_payments:
            rule_warnings.append("RAPID MULTIPLE PAYMENTS DETECTED: Multiple consecutive payments initiated in one shot. Fraudsters commonly demand split payments in quick succession to evade single-transaction limits and drain accounts.")
            plain_reasons.append("Rapid multiple payments in one shot detected: Fraudsters instruct victims to send money in multiple back-to-back chunks. Stop and verify before sending more funds.")

        # 2. Extract Individual Vector Signals
        ml_prob = float(ml_result.get("fraudProbability", 0.0))
        ml_score = int(round(ml_prob * 100))

        has_conv = (
            conversation_result is not None and
            not conversation_result.is_educational_or_benign and
            (bool(conversation_result.signals) or bool(conversation_result.relationship_detected))
        )
        conv_score = conversation_result.context_risk_score if (conversation_result and has_conv) else 0

        # Recipient Risk Vector (0 to 100)
        recip_score = 0
        if req.recipientVerification == "Unverified":
            recip_score += 45
            rule_warnings.append("Recipient UPI handle identity is completely unverified in banking registry.")
        elif req.recipientVerification == "Name_Mismatch":
            recip_score += 65
            rule_warnings.append("Bank account holder name mismatches declared payee identity.")
        elif req.recipientVerification == "Bank_Name_Verified":
            recip_score += 15
        elif req.recipientVerification == "Verified_Merchant":
            recip_score += 0

        if req.isFirstTimeRecipient:
            recip_score += 25
            plain_reasons.append("Beneficiary is a first-time recipient with zero prior payment history.")
        recip_score = min(100, recip_score)

        # 3. Dynamic Weighting with Non-Double-Counting
        # If conversation is unrelated, heavily de-weight it to prevent noise inflation
        if not has_conv:
            # Missing conversation data path
            w_ml = 0.65
            w_conv = 0.00
            w_recip = 0.35
            plain_reasons.append(f"Risk evaluated via statistical behavioral ML model (Probability: {ml_prob * 100:.1f}%) and recipient integrity checks.")
        elif correlation_result and correlation_result.relevance_category == "UNRELATED":
            w_ml = 0.60
            w_conv = 0.10
            w_recip = 0.30
            plain_reasons.append("Conversation context was identified as unrelated to this payment and disregarded.")
        elif correlation_result and correlation_result.relevance_category == "DIRECTLY_CORRELATED":
            w_ml = 0.40
            w_conv = 0.40
            w_recip = 0.20
            plain_reasons.append(f"Direct causal alignment verified: {correlation_result.correlation_summary}")
        else:
            w_ml = 0.45
            w_conv = 0.30
            w_recip = 0.25

        base_fused = (ml_score * w_ml) + (conv_score * w_conv) + (recip_score * w_recip)

        # 4. Synergy & Corroboration Bonus
        synergy = 0.0
        if ml_score >= 60 and conv_score >= 60:
            synergy += 12.0  # Cross-vector reinforcement
        if correlation_result and correlation_result.action_conflict:
            synergy += 15.0  # Severe penalty for debit framed as credit
        if has_call_coercion and has_rapid_multi_payments:
            synergy += 25.0  # Compound active call + velocity burst penalty
            rule_warnings.append("CRITICAL COMPOUND RISK: Simultaneous live phone call and rapid consecutive payments detected. High probability of active extortion or digital coercion.")
        elif has_call_coercion:
            synergy += 8.0
        elif has_rapid_multi_payments:
            synergy += 8.0

        raw_final = base_fused + synergy

        # Compound active call + multiple payments in one shot elevates risk to Critical
        if has_call_coercion and has_rapid_multi_payments:
            raw_final = max(82.0, raw_final)

        # 5. Hard Stop Floor Enforcement
        if hard_stop:
            final_score = max(92, min(100, int(round(raw_final))))
        else:
            final_score = max(0, min(100, int(round(raw_final))))

        # 6. Risk Level & Recommended Action
        if final_score >= 80 or hard_stop:
            final_level = "CRITICAL"
            action = "STOP_PAYMENT_AND_INVESTIGATE"
        elif final_score >= 60:
            final_level = "HIGH"
            action = "DO_NOT_PROCEED_WITHOUT_VERIFICATION"
        elif final_score >= 30:
            final_level = "MEDIUM"
            action = "VERIFY_BENEFICIARY_INDEPENDENTLY"
        else:
            final_level = "LOW"
            action = "PROCEED_WITH_CAUTION"

        # Deduplicate reasons
        dedup_reasons = []
        for r in plain_reasons:
            if r not in dedup_reasons:
                dedup_reasons.append(r)

        return final_score, final_level, action, hard_stop, rule_warnings, dedup_reasons


# Global singleton
fusion_engine = MultiVectorFusionEngine()

