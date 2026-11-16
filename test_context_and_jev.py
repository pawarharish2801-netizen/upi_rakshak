#!/usr/bin/env python3
"""
UPI Rakshak - Module A-F Comprehensive Integration & Validation Test Suite
Tests all 15 mandatory operational scenarios and evaluates the context module
on a separate labelled test set of scam and benign conversations.
"""

import sys
import unittest
from unittest.mock import patch, MagicMock
import httpx
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.context.conversation_intelligence import conversation_engine
from backend.app.context.intent_correlation import correlation_engine
from backend.app.context.jev_client import JevDecisionClient, jev_client
from backend.app.context.schemas import (
    PaymentIntentInfo,
    UnifiedAssessmentRequest,
    ProgressiveMessageInput,
)

client = TestClient(app)


class TestContextAndJev(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("STARTING UPI RAKSHAK HYBRID CONTEXT & JEV TEST SUITE")
        print("=======================================================")

    # -------------------------------------------------------------------------
    # Scenario 1: Legitimate payment with harmless conversation
    # -------------------------------------------------------------------------
    def test_01_legitimate_payment_with_harmless_conversation(self):
        req = {
            "amount": 450.0,
            "recipientId": "greenfresh.veg@icici",
            "paymentChannel": "QR_Scan",
            "paymentPurpose": "grocery",
            "recipientVerification": "Verified_Merchant",
            "isFirstTimeRecipient": False,
            "conversationText": "Thanks for the fresh vegetables bhaiya! Paying 450 rupees via QR code.",
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Scenario 1] Legit Payment: Risk={data['final_risk_score']}, Level={data['final_risk_level']}, Action={data['recommended_action']}")
        self.assertEqual(data["final_risk_level"], "LOW")
        self.assertEqual(data["recommended_action"], "PROCEED_WITH_CAUTION")
        self.assertFalse(data["hard_stop_triggered"])

    # -------------------------------------------------------------------------
    # Scenario 2: Fraudulent payment with manipulative conversation
    # -------------------------------------------------------------------------
    def test_02_fraudulent_payment_with_manipulative_conversation(self):
        req = {
            "amount": 25000.0,
            "recipientId": "cbi.clearing.escrow@axis",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "fine_or_penalty",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
            "conversationText": "This is Sub-Inspector Sharma from Delhi Cyber Police. You are under digital arrest. Transfer ₹25,000 to RBI escrow immediately to prevent non-bailable arrest warrant.",
            "callerAuthority": True,
            "secrecyRequested": True,
            "urgency": True,
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Scenario 2] Digital Arrest Fraud: Risk={data['final_risk_score']}, Level={data['final_risk_level']}, Action={data['recommended_action']}")
        self.assertEqual(data["final_risk_level"], "CRITICAL")
        self.assertEqual(data["recommended_action"], "STOP_PAYMENT_AND_INVESTIGATE")
        self.assertTrue(data["hard_stop_triggered"])
        self.assertEqual(data["correlation"]["relevance_category"], "DIRECTLY_CORRELATED")

    # -------------------------------------------------------------------------
    # Scenario 3: Fraudulent payment without conversation
    # -------------------------------------------------------------------------
    def test_03_fraudulent_payment_without_conversation(self):
        req = {
            "amount": 35000.0,
            "recipientId": "fake.mule99@paytm",
            "paymentChannel": "Collect_Request",
            "paymentPurpose": "refund_claim",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
            "pinToReceive": True,
            "screenSharing": True,
            "urgency": True,
            "conversationText": "",  # No conversation
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Scenario 3] Fraud Without Conversation: Risk={data['final_risk_score']}, Action={data['recommended_action']}")
        self.assertEqual(data["final_risk_level"], "CRITICAL")
        self.assertEqual(data["recommended_action"], "STOP_PAYMENT_AND_INVESTIGATE")
        self.assertTrue(data["hard_stop_triggered"])
        self.assertFalse(data["has_conversation_context"])

    # -------------------------------------------------------------------------
    # Scenario 4: Legitimate payment with suspicious-looking wording (Educational Negation)
    # -------------------------------------------------------------------------
    def test_04_legitimate_payment_with_suspicious_wording(self):
        req = {
            "amount": 1200.0,
            "recipientId": "naturebasket.orders@icici",
            "paymentChannel": "QR_Scan",
            "paymentPurpose": "grocery",
            "recipientVerification": "Verified_Merchant",
            "isFirstTimeRecipient": False,
            "conversationText": "Bank awareness advisory: Beware of calls asking for your UPI PIN or OTP. Bank never asks you to enter PIN to receive money.",
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Scenario 4] Educational Discussion: Risk={data['final_risk_score']}, Level={data['final_risk_level']}")
        self.assertEqual(data["final_risk_level"], "LOW")
        self.assertEqual(data["recommended_action"], "PROCEED_WITH_CAUTION")

    # -------------------------------------------------------------------------
    # Scenario 5: Unrelated suspicious conversation
    # -------------------------------------------------------------------------
    def test_05_unrelated_suspicious_conversation(self):
        req = {
            "amount": 800.0,
            "recipientId": "store.books@sbi",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "shopping",
            "recipientVerification": "Verified_Merchant",
            "isFirstTimeRecipient": False,
            "conversationText": "Hey buddy, yesterday someone sent me a scam link about liking YouTube videos for money on Telegram. Crazy how many scams exist!",
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Scenario 5] Unrelated Chat: Relevance={data['correlation']['relevance_category']}, Final Risk={data['final_risk_score']}")
        self.assertEqual(data["correlation"]["relevance_category"], "UNRELATED")
        self.assertEqual(data["final_risk_level"], "LOW")

    # -------------------------------------------------------------------------
    # Scenario 6: Payment amount matching
    # -------------------------------------------------------------------------
    def test_06_payment_amount_matching(self):
        analysis = conversation_engine.analyze("Pay ₹14,500 penalty fee immediately to avoid arrest.")
        payment = PaymentIntentInfo(
            amount=14500.0,
            recipient_vpa="police.dept@axis",
            payment_purpose="fine_or_penalty",
        )
        corr = correlation_engine.correlate(analysis, payment)
        print(f"\n[Scenario 6] Amount Matching: Matched={corr.amount_matched}, Extracted={corr.extracted_amount}, Score={corr.correlation_score}")
        self.assertTrue(corr.amount_matched)
        self.assertEqual(corr.extracted_amount, 14500.0)
        self.assertGreaterEqual(corr.correlation_score, 0.40)

    # -------------------------------------------------------------------------
    # Scenario 7: Payment amount mismatch
    # -------------------------------------------------------------------------
    def test_07_payment_amount_mismatch(self):
        analysis = conversation_engine.analyze("Transfer ₹50,000 security bond right now.")
        payment = PaymentIntentInfo(
            amount=1200.0,
            recipient_vpa="landlord.rent@sbi",
            payment_purpose="rent",
        )
        corr = correlation_engine.correlate(analysis, payment)
        print(f"[Scenario 7] Amount Mismatch: Matched={corr.amount_matched}, Discrepancy={corr.amount_discrepancy}")
        self.assertFalse(corr.amount_matched)
        self.assertEqual(corr.amount_discrepancy, 48800.0)

    # -------------------------------------------------------------------------
    # Scenario 8: English and Hinglish scam messages
    # -------------------------------------------------------------------------
    def test_08_english_and_hinglish_scam_messages(self):
        # English
        res_en = conversation_engine.analyze("Alert: Your HDFC bank account will be blocked tonight due to expired KYC.")
        self.assertIn("FAKE_KYC", [s.category for s in res_en.signals])
        self.assertEqual(res_en.language, "en")

        # Hinglish
        res_hi = conversation_engine.analyze("Sir main SBI head office Mumbai se bol raha hu. Aapka khata band ho jayega turant paise bhejo.")
        print(f"\n[Scenario 8] Hinglish Detection: Lang={res_hi.language}, Score={res_hi.context_risk_score}, Intent={res_hi.intent}")
        self.assertEqual(res_hi.language, "hinglish")
        self.assertGreater(res_hi.context_risk_score, 50)
        self.assertTrue(any(s.category in ["BANK_IMPERSONATION", "FAKE_KYC"] for s in res_hi.signals))

    # -------------------------------------------------------------------------
    # Scenario 9: Critical PIN manipulation & action conflict
    # -------------------------------------------------------------------------
    def test_09_critical_pin_manipulation_action_conflict(self):
        analysis = conversation_engine.analyze("Your refund of ₹8,499 is approved. Enter your UPI PIN to claim and receive it now.")
        payment = PaymentIntentInfo(
            amount=8499.0,
            recipient_vpa="refund.claim@ybl",
            payment_purpose="refund_claim",
            payment_channel="Collect_Request",
        )
        corr = correlation_engine.correlate(analysis, payment)
        print(f"[Scenario 9] Action Conflict: Conflict={corr.action_conflict}, Score={corr.correlation_score}")
        self.assertTrue(corr.action_conflict)
        self.assertEqual(corr.relevance_category, "DIRECTLY_CORRELATED")

    # -------------------------------------------------------------------------
    # Scenario 10: Conflicting ML and context signals
    # -------------------------------------------------------------------------
    def test_10_conflicting_ml_and_context_signals(self):
        # Small benign amount to normal merchant channel, but caller claims digital arrest
        req = {
            "amount": 250.0,
            "recipientId": "test.user@okhdfc",
            "paymentChannel": "UPI_ID_Manual",
            "paymentPurpose": "other",
            "recipientVerification": "Bank_Name_Verified",
            "isFirstTimeRecipient": False,
            "conversationText": "CBI police digital arrest: Pay immediately or warrant will be executed.",
            "callerAuthority": True,
            "secrecyRequested": True,
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Scenario 10] Conflicting Signals: ML Prob={data['ml_probability']:.4f}, Conv Risk={data['conversation_risk_score']}")
        print(f"  Conflict Caught by Jev: {data['jev_decision']['conflicting_signals_detected']}")
        self.assertTrue(data["jev_decision"]["conflicting_signals_detected"])
        # Even with low amount, hard-stop authority extortion protects the victim
        self.assertEqual(data["final_risk_level"], "CRITICAL")
        self.assertEqual(data["recommended_action"], "STOP_PAYMENT_AND_INVESTIGATE")

    # -------------------------------------------------------------------------
    # Scenario 11: Missing recipient information
    # -------------------------------------------------------------------------
    def test_11_missing_recipient_information(self):
        req = {
            "amount": 5000.0,
            "recipientId": "unknown.new.handle@upi",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"[Scenario 11] Missing Recipient Info: Handled cleanly, Level={data['final_risk_level']}")
        self.assertTrue(any("recipient integrity checks" in r or "first-time recipient" in r for r in data["plain_english_reasons"]))

    # -------------------------------------------------------------------------
    # Scenario 12: Jev API Timeout
    # -------------------------------------------------------------------------
    def test_12_jev_api_timeout(self):
        client_instance = JevDecisionClient(api_key="mock_secret_key_12345")
        with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Connection timed out")):
            decision = client_instance.evaluate_decision(
                ml_probability=0.85,
                context_score=90,
                correlation_score=1.0,
                evidence_summary="Digital arrest",
                hard_stop_flags={"digital_arrest": True},
            )
        print(f"\n[Scenario 12] Jev Timeout Fallback: Status={decision.status}, Fallback={decision.is_fallback}")
        self.assertEqual(decision.status, "timeout_fallback")
        self.assertTrue(decision.is_fallback)
        self.assertEqual(decision.threat_severity, "CRITICAL")

    # -------------------------------------------------------------------------
    # Scenario 13: Jev Unavailable (HTTP 503)
    # -------------------------------------------------------------------------
    def test_13_jev_unavailable(self):
        client_instance = JevDecisionClient(api_key="mock_secret_key_12345")
        mock_res = MagicMock()
        mock_res.status_code = 503
        mock_res.text = "Service Unavailable"
        with patch("httpx.Client.post", return_value=mock_res):
            decision = client_instance.evaluate_decision(
                ml_probability=0.20,
                context_score=10,
                correlation_score=0.0,
                evidence_summary="Clean",
                hard_stop_flags={},
            )
        print(f"[Scenario 13] Jev 503 Fallback: Status={decision.status}, Fallback={decision.is_fallback}")
        self.assertEqual(decision.status, "error_fallback")
        self.assertTrue(decision.is_fallback)
        self.assertEqual(decision.threat_severity, "LOW")

    # -------------------------------------------------------------------------
    # Scenario 14: Malformed Jev response
    # -------------------------------------------------------------------------
    def test_14_malformed_jev_response(self):
        client_instance = JevDecisionClient(api_key="mock_secret_key_12345")
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {"broken_response": 1234}
        with patch("httpx.Client.post", return_value=mock_res):
            decision = client_instance.evaluate_decision(
                ml_probability=0.90,
                context_score=80,
                correlation_score=0.9,
                evidence_summary="Malicious",
                hard_stop_flags={},
            )
        print(f"[Scenario 14] Malformed Jev Response: Status={decision.status}, Fallback={decision.is_fallback}")
        self.assertTrue(decision.is_fallback)
        self.assertEqual(decision.threat_severity, "CRITICAL")

    # -------------------------------------------------------------------------
    # Scenario 15: End-to-End Frontend/Backend Unified API Assessment
    # -------------------------------------------------------------------------
    def test_15_end_to_end_unified_assessment(self):
        req = {
            "amount": 8499.0,
            "recipientId": "claim.refund88@okhdfc",
            "paymentChannel": "Collect_Request",
            "paymentPurpose": "refund_claim",
            "recipientVerification": "Unverified",
            "isFirstTimeRecipient": True,
            "urgency": True,
            "refundClaim": True,
            "pinToReceive": True,
            "conversationText": "Customer care: ₹8,499 refund is approved. Accept the collect request and enter your UPI PIN to deposit into account.",
        }
        res = client.post("/api/assess/unified", json=req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print(f"\n[Scenario 15] End-to-End Full Unified Evaluation:")
        print(f"  Final Risk Score: {data['final_risk_score']} ({data['final_risk_level']})")
        print(f"  Action: {data['recommended_action']}")
        print(f"  ML Prob: {data['ml_probability']:.4f}")
        print(f"  Conversation Risk: {data['conversation_risk_score']}/100")
        print(f"  Intent Correlation: {data['correlation']['relevance_category']}")
        print(f"  Jev Decision: Severity={data['jev_decision']['threat_severity']}, Fallback={data['jev_decision']['is_fallback']}")
        self.assertEqual(data["final_risk_level"], "CRITICAL")
        self.assertEqual(data["recommended_action"], "STOP_PAYMENT_AND_INVESTIGATE")
        self.assertTrue(data["hard_stop_triggered"])

    # -------------------------------------------------------------------------
    # Separate Labelled Test Set: 30 Real-World Examples (15 Scams, 15 Benign)
    # -------------------------------------------------------------------------
    def test_16_separate_labelled_conversation_benchmark(self):
        dataset = [
            # 15 Malicious / Social Engineering Scenarios
            ("This is CBI Inspector Verma. Stay on Skype video call in digital arrest.", True),
            ("Your electricity will be disconnected tonight at 9:30 PM. Call officer immediately.", True),
            ("SBI alert: Your bank account will be blocked unless you update KYC now.", True),
            ("Sir refund lene ke liye QR code scan karke apna 6 digit UPI PIN enter kijiye.", True),
            ("Earn ₹5000 daily working from home liking YouTube videos. Pay ₹1,500 registration fee.", True),
            ("Please install AnyDesk remote access app so our bank support team can assist you.", True),
            ("Congratulations! You won ₹1,00,000 lottery. Pay ₹2,500 tax clearance via UPI.", True),
            ("Police warrant issued against your Aadhaar. Transfer ₹35,000 to clearing account.", True),
            ("Main HDFC vigilance manager bol raha hu. Aapka khata block ho jayega turant paise transfer karo.", True),
            ("Your parcel has been stopped by customs for drugs. Pay ₹40,000 fine immediately.", True),
            ("Click this bit.ly link and download update_bank.apk to restore your UPI service.", True),
            ("Guaranteed 40% daily profit on crypto trading bot. Minimum deposit ₹10,000.", True),
            ("Transfer ₹5,000 immediately to prevent account suspension.", True),
            ("Aapka account freeze hone wala hai, turant verification payment karo.", True),
            ("Customer care refund department: Enter your UPI PIN to claim cashback.", True),

            # 15 Benign / Educational / Routine Examples
            ("Thanks for the delicious dinner! Sending ₹650 for my share of the bill.", False),
            ("Hi Mom, sending ₹3,000 for groceries. Let me know when you receive it.", False),
            ("Paid electricity bill of ₹1,420 for June month on official BESCOM portal.", False),
            ("Beware of scammers asking for your UPI PIN. Never share OTP with anyone.", False),
            ("Can you split the cab fare of ₹240 from airport? Here is my UPI ID.", False),
            ("RBI awareness message: Bank officers never ask for passwords or remote screen sharing.", False),
            ("Happy birthday brother! Sent ₹2,000 as a gift. Enjoy your day!", False),
            ("School fees receipt for first term ₹15,000 paid to St. Mary High School.", False),
            ("Meeting is scheduled for tomorrow at 10 AM in the conference room.", False),
            ("Sent ₹120 for the coffee and snacks at Starbucks.", False),
            ("I was reading about cyber crime scams where callers impersonate police officers.", False),
            ("Please send the project report PDF by Monday evening.", False),
            ("Monthly house rent of ₹22,000 transferred to landlord account.", False),
            ("Gym membership renewal of ₹4,500 paid at front desk via QR code.", False),
            ("Always verify the merchant name on your UPI screen before typing your PIN.", False),
        ]

        tp = fp = tn = fn = 0
        for text, actual_is_scam in dataset:
            res = conversation_engine.analyze(text)
            predicted_is_scam = (res.context_risk_score >= 30) and (not res.is_educational_or_benign)
            if actual_is_scam and predicted_is_scam:
                tp += 1
            elif not actual_is_scam and predicted_is_scam:
                fp += 1
            elif not actual_is_scam and not predicted_is_scam:
                tn += 1
            elif actual_is_scam and not predicted_is_scam:
                fn += 1

        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        accuracy = (tp + tn) / len(dataset)

        print("\n[Labelled Benchmark Results - 30 Separate Test Cases]:")
        print(f"  Total Test Cases: {len(dataset)} (15 Scam, 15 Benign)")
        print(f"  Accuracy:  {accuracy * 100:.1f}%")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall:    {recall:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        print(f"  Confusion Matrix: TP={tp}, FP={fp}, TN={tn}, FN={fn}")

        self.assertGreaterEqual(accuracy, 0.90)
        self.assertGreaterEqual(f1, 0.90)


if __name__ == "__main__":
    unittest.main()
