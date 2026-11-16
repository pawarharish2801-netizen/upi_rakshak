"""
UPI Rakshak - Module B: Payment-Intent Correlation Engine
Correlates conversational instructions with proposed financial transactions.
"""

from typing import Optional
try:
    from app.context.schemas import (
        ConversationAnalysisResult,
        PaymentIntentInfo,
        CorrelationResult,
    )
except ImportError:
    from backend.app.context.schemas import (
        ConversationAnalysisResult,
        PaymentIntentInfo,
        CorrelationResult,
    )


class IntentCorrelationEngine:
    """
    Evaluates semantic and numeric alignment between conversational instructions
    and the proposed UPI transaction to prevent false correlation while catching deception.
    """

    def correlate(
        self,
        analysis: Optional[ConversationAnalysisResult],
        payment: PaymentIntentInfo,
    ) -> CorrelationResult:
        if analysis is None or (not analysis.signals and not analysis.extracted_amounts and not analysis.extracted_entities):
            return CorrelationResult(
                correlation_score=0.0,
                amount_matched=False,
                recipient_matched=False,
                purpose_matched=False,
                urgency_aligned=False,
                action_conflict=False,
                relevance_category="NO_CONVERSATION",
                correlation_summary="No conversational context provided. Evaluation relies exclusively on transaction telemetry.",
                risk_multiplier=1.0,
            )

        correlation_points = 0.0
        reasons = []

        # 1. Amount matching
        amount_matched = False
        discrepancy = None
        matched_amt = None

        if analysis.extracted_amounts:
            # Check closest extracted amount
            closest = min(analysis.extracted_amounts, key=lambda x: abs(x - payment.amount))
            diff = abs(closest - payment.amount)
            pct_diff = diff / max(payment.amount, 1.0)

            if diff < 1.0 or pct_diff < 0.02:
                amount_matched = True
                matched_amt = closest
                correlation_points += 0.40
                reasons.append(f"Transaction amount ₹{payment.amount:,.2f} exactly matches demand in conversation (₹{closest:,.2f}).")
            elif pct_diff < 0.15:
                amount_matched = True
                matched_amt = closest
                discrepancy = diff
                correlation_points += 0.25
                reasons.append(f"Transaction amount ₹{payment.amount:,.2f} closely aligns with requested sum ₹{closest:,.2f}.")
            else:
                discrepancy = diff
                reasons.append(f"Conversation mentions ₹{closest:,.2f}, differing from transaction amount ₹{payment.amount:,.2f}.")

        # 2. Recipient Entity matching
        recipient_matched = False
        vpa_lower = payment.recipient_vpa.lower()
        for ent in analysis.extracted_entities:
            ent_lower = ent.lower()
            if ent_lower in vpa_lower:
                recipient_matched = True
                correlation_points += 0.30
                reasons.append(f"Beneficiary VPA handle '{payment.recipient_vpa}' matches entity '{ent}' mentioned in conversation.")
                break

        # 3. Purpose Alignment
        purpose_matched = False
        scam_cat = analysis.scam_category.lower()
        purpose = payment.payment_purpose.lower()

        purpose_correlations = [
            ("refund", ["refund_claim", "cashback", "service_fee"]),
            ("arrest", ["fine_or_penalty", "other"]),
            ("kyc", ["kyc_update", "service_fee", "bill_payment"]),
            ("investment", ["investment"]),
            ("job", ["registration_fee", "service_fee"]),
        ]

        for s_key, p_list in purpose_correlations:
            if s_key in scam_cat and any(p in purpose for p in p_list):
                purpose_matched = True
                correlation_points += 0.25
                reasons.append(f"Payment purpose '{payment.payment_purpose}' directly aligns with coercive topic '{analysis.scam_category}'.")
                break

        # 4. Action Conflict (Severe Red Flag in UPI Scams)
        # Caller claims user will receive money / refund, but transaction is an outbound debit or collect request
        action_conflict = False
        claims_receiving = any(
            s.category in ["PIN_TO_RECEIVE", "REFUND_MANIPULATION", "QR_MANIPULATION"]
            for s in analysis.signals
        )
        if claims_receiving:
            action_conflict = True
            correlation_points += 0.35
            reasons.append("CRITICAL ACTION CONFLICT: Dialogue frames this transaction as receiving funds/refund, but payment will debit your bank account.")

        # 5. Urgency Alignment
        urgency_aligned = any(s.category == "FEAR_URGENCY" for s in analysis.signals)
        if urgency_aligned:
            correlation_points += 0.15
            reasons.append("Artificial deadline in conversation directly pressures immediate payment approval.")

        # Normalize score
        final_corr = min(1.0, round(correlation_points, 2))

        # Categorize Relevance
        if final_corr >= 0.50 or action_conflict:
            rel_cat = "DIRECTLY_CORRELATED"
            mult = 1.40 if action_conflict else 1.25
            summary = "Direct causal link verified between conversation demands and proposed payment. Risk is heavily amplified."
        elif final_corr >= 0.20:
            rel_cat = "PARTIALLY_CORRELATED"
            mult = 1.10
            summary = "Partial topical overlap observed between chat context and transaction attributes."
        else:
            rel_cat = "UNRELATED"
            mult = 0.90
            summary = "Conversation text appears largely unrelated to this specific transaction. Disregarding unrelated conversational noise."

        if reasons:
            summary += " " + " ".join(reasons)

        return CorrelationResult(
            correlation_score=final_corr,
            amount_matched=amount_matched,
            extracted_amount=matched_amt,
            amount_discrepancy=discrepancy,
            recipient_matched=recipient_matched,
            purpose_matched=purpose_matched,
            urgency_aligned=urgency_aligned,
            action_conflict=action_conflict,
            relevance_category=rel_cat,
            correlation_summary=summary,
            risk_multiplier=mult,
        )


# Global singleton
correlation_engine = IntentCorrelationEngine()

