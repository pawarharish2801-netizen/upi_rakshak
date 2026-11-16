"""
UPI Rakshak - Unified Pre-Payment Risk Assessment Service
Orchestrates ML Inference, Conversation Intelligence, Intent Correlation,
TypeSafe AI Jev Decision Engine, and Multi-Vector Fusion into a unified verdict.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

try:
    from app.ml_service import ml_service, MLPredictionInput
    from app.context.schemas import (
        UnifiedAssessmentRequest,
        UnifiedAssessmentResponse,
        PaymentIntentInfo,
    )
    from app.context.conversation_intelligence import conversation_engine
    from app.context.intent_correlation import correlation_engine
    from app.context.jev_client import jev_client
    from app.context.fusion_engine import fusion_engine
except ImportError:
    from backend.app.ml_service import ml_service, MLPredictionInput
    from backend.app.context.schemas import (
        UnifiedAssessmentRequest,
        UnifiedAssessmentResponse,
        PaymentIntentInfo,
    )
    from backend.app.context.conversation_intelligence import conversation_engine
    from backend.app.context.intent_correlation import correlation_engine
    from backend.app.context.jev_client import jev_client
    from backend.app.context.fusion_engine import fusion_engine


class UnifiedAssessmentService:
    """
    Coordinates end-to-end multi-vector evaluation across:
    1. Tabular Behavioral ML Classifier (HistGradientBoosting)
    2. Conversational Intent & Relational Threat Scanner
    3. Payment-Context Correlation Engine
    4. TypeSafe AI Jev Decision Intelligence (with identified fallback)
    5. Deterministic Guardrail Enforcement
    """

    def assess(self, req: UnifiedAssessmentRequest) -> UnifiedAssessmentResponse:
        return self.evaluate(req)

    def evaluate(self, req: UnifiedAssessmentRequest) -> UnifiedAssessmentResponse:
        record_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Prepare ML Prediction Input
        ml_input = MLPredictionInput(
            amount=req.amount,
            recipientId=req.recipientId,
            paymentChannel=req.paymentChannel,
            paymentPurpose=req.paymentPurpose,
            recipientVerification=req.recipientVerification,
            isFirstTimeRecipient=req.isFirstTimeRecipient,
            urgency=req.urgency,
            refundClaim=req.refundClaim,
            impersonation=req.impersonation,
            pinToReceive=req.pinToReceive,
            suspiciousLink=req.suspiciousLink,
            screenSharing=req.screenSharing,
            callerAuthority=req.callerAuthority,
            unsolicitedContact=req.unsolicitedContact,
            secrecyRequested=req.secrecyRequested,
            emotionalPressure=req.emotionalPressure,
            callInProgress=req.callInProgress,
            qrMismatch=req.qrMismatch,
            collectUnsolicited=req.collectUnsolicited,
        )

        ml_result = ml_service.predict(ml_input)

        # 2. Evaluate Conversation Context
        conversation_text = req.conversationText or ""
        if not conversation_text and req.conversationMessages:
            conversation_text = " \n".join(m.text for m in req.conversationMessages)

        conv_analysis = None
        has_conv = bool(conversation_text and conversation_text.strip())
        if has_conv:
            conv_analysis = conversation_engine.analyze(conversation_text)

        # 3. Correlate Payment Intent with Context
        payment_info = PaymentIntentInfo(
            amount=req.amount,
            recipient_vpa=req.recipientId,
            payment_purpose=req.paymentPurpose,
            payment_channel=req.paymentChannel,
            recipient_verification=req.recipientVerification,
            transaction_note=req.transactionNote,
        )

        correlation = correlation_engine.correlate(conv_analysis, payment_info)

        # 4. Multi-Vector Fusion
        (
            final_risk_score,
            final_risk_level,
            recommended_action,
            hard_stop,
            rule_warnings,
            plain_reasons,
        ) = fusion_engine.fuse(ml_result, conv_analysis, correlation, req)

        # 5. TypeSafe AI Jev Decision Intelligence
        hard_stop_flags = {
            "pin_to_receive": req.pinToReceive or (conv_analysis and any(s.category == "PIN_TO_RECEIVE" for s in conv_analysis.signals)),
            "screen_sharing": req.screenSharing or (conv_analysis and any(s.category == "REMOTE_ACCESS" for s in conv_analysis.signals)),
            "digital_arrest": (req.callerAuthority and req.secrecyRequested) or (conv_analysis and any(s.category == "DIGITAL_ARREST" for s in conv_analysis.signals)),
            "action_conflict": correlation.action_conflict,
        }

        evidence_summary = (
            f"Primary typology: {conv_analysis.scam_category if conv_analysis else 'None'}. "
            f"Correlation: {correlation.correlation_summary}. "
            f"Rule warnings: {', '.join(rule_warnings) if rule_warnings else 'Clean'}."
        )

        jev_decision = jev_client.evaluate_decision(
            ml_probability=ml_result["fraudProbability"],
            context_score=conv_analysis.context_risk_score if conv_analysis else 0,
            correlation_score=correlation.correlation_score,
            evidence_summary=evidence_summary,
            hard_stop_flags=hard_stop_flags,
        )

        # Determine primary threat category
        if hard_stop:
            if hard_stop_flags["pin_to_receive"]:
                primary_cat = "Fake_Refund"
            elif hard_stop_flags["digital_arrest"]:
                primary_cat = "Digital_Arrest"
            elif hard_stop_flags["screen_sharing"]:
                primary_cat = "Screen_Sharing_Scam"
            else:
                primary_cat = "Suspicious_Activity"
        elif conv_analysis and conv_analysis.scam_category != "Legitimate":
            primary_cat = conv_analysis.scam_category
        elif ml_result["isFraud"]:
            primary_cat = "Behavioral_Anomaly_Fraud"
        else:
            primary_cat = "Legitimate"

        explanation_summary = (
            f"Risk Level: {final_level if 'final_level' in locals() else final_risk_level} ({final_risk_score}/100). "
            f"{'CRITICAL HARD STOP: Safety rule violation enforces transaction halt. ' if hard_stop else ''}"
            f"Statistical ML estimated {ml_result['fraudProbability'] * 100:.1f}% anomaly probability. "
            f"{'Conversation exhibited ' + conv_analysis.intent + '. ' if conv_analysis and conv_analysis.signals else ''}"
            f"{correlation.correlation_summary}"
        )

        return UnifiedAssessmentResponse(
            id=record_id,
            timestamp=now_iso,
            final_risk_score=final_risk_score,
            final_risk_level=final_risk_level,
            recommended_action=recommended_action,
            primary_threat_category=primary_cat,
            explanation_summary=explanation_summary,
            ml_probability=ml_result["fraudProbability"],
            ml_decision=ml_result["isFraud"],
            ml_risk_level=ml_result["riskLevel"],
            ml_model_name=ml_result["modelName"],
            ml_confidence=ml_result["confidence"],
            ml_top_risk_factors=ml_result["topRiskFactors"],
            ml_top_protective_factors=ml_result["topProtectiveFactors"],
            conversation_risk_score=conv_analysis.context_risk_score if conv_analysis else 0,
            conversation_intent=conv_analysis.intent if conv_analysis else None,
            conversation_signals=conv_analysis.signals if conv_analysis else [],
            has_conversation_context=has_conv,
            correlation=correlation,
            jev_decision=jev_decision,
            hard_stop_triggered=hard_stop,
            deterministic_warnings=rule_warnings,
            plain_english_reasons=plain_reasons,
        )


# Global singleton
unified_assessment_service = UnifiedAssessmentService()

