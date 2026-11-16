"""
UPI Rakshak - Module D: Jev Structured Decision Intelligence Client
Integrates with TypeSafe AI's Jev typed decision endpoint (/v1/decide)
with strict schema validation, deterministic guardrail supremacy, and a transparent fallback.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import httpx
try:
    from app.context.schemas import JevDecisionResponse
except ImportError:
    from backend.app.context.schemas import JevDecisionResponse

logger = logging.getLogger("upi_rakshak.jev_client")

TYPESAFE_API_KEY = os.getenv("TYPESAFE_API_KEY") or os.getenv("JEV_API_KEY")
JEV_API_URL = os.getenv("JEV_API_URL", "https://api.typesafe.ai/v1/decide")
JEV_MODEL = "jev-latest"
TIMEOUT_SECONDS = 3.5


class JevDecisionClient:
    """
    Communicates with TypeSafe AI's Jev System One decision engine.
    If API key is missing, network fails, or response is invalid,
    it gracefully hands off to the local Fallback Decision Engine.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or TYPESAFE_API_KEY

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 8)

    def evaluate_decision(
        self,
        ml_probability: float,
        context_score: int,
        correlation_score: float,
        evidence_summary: str,
        hard_stop_flags: Dict[str, bool],
    ) -> JevDecisionResponse:
        """
        Submits structured application state to Jev's /v1/decide endpoint.
        Returns a validated JevDecisionResponse.
        """
        # 1. If no credentials, execute identified fallback
        if not self.is_configured():
            return self._run_fallback_decision(
                ml_probability=ml_probability,
                context_score=context_score,
                correlation_score=correlation_score,
                evidence_summary=evidence_summary,
                hard_stop_flags=hard_stop_flags,
                status="pending_credentials",
                note="TypeSafe AI API key (TYPESAFE_API_KEY) not configured. Operating through verified local decision engine without fabricating remote Jev outputs.",
            )

        # 2. Construct Jev Typed Request Payload conforming to TypeSafe AI schema
        state_payload = (
            f"TRANSACTION RISK EVIDENCE:\n"
            f"- ML Fraud Probability: {ml_probability:.4f}\n"
            f"- Conversation Context Risk: {context_score}/100\n"
            f"- Payment-Context Correlation: {correlation_score:.2f}\n"
            f"- Critical Safety Triggers: {json.dumps(hard_stop_flags)}\n"
            f"- Contextual Evidence: {evidence_summary}\n"
        )

        jev_request = {
            "model": JEV_MODEL,
            "state": state_payload,
            "questions": {
                "threat_severity": {
                    "type": "choice",
                    "instructions": "Select the threat severity of this transaction scenario based on the provided evidence.",
                    "choices": ["BENIGN", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
                },
                "is_fraud_suspected": {
                    "type": "noul",
                    "instructions": "Determine whether this transaction interaction constitutes fraud or deception.",
                },
                "has_conflicting_signals": {
                    "type": "noul",
                    "instructions": "Determine whether there are contradictory signals between the claims made and the transaction parameters.",
                },
            },
        }

        # 3. Dispatch to Jev endpoint with strict timeout
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "UPI-Rakshak-Security-Engine/2.5.0",
        }

        try:
            with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
                res = client.post(JEV_API_URL, json=jev_request, headers=headers)

            if res.status_code == 200:
                raw_json = res.json()
                return self._parse_and_validate_jev_response(
                    raw_json, hard_stop_flags, ml_probability, context_score, correlation_score, evidence_summary
                )
            else:
                logger.warning(f"Jev API returned HTTP {res.status_code}: {res.text}")
                return self._run_fallback_decision(
                    ml_probability, context_score, correlation_score, evidence_summary, hard_stop_flags,
                    status="error_fallback",
                    note=f"Jev API returned HTTP {res.status_code}. Fallback decision engine engaged.",
                )
        except httpx.TimeoutException:
            logger.warning("Jev API request timed out. Executing fast fallback.")
            return self._run_fallback_decision(
                ml_probability, context_score, correlation_score, evidence_summary, hard_stop_flags,
                status="timeout_fallback",
                note="Jev API request timed out (>3.5s). Local decision engine engaged for continuous uptime.",
            )
        except Exception as e:
            logger.error(f"Jev connection exception: {e}")
            return self._run_fallback_decision(
                ml_probability, context_score, correlation_score, evidence_summary, hard_stop_flags,
                status="error_fallback",
                note=f"Jev connection failed: {str(e)}. Fallback decision engine engaged.",
            )

    def _parse_and_validate_jev_response(
        self,
        raw_json: Dict[str, Any],
        hard_stop_flags: Dict[str, bool],
        ml_probability: float = 0.5,
        context_score: int = 50,
        correlation_score: float = 0.5,
        evidence_summary: str = "Jev parsing fallback",
    ) -> JevDecisionResponse:
        """Strict validation of typed Jev response schema."""
        try:
            # Enforce required decision fields presence
            if not isinstance(raw_json, dict) or ("threat_severity" not in raw_json and "is_fraud_suspected" not in raw_json):
                raise ValueError("Malformed Jev response: Missing expected question outputs from /v1/decide")

            # Validate question response shapes
            threat_sev = raw_json.get("threat_severity", {}).get("choice", "MEDIUM")
            if threat_sev not in ["BENIGN", "LOW", "MEDIUM", "HIGH", "CRITICAL"]:
                threat_sev = "MEDIUM"

            fraud_prob = float(raw_json.get("is_fraud_suspected", {}).get("noul", 0.5))
            has_conflicts = bool(raw_json.get("has_conflicting_signals", {}).get("noul", 0.0) >= 0.5)

            # Enforce hard-stop rules supremacy over model advice
            if any(hard_stop_flags.values()):
                threat_sev = "CRITICAL"
                action = "STOP_PAYMENT_AND_INVESTIGATE"
            elif threat_sev in ["CRITICAL", "HIGH"] or fraud_prob >= 0.70:
                action = "DO_NOT_PROCEED_WITHOUT_VERIFICATION"
            elif threat_sev == "MEDIUM":
                action = "VERIFY_BENEFICIARY_INDEPENDENTLY"
            else:
                action = "PROCEED_WITH_CAUTION"

            return JevDecisionResponse(
                status="connected",
                provider="TypeSafe AI - Jev",
                model=JEV_MODEL,
                decision_type="structured_threat_triage",
                threat_severity=threat_sev,
                is_fraud_suspected=fraud_prob >= 0.5,
                confidence=round(max(fraud_prob, 1.0 - fraud_prob), 4),
                confidence_calibrated=True,
                recommended_action=action,
                conflicting_signals_detected=has_conflicts,
                conflict_notes="Jev verified cross-vector inconsistencies in transaction narrative." if has_conflicts else None,
                is_fallback=False,
                note="Authentic decision produced by TypeSafe AI Jev decision API.",
            )
        except Exception as e:
            logger.warning(f"Jev response validation failed: {e}. Falling back.")
            return self._run_fallback_decision(
                ml_probability, context_score, correlation_score, evidence_summary, hard_stop_flags,
                status="error_fallback",
                note=f"Jev response failed strict validation ({str(e)}). Fallback decision engine engaged.",
            )

    def _run_fallback_decision(
        self,
        ml_probability: float,
        context_score: int,
        correlation_score: float,
        evidence_summary: str,
        hard_stop_flags: Dict[str, bool],
        status: str,
        note: str,
    ) -> JevDecisionResponse:
        """
        Deterministic local decision triage engine when Jev API is unconfigured,
        unreachable, or timed out.
        """
        # Signal conflict detection: e.g. low/moderate ML probability on payment details but severe conversational threat,
        # or wide divergence between tabular behavioral signals and conversational intent
        ml_high = ml_probability >= 0.80
        ml_low = ml_probability <= 0.70
        ctx_high = (context_score >= 75) or any(hard_stop_flags.values())
        ctx_low = context_score <= 30
        divergence = abs(ml_probability - (context_score / 100.0)) >= 0.25
        conflict = bool(
            (ml_low and ctx_high) or
            (ml_high and ctx_low) or
            (divergence and (context_score > 0 or any(hard_stop_flags.values())))
        )

        # Hard stop check
        if any(hard_stop_flags.values()):
            severity = "CRITICAL"
            action = "STOP_PAYMENT_AND_INVESTIGATE"
            is_fraud = True
            conf = 0.99
        else:
            # Composite decision logic
            composite_metric = (ml_probability * 0.45) + ((context_score / 100.0) * 0.35) + (correlation_score * 0.20)

            if composite_metric >= 0.75:
                severity = "CRITICAL"
                action = "STOP_PAYMENT_AND_INVESTIGATE"
                is_fraud = True
                conf = 0.95
            elif composite_metric >= 0.50:
                severity = "HIGH"
                action = "DO_NOT_PROCEED_WITHOUT_VERIFICATION"
                is_fraud = True
                conf = 0.88
            elif composite_metric >= 0.25:
                severity = "MEDIUM"
                action = "VERIFY_BENEFICIARY_INDEPENDENTLY"
                is_fraud = False
                conf = 0.75
            else:
                severity = "LOW"
                action = "PROCEED_WITH_CAUTION"
                is_fraud = False
                conf = 0.92

        return JevDecisionResponse(
            status=status,
            provider="TypeSafe AI - Jev (Deterministic Fallback)",
            model="jev-fallback-rule-engine",
            decision_type="structured_threat_triage",
            threat_severity=severity,
            is_fraud_suspected=is_fraud,
            confidence=conf,
            confidence_calibrated=False,
            recommended_action=action,
            conflicting_signals_detected=conflict,
            conflict_notes="Divergence detected between statistical ML payment risk and social engineering context." if conflict else None,
            is_fallback=True,
            note=note,
        )


# Global singleton
jev_client = JevDecisionClient()
