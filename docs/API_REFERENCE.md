# 📡 UPI Rakshak — API Reference & Integration Guide

> **Version: 2.4.0**  
> **Base URL:** `http://127.0.0.1:8000/api` (or proxied via `/api`)  
> **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`  
> **OpenAPI JSON Spec:** `http://127.0.0.1:8000/openapi.json`

---

## 1. Authentication & Headers

Standard requests require:
```http
Content-Type: application/json
Accept: application/json
```

For authenticated routes (optional in development mode):
```http
Authorization: Bearer <session_token>
```

---

## 2. Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/assess/unified` | **Primary Gateway**: Evaluates payment parameters, behavioral flags, and chat dialogue in one multi-layer pass. |
| `POST` | `/api/assess/payment` | Legacy standalone payment risk assessment. |
| `POST` | `/api/ml/predict` | Direct ML inference with SHAP local feature importance. |
| `GET` | `/api/ml/status` | Model provenance, ROC-AUC metrics, and runtime health. |
| `POST` | `/api/assess/conversation` | Single-shot NLP intent analysis of chat/SMS transcripts. |
| `POST` | `/api/conversation/progressive` | Multi-turn streaming chat scanner. |
| `POST` | `/api/scan/screenshot` | Multipart OCR image upload with decompression bomb defenses. |
| `POST` | `/api/scan/screenshot-text` | Re-analyzes extracted or user-corrected OCR text. |
| `GET` | `/api/assessments/{id}` | Retrieves a past evaluation record by UUID. |
| `GET` | `/api/analytics` | Statistical risk distributions and aggregate metrics. |
| `GET` | `/api/transactions` | Paginated audit log of processed evaluations. |
| `POST` | `/api/reports` | Registers a community scam threat report. |

---

## 3. Detailed Endpoint Specifications

### 3.1 Primary Gateway: Unified Assessment
`POST /api/assess/unified`

Synthesizes behavioral ML classification, NLP dialogue parsing, and deterministic sovereign guardrails.

#### Request Body Schema:
```json
{
  "amount": 24999.0,
  "recipient_vpa": "claim.refund92@okhdfc",
  "payment_channel": "Collect_Request",
  "payment_purpose": "refund_claim",
  "recipient_verification": "Unverified",
  "is_first_time_recipient": true,
  "call_in_progress": true,
  "rapid_multiple_payments": true,
  "recent_payment_count": 3,
  "conversation_text": "Customer care executive said refund of Rs 24,999 approved. Told me to accept collect request and enter PIN to receive funds.",
  "flags": {
    "pin_to_receive": true,
    "screen_sharing": false,
    "caller_authority": false,
    "secrecy_requested": false,
    "emotional_pressure": true,
    "urgency": true,
    "refund_claim": true,
    "unsolicited_contact": true
  }
}
```

#### Response Body Schema (200 OK):
```json
{
  "id": "c1f77d42-8c11-4f12-9c34-8be06135ab11",
  "timestamp": "2026-11-16T06:15:30.123456Z",
  "final_risk_score": 96,
  "final_risk_level": "Critical",
  "primary_threat_category": "Fake_Refund",
  "recommended_action": "STOP_PAYMENT_AND_INVESTIGATE",
  "hard_stop_triggered": true,
  "disclaimer": "Pre-payment intervention evaluated across multi-vector ML signals, conversational intent, and sovereign guardrails.",
  "deterministic_warnings": [
    "ACTIVE CALL COERCION: Live call in progress during transaction — high probability of social engineering or digital arrest trick",
    "RAPID MULTI-PAYMENT: Consecutive or split payments in a single session — high risk of rapid account draining",
    "COMPOUND EXTREME RISK: Concurrent active call with rapid consecutive payments is primary signature of active coercion.",
    "CRITICAL: UPI PIN requested to receive money — definitive signature of fraud."
  ],
  "plain_english_reasons": [
    "DISCONNECT THE PHONE CALL NOW: Legitimate bank officials or merchants NEVER require you to remain on call while entering your UPI PIN.",
    "HALT REPEATED TRANSFERS IMMEDIATELY: Check your bank statement before sending any further amount.",
    "DO NOT ENTER PIN: Entering your UPI PIN will DEBIT funds from your account, never credit them.",
    "Block this recipient handle and lodge a report via Helpline 1930."
  ],
  "ml_prediction": {
    "model_name": "HistGradientBoosting (Trained ML)",
    "fraud_probability": 0.978,
    "is_fraud": true,
    "threshold_used": 0.81,
    "confidence": 0.978,
    "top_risk_factors": [
      {
        "feature": "pin_requested_to_receive",
        "description": "UPI PIN requested to receive funds (deceptive mechanism)",
        "impact": 0.285
      },
      {
        "feature": "call_in_progress",
        "description": "Live call or voice interaction active during checkout",
        "impact": 0.201
      },
      {
        "feature": "rapid_multiple_payments",
        "description": "Rapid consecutive payment velocity burst",
        "impact": 0.224
      }
    ],
    "top_protective_factors": []
  },
  "correlation": {
    "relevance_category": "DIRECTLY_CORRELATED",
    "correlation_summary": "Dialogue directly references incoming refund of ₹24,999 while outgoing transaction executes a debit transfer.",
    "amount_matched": true,
    "recipient_matched": false,
    "action_conflict": true,
    "urgency_aligned": true,
    "correlation_score": 0.92
  },
  "jev_decision": {
    "threat_severity": "CRITICAL",
    "recommended_action": "STOP_PAYMENT_AND_INVESTIGATE",
    "conflicting_signals_detected": false,
    "is_fallback": true,
    "note": "Calibrated sovereign decision intelligence evaluation."
  }
}
```

