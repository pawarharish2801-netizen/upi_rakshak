"""
UPI Rakshak - Modular Machine Learning Prediction & Explainability Service
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

logger = logging.getLogger("upi_rakshak.ml_service")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(BASE_DIR, "ml")
MODEL_PATH = os.path.join(ML_DIR, "fraud_detector_model.joblib")
PREPROCESSOR_PATH = os.path.join(ML_DIR, "preprocessor.joblib")
EXPLAINER_PATH = os.path.join(ML_DIR, "shap_explainer.joblib")
METADATA_PATH = os.path.join(ML_DIR, "model_metadata.json")

# Human readable descriptions for feature factors
RISK_FEATURE_LABELS = {
    "screen_sharing_request": "Remote screen-sharing requested (AnyDesk/TeamViewer signature)",
    "pin_requested_to_receive": "UPI PIN requested to receive funds (deceptive mechanism)",
    "caller_claims_authority": "Impersonation of police, CBI, customs or bank authority",
    "secrecy_requested": "Coercive secrecy demanded (told not to alert anyone)",
    "emotional_pressure": "Intimidation, fear or psychological pressure applied",
    "recipient_unique_senders_24h": "Recipient exhibits high-volume fan-in from unique senders (mule account pattern)",
    "recipient_reputation_score": "Low recipient reputation and trust score in network registry",
    "recipient_prior_complaints": "Prior fraud complaints lodged against recipient handle",
    "recipient_account_age_days": "Recipient account is very newly registered (typical mule)",
    "amount_inr": "High transaction transfer amount",
    "is_first_time_recipient": "First-time payment to previously uncontacted recipient",
    "qr_merchant_mismatch": "QR payee title mismatches declared merchant identity",
    "collect_request_unsolicited": "Unsolicited incoming collect request",
    "social_engineering_risk_score": "High composite social-engineering manipulation score",
    "prior_txns_with_recipient": "Zero or few prior bilateral payment history",
    "amount_to_avg_ratio": "Spike in amount compared to 30-day sender average",
    "sender_txn_count_7d": "Out-of-pattern payment burst in 7-day window",
    "sender_txn_count_24h": "High frequency payment attempts in past 24 hours",
    "is_night_txn": "Late-night transaction timing",
    "call_in_progress": "Live call or voice interaction active during checkout",
    "urgency_indicator": "Artificial deadline / urgent countdown imposed",
    "refund_or_reward_claim": "Transaction framed as refund, prize or reward claim",
    "suspicious_link_indicator": "Originated from shortened or suspicious payment link",
    "unsolicited_contact": "Inbound unsolicited contact preceded payment",
    "recipient_account_type_Individual": "Payment routed to individual personal account rather than merchant",
    "payment_channel_Collect_Request": "Channel: Collect Request",
    "payment_channel_QR_Scan": "Channel: QR Scan",
    "payment_purpose_refund_claim": "Purpose: Refund Claim",
    "payment_purpose_fine_or_penalty": "Purpose: Fine or Penalty",
    "payment_purpose_investment": "Purpose: High-Yield Investment Claim",
    "recipient_verification_status_Unverified": "Unverified recipient handle",
    "recipient_verification_status_Name_Mismatch": "Bank name mismatch on recipient VPA",
}

PROTECTIVE_FEATURE_LABELS = {
    "recipient_reputation_score": "High recipient trust score and clean network standing",
    "recipient_prior_complaints": "Zero fraud complaints registered against recipient",
    "recipient_account_age_days": "Established recipient account tenure",
    "prior_txns_with_recipient": "History of verified prior bilateral transactions",
    "is_first_time_recipient": "Established payee with existing transaction relationship",
    "social_engineering_risk_score": "Absence of social engineering or coercion indicators",
    "amount_inr": "Typical transaction amount aligned with user budget",
    "amount_to_avg_ratio": "Amount closely matches historical 30-day average",
    "sender_txn_count_24h": "Normal transaction velocity in previous 24 hours",
    "sender_txn_count_7d": "Consistent spending pattern across previous 7 days",
    "recipient_verification_status_Verified_Merchant": "Officially verified merchant credential",
    "recipient_verification_status_Bank_Name_Verified": "Recipient identity verified by banking network",
    "recipient_verification_status_Saved_Contact": "Recipient is an existing saved contact",
    "recipient_account_type_Merchant": "Verified merchant commerce channel",
}


class MLPredictionInput(BaseModel):
    # Core payment attributes
    amount: float = Field(..., ge=0.0, description="Transfer amount in INR")
    recipientId: str = Field(..., min_length=3, description="Beneficiary UPI ID")
    paymentChannel: str = Field("UPI_ID_Manual", description="Channel used")
    paymentPurpose: str = Field("merchant_payment", description="Declared purpose")
    recipientVerification: str = Field("Bank_Name_Verified", description="Verification status")
    isFirstTimeRecipient: bool = True

    # Social engineering & behavioral indicators
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
    qrMismatch: bool = False
    collectUnsolicited: bool = False

    # Optional granular features if available
    hourOfDay: Optional[int] = Field(None, ge=0, le=23)
    dayOfWeek: Optional[int] = Field(None, ge=0, le=6)
    isNightTxn: Optional[bool] = None
    recipientReputationScore: Optional[float] = Field(None, ge=0.0, le=100.0)
    recipientPriorComplaints: Optional[int] = Field(None, ge=0)
    recipientAccountAgeDays: Optional[int] = Field(None, ge=0)
    recipientUniqueSenders24h: Optional[int] = Field(None, ge=0)
    senderAccountAgeDays: Optional[int] = Field(None, ge=0)
    senderAvgAmount30d: Optional[float] = Field(None, ge=0.0)
    senderTxnCount24h: Optional[int] = Field(None, ge=0)
    senderTxnCount7d: Optional[int] = Field(None, ge=0)
    priorTxnsWithRecipient: Optional[int] = Field(None, ge=0)
    senderAgeGroup: Optional[str] = "26-35"
    senderCityTier: Optional[str] = "Metro"
    recipientAccountType: Optional[str] = None


class MLPredictionResponse(BaseModel):
    predictionId: str
    timestamp: str
    modelName: str
    fraudProbability: float
    riskScore: int
    riskLevel: str
    isFraud: bool
    thresholdUsed: float
    confidence: float
    topRiskFactors: List[Dict[str, Any]]
    topProtectiveFactors: List[Dict[str, Any]]
    source: str = "machine_learning_pipeline"
    modelStatus: str = "active"


class MLService:
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.explainer = None
        self.metadata = {}
        self.is_loaded = False
        self.load_error: Optional[str] = None
        self.load_artifacts()

    def load_artifacts(self):
        """Loads model, preprocessor, SHAP explainer, and metadata."""
        try:
            if not os.path.exists(MODEL_PATH):
                raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
            if not os.path.exists(PREPROCESSOR_PATH):
                raise FileNotFoundError(f"Preprocessor file not found at {PREPROCESSOR_PATH}")
            if not os.path.exists(METADATA_PATH):
                raise FileNotFoundError(f"Metadata file not found at {METADATA_PATH}")

            self.model = joblib.load(MODEL_PATH)
            self.preprocessor = joblib.load(PREPROCESSOR_PATH)
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

            if os.path.exists(EXPLAINER_PATH):
                try:
                    self.explainer = joblib.load(EXPLAINER_PATH)
                except Exception as ex:
                    logger.warning(f"Could not load SHAP explainer: {ex}")
                    self.explainer = None

            self.is_loaded = True
            self.load_error = None
            logger.info(f"Loaded ML model '{self.metadata.get('model_name')}' successfully.")
        except Exception as e:
            self.is_loaded = False
            self.load_error = str(e)
            logger.error(f"Failed to load ML artifacts: {e}")

    def get_status(self) -> Dict[str, Any]:
        return {
            "loaded": self.is_loaded,
            "model_name": self.metadata.get("model_name"),
            "threshold": self.metadata.get("optimal_threshold"),
            "validation_auc": self.metadata.get("test_evaluation", {}).get("roc_auc"),
            "error": self.load_error,
        }

    def prepare_feature_row(self, req: MLPredictionInput) -> pd.DataFrame:
        """Converts incoming prediction input into the exact 38-feature vector."""
        now = datetime.now()
        defaults = self.metadata.get("feature_defaults", {})

        hour = req.hourOfDay if req.hourOfDay is not None else now.hour
        day_of_week = req.dayOfWeek if req.dayOfWeek is not None else now.weekday()
        is_weekend = 1 if day_of_week in [5, 6] else 0
        is_night = int(req.isNightTxn) if req.isNightTxn is not None else (1 if (hour >= 23 or hour < 6) else 0)

        # Inferred recipient account type
        if req.recipientAccountType:
            rec_acc_type = req.recipientAccountType
        elif req.recipientVerification == "Verified_Merchant":
            rec_acc_type = "Merchant"
        else:
            rec_acc_type = "Individual"

        # Baseline sender stats
        sender_avg = req.senderAvgAmount30d if req.senderAvgAmount30d is not None else float(defaults.get("sender_avg_amount_30d", 2500.0))
        amount_to_avg = req.amount / max(sender_avg, 1.0)

        # Baseline recipient reputation
        if req.recipientReputationScore is not None:
            rep_score = req.recipientReputationScore
        elif req.recipientVerification == "Verified_Merchant":
            rep_score = 92.0
        elif req.recipientVerification == "Bank_Name_Verified":
            rep_score = 78.0
        elif req.recipientVerification == "Saved_Contact":
            rep_score = 85.0
        elif req.recipientVerification == "Name_Mismatch":
            rep_score = 25.0
        else:
            rep_score = float(defaults.get("recipient_reputation_score", 65.0))

        # Baseline recipient prior complaints
        if req.recipientPriorComplaints is not None:
            prior_complaints = req.recipientPriorComplaints
        elif req.recipientVerification in ["Name_Mismatch", "Unverified"]:
            prior_complaints = 3
        else:
            prior_complaints = int(defaults.get("recipient_prior_complaints", 0))

        # Prior txns
        if req.priorTxnsWithRecipient is not None:
            prior_txns = req.priorTxnsWithRecipient
        else:
            prior_txns = 0 if req.isFirstTimeRecipient else 5

        # Social engineering risk score synthesis if not passed
        se_score = (
            int(req.callerAuthority) * 0.30
            + int(req.secrecyRequested) * 0.25
            + int(req.emotionalPressure) * 0.20
            + int(req.pinToReceive) * 0.35
            + int(req.screenSharing) * 0.30
            + int(req.urgency) * 0.15
            + int(req.refundClaim) * 0.15
            + int(req.unsolicitedContact) * 0.15
            + int(req.callInProgress) * 0.20
            + int(req.rapidMultiplePayments) * 0.25
        )
        se_score = min(1.0, max(0.0, float(se_score)))

        # Velocity indicator: multiple payments in one shot elevates 24h count
        default_count_24h = 6 if req.rapidMultiplePayments else defaults.get("sender_txn_count_24h", 2)

        row = {
            "amount_inr": float(req.amount),
            "hour_of_day": int(hour),
            "day_of_week": int(day_of_week),
            "is_weekend": int(is_weekend),
            "is_night_txn": int(is_night),
            "sender_account_age_days": int(req.senderAccountAgeDays if req.senderAccountAgeDays is not None else defaults.get("sender_account_age_days", 500)),
            "sender_avg_amount_30d": float(sender_avg),
            "amount_to_avg_ratio": float(amount_to_avg),
            "sender_txn_count_24h": int(req.senderTxnCount24h if req.senderTxnCount24h is not None else default_count_24h),
            "sender_txn_count_7d": int(req.senderTxnCount7d if req.senderTxnCount7d is not None else defaults.get("sender_txn_count_7d", 8)),
            "recipient_account_age_days": int(req.recipientAccountAgeDays if req.recipientAccountAgeDays is not None else (45 if req.isFirstTimeRecipient else defaults.get("recipient_account_age_days", 450))),
            "recipient_reputation_score": float(rep_score),
            "recipient_prior_complaints": int(prior_complaints),
            "recipient_unique_senders_24h": int(req.recipientUniqueSenders24h if req.recipientUniqueSenders24h is not None else (12 if req.screenSharing or req.pinToReceive else defaults.get("recipient_unique_senders_24h", 2))),
            "prior_txns_with_recipient": int(prior_txns),
            "is_first_time_recipient": int(req.isFirstTimeRecipient),
            "is_qr_payment": 1 if req.paymentChannel == "QR_Scan" else 0,
            "is_collect_request": 1 if req.paymentChannel == "Collect_Request" else 0,
            "qr_merchant_mismatch": 1 if req.qrMismatch else 0,
            "collect_request_unsolicited": 1 if req.collectUnsolicited else 0,
            "urgency_indicator": 1 if req.urgency else 0,
            "refund_or_reward_claim": 1 if req.refundClaim else 0,
            "impersonation_indicator": 1 if req.impersonation else 0,
            "pin_requested_to_receive": 1 if req.pinToReceive else 0,
            "suspicious_link_indicator": 1 if req.suspiciousLink else 0,
            "screen_sharing_request": 1 if req.screenSharing else 0,
            "caller_claims_authority": 1 if req.callerAuthority else 0,
            "unsolicited_contact": 1 if req.unsolicitedContact else 0,
            "secrecy_requested": 1 if req.secrecyRequested else 0,
            "emotional_pressure": 1 if req.emotionalPressure else 0,
            "call_in_progress": 1 if req.callInProgress else 0,
            "social_engineering_risk_score": float(se_score),
            # Categoricals
            "sender_age_group": str(req.senderAgeGroup or "26-35"),
            "sender_city_tier": str(req.senderCityTier or "Metro"),
            "recipient_account_type": str(rec_acc_type),
            "payment_purpose": str(req.paymentPurpose),
            "payment_channel": str(req.paymentChannel),
            "recipient_verification_status": str(req.recipientVerification),
        }

        feature_names_in = self.metadata.get("feature_names_in", list(row.keys()))
        df = pd.DataFrame([row])[feature_names_in]
        return df

    def predict(self, req: MLPredictionInput) -> Dict[str, Any]:
        """Runs the prediction pipeline with SHAP local explainability."""
        if not self.is_loaded:
            # Re-attempt loading in case it was created after startup
            self.load_artifacts()
            if not self.is_loaded:
                raise RuntimeError(f"ML Service unavailable: {self.load_error or 'Model not loaded'}")

        df_row = self.prepare_feature_row(req)
        X_trans = self.preprocessor.transform(df_row)
        feature_names_out = self.metadata.get("feature_names_out", [])

        # Predict probability
        probs = self.model.predict_proba(X_trans)[0]
        fraud_prob = float(probs[1])

        threshold = float(self.metadata.get("optimal_threshold", 0.5))
        is_fraud = bool(fraud_prob >= threshold)
        risk_score = int(round(fraud_prob * 100))

        if risk_score >= 70:
            risk_level = "Critical"
        elif risk_score >= 45:
            risk_level = "High"
        elif risk_score >= 20:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        confidence = round(float(max(probs[0], probs[1])), 4)

        # Local SHAP explanation
        top_risk_factors = []
        top_protective_factors = []

        if self.explainer is not None:
            try:
                shap_vals = self.explainer.shap_values(X_trans)[0]
                # Sort indices
                increasing_idx = np.argsort(shap_vals)[::-1]
                for idx in increasing_idx:
                    val = float(shap_vals[idx])
                    if val > 0.05 and len(top_risk_factors) < 5:
                        f_raw = feature_names_out[idx]
                        desc = RISK_FEATURE_LABELS.get(f_raw, f_raw.replace("_", " ").title())
                        top_risk_factors.append({
                            "feature": f_raw,
                            "impact": round(val, 4),
                            "description": desc,
                            "direction": "increases_risk",
                        })

                reducing_idx = np.argsort(shap_vals)
                for idx in reducing_idx:
                    val = float(shap_vals[idx])
                    if val < -0.05 and len(top_protective_factors) < 5:
                        f_raw = feature_names_out[idx]
                        desc = PROTECTIVE_FEATURE_LABELS.get(f_raw, f_raw.replace("_", " ").title())
                        top_protective_factors.append({
                            "feature": f_raw,
                            "impact": round(val, 4),
                            "description": desc,
                            "direction": "reduces_risk",
                        })
            except Exception as e:
                logger.warning(f"SHAP explanation computation failed: {e}")

        # Fallback to feature highlights if SHAP produced empty list
        if not top_risk_factors and is_fraud:
            top_risk_factors.append({
                "feature": "social_engineering_risk_score",
                "impact": 0.5,
                "description": "High composite behavioral manipulation indicators",
                "direction": "increases_risk",
            })

        return {
            "predictionId": f"ml_{int(datetime.now().timestamp() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "modelName": self.metadata.get("model_name", "HistGradientBoosting"),
            "fraudProbability": round(fraud_prob, 4),
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "isFraud": is_fraud,
            "thresholdUsed": threshold,
            "confidence": confidence,
            "topRiskFactors": top_risk_factors,
            "topProtectiveFactors": top_protective_factors,
            "source": "machine_learning_pipeline",
            "modelStatus": "active",
        }


# Global singleton instance
ml_service = MLService()
