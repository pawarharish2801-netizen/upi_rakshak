#!/usr/bin/env python3
"""
UPI Rakshak - Comprehensive ML & Backend Integration Test Suite
Covers:
1. Legitimate transactions
2. Obvious fraud scenarios
3. Stealth fraud scenarios
4. Unusual legitimate transactions
5. Missing and invalid inputs
6. Model-loading failure simulation and graceful degradation
7. Frontend-backend API contract verification
"""

import sys
import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ml_service import MLService, MLPredictionInput

client = TestClient(app)

class TestMLIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("STARTING UPI RAKSHAK ML INTEGRATION TEST SUITE")
        print("=======================================================")

    # -------------------------------------------------------------------------
    # 1. Legitimate Transactions
    # -------------------------------------------------------------------------
    def test_01_routine_grocery_payment(self):
        """Test regular grocery payment to verified merchant."""
        payload = {
            "amount": 750.0,
            "recipientId": "naturebasket.orders@icici",
            "paymentChannel": "QR_Scan",
            "paymentPurpose": "grocery",
            "recipientVerification": "Verified_Merchant",
            "isFirstTimeRecipient": False,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Test 1] Routine Grocery: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertFalse(data["isFraud"])
        self.assertLess(data["fraudProbability"], 0.20)
        self.assertEqual(data["riskLevel"], "Low")
        self.assertGreater(len(data["topProtectiveFactors"]), 0)

    def test_02_family_transfer(self):
        """Test P2P money transfer to known family member."""
        payload = {
            "amount": 5000.0,
            "recipientId": "sister.family@sbi",
            "paymentChannel": "Contact_Pick",
            "paymentPurpose": "family_transfer",
            "recipientVerification": "Saved_Contact",
            "isFirstTimeRecipient": False,
            "priorTxnsWithRecipient": 14,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Test 2] Family Transfer: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertFalse(data["isFraud"])
        self.assertLess(data["fraudProbability"], 0.20)

    # -------------------------------------------------------------------------
    # 2. Obvious Fraud Scenarios
    # -------------------------------------------------------------------------
    def test_03_fake_refund_scam(self):
        """Test Fake Refund trap: unsolicited collect request + PIN demanded."""
        payload = {
            "amount": 8499.0,
            "recipientId": "claim.refund88@okhdfc",
            "paymentChannel": "Collect_Request",
            "paymentPurpose": "refund_claim",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
            "urgency": True,
            "refundClaim": True,
            "pinToReceive": True,
            "collectUnsolicited": True,
            "unsolicitedContact": True,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Test 3] Fake Refund Scam: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertTrue(data["isFraud"])
        self.assertGreater(data["fraudProbability"], 0.85)
        self.assertEqual(data["riskLevel"], "Critical")
        # Check SHAP risk factors contain deception indicators
        features = [f["feature"] for f in data["topRiskFactors"]]
        self.assertTrue(any("pin_requested_to_receive" in f or "refund" in f or "social" in f for f in features))

    def test_04_digital_arrest_coercion(self):
        """Test Digital Arrest scam: police impersonation + secrecy + video pressure."""
        payload = {
            "amount": 48000.0,
            "recipientId": "cbi.verification.clearing@axis",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "fine_or_penalty",
            "recipientVerification": "Name_Mismatch",
            "isFirstTimeRecipient": True,
            "urgency": True,
            "callerAuthority": True,
            "secrecyRequested": True,
            "emotionalPressure": True,
            "callInProgress": True,
            "unsolicitedContact": True,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Test 4] Digital Arrest: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertTrue(data["isFraud"])
        self.assertGreater(data["fraudProbability"], 0.85)

    def test_05_screen_sharing_takeover(self):
        """Test Screen Sharing scam: AnyDesk/TeamViewer remote access installation."""
        payload = {
            "amount": 25000.0,
            "recipientId": "support.quickdesk@paytm",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "service_fee",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
            "screenSharing": True,
            "callerAuthority": True,
            "unsolicitedContact": True,
            "callInProgress": True,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Test 5] Screen Sharing Takeover: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertTrue(data["isFraud"])
        self.assertGreater(data["fraudProbability"], 0.85)

    # -------------------------------------------------------------------------
    # 3. Stealth Fraud Scenarios
    # -------------------------------------------------------------------------
    def test_06_stealth_job_registration_fee(self):
        """Test Stealth Fraud: modest registration fee for bogus remote task."""
        payload = {
            "amount": 1500.0,
            "recipientId": "hr.career.portal@kotak",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "registration_fee",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
            "unsolicitedContact": True,
            "urgency": True,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Test 6] Stealth Job Scam: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        # Elevated risk compared to normal 1500 payment
        self.assertGreater(data["fraudProbability"], 0.35)

    def test_07_stealth_qr_merchant_mismatch(self):
        """Test Stealth QR Swap: small chai/snack payment with mismatched QR payee."""
        payload = {
            "amount": 350.0,
            "recipientId": "stealth.mule402@ybl",
            "paymentChannel": "QR_Scan",
            "paymentPurpose": "shopping",
            "recipientVerification": "Name_Mismatch",
            "isFirstTimeRecipient": True,
            "qrMismatch": True,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Test 7] Stealth QR Mismatch: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertGreater(data["fraudProbability"], 0.30)

    # -------------------------------------------------------------------------
    # 4. Unusual Legitimate Transactions
    # -------------------------------------------------------------------------
    def test_08_high_value_rent_payment(self):
        """Test High-Value Legitimate: ₹45,000 rent to landlord with prior history."""
        payload = {
            "amount": 45000.0,
            "recipientId": "landlord.apartment@hdfcbank",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "rent",
            "recipientVerification": "Bank_Name_Verified",
            "isFirstTimeRecipient": False,
            "priorTxnsWithRecipient": 11,
            "senderAvgAmount30d": 18000.0,
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Test 8] High-Value Rent: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertFalse(data["isFraud"])
        self.assertLess(data["fraudProbability"], 0.30)

    def test_09_late_night_flight_booking(self):
        """Test Late-Night Booking: midnight urgent ticket to verified airline merchant."""
        payload = {
            "amount": 12800.0,
            "recipientId": "indigo.tickets@axis",
            "paymentChannel": "Merchant_Intent",
            "paymentPurpose": "shopping",
            "recipientVerification": "Verified_Merchant",
            "isFirstTimeRecipient": True,
            "hourOfDay": 2,
            "isNightTxn": True,
            "urgency": True,  # User booked urgently before seat timeout
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Test 9] Late-Night Flight: Prob={data['fraudProbability']:.4f}, Level={data['riskLevel']}, isFraud={data['isFraud']}")
        self.assertFalse(data["isFraud"])
        self.assertLess(data["fraudProbability"], 0.60)

    # -------------------------------------------------------------------------
    # 5. Missing and Invalid Inputs
    # -------------------------------------------------------------------------
    def test_10_missing_optional_inputs_auto_imputed(self):
        """Test minimal request: missing optional attributes must be gracefully imputed."""
        payload = {
            "amount": 1000.0,
            "recipientId": "test.minimal@okhdfc",
        }
        res = client.post("/api/ml/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Test 10] Minimal Inputs Imputed: Prob={data['fraudProbability']:.4f}, Status={data['modelStatus']}")
        self.assertIn("fraudProbability", data)
        self.assertIn("topRiskFactors", data)

    def test_11_negative_amount_rejected(self):
        """Test input validation: negative amount should return HTTP 422."""
        payload = {
            "amount": -500.0,
            "recipientId": "invalid@okhdfc",
        }
        res = client.post("/api/ml/predict", json=payload)
        print(f"[Test 11] Negative Amount Status: {res.status_code}")
        self.assertEqual(res.status_code, 422)

    def test_12_empty_recipient_rejected(self):
        """Test input validation: missing recipientId should return HTTP 422."""
        payload = {
            "amount": 500.0,
            "recipientId": "",
        }
        res = client.post("/api/ml/predict", json=payload)
        print(f"[Test 12] Empty Recipient Status: {res.status_code}")
        self.assertEqual(res.status_code, 422)

    # -------------------------------------------------------------------------
    # 6. Model-Loading Failures & Graceful Degradation
    # -------------------------------------------------------------------------
    def test_13_model_loading_failure_handling(self):
        """Test that an uninitialized or broken MLService degrades gracefully without crash."""
        broken_service = MLService()
        # Force unloaded state
        broken_service.is_loaded = False
        broken_service.load_error = "Simulated disk read corruption error"

        req = MLPredictionInput(
            amount=500.0,
            recipientId="dummy@okhdfc",
        )
        print("\n[Test 13] Simulating uninitialized service predict call:")
        with self.assertRaises(RuntimeError) as ctx:
            # Bypass auto reload
            broken_service.load_artifacts = lambda: None
            broken_service.predict(req)
        self.assertIn("ML Service unavailable", str(ctx.exception))
        print("  Successfully caught handled RuntimeError with informative message.")

    # -------------------------------------------------------------------------
    # 7. Frontend-Backend Contract Integration
    # -------------------------------------------------------------------------
    def test_14_dual_engine_payment_assessment(self):
        """Test existing /api/assess/payment returns both rule assessment and ML prediction."""
        payload = {
            "amount": 15000.0,
            "recipientId": "fake.police.escrow@icici",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "fine_or_penalty",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
            "callerAuthority": True,
            "secrecyRequested": True,
            "urgency": True,
        }
        res = client.post("/api/assess/payment", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Test 14] Dual-Engine Assessment Endpoint: ID={data['id'][:8]}")
        print(f"  Rule Engine Risk Score: {data['riskScore']} ({data['riskLevel']})")
        print(f"  ML Engine Fraud Prob: {data['mlPrediction']['fraudProbability']:.4f} (isFraud={data['mlPrediction']['isFraud']})")
        self.assertIn("mlPrediction", data)
        self.assertIsNotNone(data["mlPrediction"])
        self.assertIn("topRiskFactors", data["mlPrediction"])
        self.assertIn("topProtectiveFactors", data["mlPrediction"])

    def test_15_analytics_endpoint_ml_metrics(self):
        """Test /api/analytics returns genuine model metrics."""
        res = client.get("/api/analytics")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Test 15] Analytics Telemetry: Model={data['modelName']}, AUC={data['modelAUC']}, PRAUC={data['modelPRAUC']}")
        self.assertEqual(data["modelAUC"], 0.9712)
        self.assertEqual(data["modelPRAUC"], 0.9312)

if __name__ == "__main__":
    unittest.main()