#### cURL Example:
```bash
curl -X POST http://127.0.0.1:8000/api/assess/unified \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 24999.0,
    "recipient_vpa": "refund.desk@icici",
    "payment_channel": "Collect_Request",
    "payment_purpose": "refund_claim",
    "call_in_progress": true,
    "rapid_multiple_payments": true,
    "flags": {
      "pin_to_receive": true,
      "urgency": true
    }
  }'
```

---

### 3.2 Machine Learning Inference & SHAP
`POST /api/ml/predict`

Direct inference against the trained `HistGradientBoostingClassifier` with SHAP explainability.

#### Request Body Schema:
```json
{
  "amount": 150000.0,
  "recipient_id": "cbi.cybercell@sbi",
  "payment_channel": "UPI_ID_Manual",
  "payment_purpose": "fine_or_penalty",
  "recipient_verification": "Name_Mismatch",
  "is_first_time_recipient": true,
  "call_in_progress": true,
  "rapid_multiple_payments": false,
  "screen_sharing": false,
  "pin_to_receive": false,
  "caller_authority": true,
  "secrecy_requested": true,
  "emotional_pressure": true,
  "urgency": true,
  "refund_claim": false,
  "suspicious_link": false,
  "unsolicited_contact": true
}
```

#### Response Body Schema (200 OK):
```json
{
  "fraud_probability": 0.992,
  "is_fraud": true,
  "model_name": "HistGradientBoostingClassifier",
  "threshold_used": 0.81,
  "confidence": 0.992,
  "top_risk_factors": [
    {
      "feature": "caller_claims_authority",
      "description": "Impersonation of police, CBI, customs or bank authority",
      "impact": 0.312
    },
    {
      "feature": "secrecy_requested",
      "description": "Coercive secrecy demanded (told not to alert anyone)",
      "impact": 0.245
    },
    {
      "feature": "amount_inr",
      "description": "High transaction transfer amount",
      "impact": 0.188
    }
  ],
  "top_protective_factors": []
}
```

---

### 3.3 Screenshot OCR Analysis
`POST /api/scan/screenshot`

Uploads an image (JPEG, PNG, WEBP) to extract payment entities. Protected against decompression bombs.

#### Request:
- Form field: `file` (Binary Image File, max 10 MB)
- Form field: `user_consent` (`"true"`)

#### Response Body Schema (200 OK):
```json
{
  "success": true,
  "extracted_text": "Scan & Pay\nMerchant: Power Bill Desk\nUPI ID: electricity.desk@okaxis\nAmount: Rs 3,200\nUrgent: Pay before 9:30 PM to avoid cut",
  "entities": {
    "amount": "3200",
    "recipient_vpa": "electricity.desk@okaxis",
    "payee_name": "Power Bill Desk",
    "payment_purpose": "bill_payment"
  },
  "warnings": [
    "Detected utility bill disconnection threat vector"
  ],
  "preliminary_risk_score": 78
}
```

#### cURL Example:
```bash
curl -X POST http://127.0.0.1:8000/api/scan/screenshot \
  -F "file=@payment_screenshot.jpg" \
  -F "user_consent=true"
```

---

### 3.4 Conversational Scanner
`POST /api/assess/conversation`

Evaluates raw conversation transcripts (WhatsApp, SMS, or caller notes).

#### Request Body Schema:
```json
{
  "text": "Sir your electricity will be disconnected tonight at 9:30 PM. Pay Rs 10 verification fee via AnyDesk or your power will be cut."
}
```

#### Response Body Schema (200 OK):
```json
{
  "risk_score": 88,
  "risk_level": "Critical",
  "detected_patterns": [
    "Electricity disconnection scare",
    "Remote screen sharing application (AnyDesk)",
    "Artificial countdown urgency"
  ],
  "primary_category": "Electricity_Scam",
  "recommendations": [
    "DO NOT install AnyDesk or share 9-digit codes.",
    "Pay electricity bills only through official state electricity portals or registered BBPS gateways."
  ]
}
```

---

## 4. Error Responses & Status Codes

All errors conform to RFC 7807 problem details:

| HTTP Status | Error Type | Description |
|---|---|---|
| `400 Bad Request` | Input Validation Error | Payload violated schema constraints (e.g. amount < 0, invalid VPA format, or excessive text length). |
| `413 Payload Too Large` | Image Size / Dimension Exceeded | Image exceeds 10 MB or dimension exceeds 10 MP (`MAX_IMAGE_PIXELS`). |
| `415 Unsupported Media Type` | Invalid File Format | Uploaded file is not JPEG, PNG, or WEBP. |
| `429 Too Many Requests` | Rate Limit Triggered | Client exceeded bounded request allowance. |
| `500 Internal Error` | Engine Failure | Unhandled server exception (safely caught with fallback responses). |

#### Example Error Payload (400 Bad Request):
```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "Input should be greater than or equal to 1",
      "type": "greater_than_equal"
    }
  ]
}
```
