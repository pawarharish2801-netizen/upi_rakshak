"""
UPI Rakshak - Comprehensive OCR Screenshot Fraud Detection Test Suite
Validates:
1. English WhatsApp scam screenshot
2. Hindi scam screenshot
3. Hinglish scam screenshot
4. Legitimate banking notification
5. Educational scam-awareness screenshot
6. Blurry image detection
7. Unsupported file handling
8. Empty image handling
9. Multi-message chat screenshot
10. Privacy consent enforcement
11. Text edit & re-assessment endpoint
"""

import io
import sys
import os

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath("."))

import pytest
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def get_font(size=20):
    """Retrieves system TrueType font or fallback."""
    font_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Nirmala.ttc",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def create_image_bytes(text_lines, width=600, height=350, blur=False, bg_color=(255, 255, 255), text_color=(10, 10, 10)):
    """Creates in-memory PNG bytes with specified text rendered."""
    font = get_font(20)
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    y = 20
    for line in text_lines:
        draw.text((25, y), line, font=font, fill=text_color)
        y += 35

    if blur:
        np_img = np.array(img)
        np_img = cv2.GaussianBlur(np_img, (31, 31), 0)
        img = Image.fromarray(np_img)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_01_english_whatsapp_scam_screenshot():
    """Test 1: English WhatsApp scam screenshot with UPI VPA, phone, amount, and fake APK URL."""
    lines = [
        "Electricity Board Alert",
        "Your power will be disconnected at 9:30 PM tonight",
        "due to unpaid electricity bill of Rs 4999.",
        "Pay immediately via UPI: bijli-bill@oksbi",
        "Helpline: +91 9876543210",
        "Or download bill app: https://power-discom.xyz/bill.apk",
    ]
    img_bytes = create_image_bytes(lines, height=280)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("whatsapp_scam.png", img_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()

    # Verify OCR metadata
    assert data["line_count"] > 0
    assert data["ocr_engine"] is not None
    assert data["is_blurry"] is False

    # Verify Entity Extraction
    entities = data["entities"]
    assert any("bijli-bill@oksbi" in u for u in entities["upi_ids"])
    assert 4999.0 in entities["currency_amounts"]
    assert any("9876543210" in p for p in entities["phone_numbers"])
    assert any("power-discom.xyz" in url for url in entities["urls"])

    # Verify Context Intelligence
    ctx = data["context_analysis"]
    assert ctx["context_risk_score"] >= 60
    assert ctx["is_educational_or_benign"] is False
    assert len(ctx["signals"]) > 0
    print("\n[Test 1 Passed] English Scam detected: Category =", ctx["scam_category"], "Risk =", ctx["context_risk_score"])


def test_02_hindi_scam_screenshot():
    """Test 2: Hindi scam screenshot."""
    lines = [
        "SBI Bank Alert",
        "तुरंत Rs 5000 ट्रांसफर करें",
        "pay to sbi-verify@upi",
        "varna account block ho jayega",
    ]
    img_bytes = create_image_bytes(lines, height=200)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("hindi_scam.png", img_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["line_count"] > 0
    entities = data["entities"]
    assert any("sbi-verify@upi" in u for u in entities["upi_ids"])
    assert 5000.0 in entities["currency_amounts"]
    print("\n[Test 2 Passed] Hindi/Mixed scam parsed: Entities =", entities)


def test_03_hinglish_scam_screenshot():
    """Test 3: Hinglish scam screenshot with PIN-to-receive refund manipulation."""
    lines = [
        "Customer Support Desk",
        "Aapka Rs 2000 refund pending hai.",
        "Refund lene ke liye apna UPI PIN enter karein.",
        "Collect request approve karke paise receive karein.",
        "Pay to refund-desk@paytm",
    ]
    img_bytes = create_image_bytes(lines, height=240)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("hinglish_scam.png", img_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200
    data = response.json()

    ctx = data["context_analysis"]
    assert ctx["context_risk_score"] >= 65
    assert ctx["is_educational_or_benign"] is False
    # Should detect PIN-to-receive or Refund manipulation
    signal_labels = [s["label"] for s in ctx["signals"]]
    assert any("PIN" in lbl or "Refund" in lbl for lbl in signal_labels)
    print("\n[Test 3 Passed] Hinglish PIN-to-receive scam detected with Risk =", ctx["context_risk_score"])


def test_04_legitimate_banking_notification():
    """Test 4: Legitimate banking credit notification."""
    lines = [
        "HDFC Bank Alert: Your A/C XX4102 has been credited",
        "with INR 15000.00 on 10/11/2026 by NEFT.",
        "Available balance is INR 48250.75.",
        "Never share your UPI PIN or OTP with anyone.",
        "Helpline: 18002664332",
    ]
    img_bytes = create_image_bytes(lines, height=220)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("legit_bank.png", img_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200
    data = response.json()

    ctx = data["context_analysis"]
    # Should be low risk and recognized as benign/educational notice
    assert ctx["context_risk_score"] <= 35
    print("\n[Test 4 Passed] Legitimate notification recognized: Risk =", ctx["context_risk_score"])


def test_05_educational_scam_awareness_screenshot():
    """Test 5: Educational scam-awareness infographic screenshot."""
    lines = [
        "RBI CAUTION NOTICE: BEWARE OF FRAUD",
        "RBI says: Never enter your UPI PIN to receive money.",
        "Scammers send fake QR codes asking to scan to get cashback.",
        "Stay alert and report fraud to cybercrime.gov.in",
    ]
    img_bytes = create_image_bytes(lines, height=220)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("rbi_awareness.png", img_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200
    data = response.json()

    ctx = data["context_analysis"]
    assert ctx["is_educational_or_benign"] is True
    assert ctx["context_risk_score"] <= 10
    print("\n[Test 5 Passed] Educational notice detected: is_educational =", ctx["is_educational_or_benign"])


def test_06_blurry_image_detection():
    """Test 6: Blurry image triggers image quality advisory."""
    lines = [
        "Urgent: Pay Rs 10000 to fraud@upi immediately",
    ]
    img_bytes = create_image_bytes(lines, blur=True, height=150)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("blurry_screenshot.png", img_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["is_blurry"] is True
    assert data["blur_score"] < 45.0
    assert any("blurry" in w.lower() for w in data["warning_notes"])
    print("\n[Test 6 Passed] Blurry image detected: blur_score =", data["blur_score"])


def test_07_unsupported_file():
    """Test 7: Uploading unsupported file format returns HTTP 400."""
    fake_exe = b"MZ\x90\x00\x03\x00\x00\x00FakeExecutableData"

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("malware.exe", fake_exe, "application/octet-stream")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 400
    assert "Unsupported image format" in response.json()["detail"]
    print("\n[Test 7 Passed] Unsupported format safely rejected with HTTP 400.")


def test_08_empty_image():
    """Test 8: Blank image with no text handled gracefully."""
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    empty_bytes = buf.getvalue()

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("empty.png", empty_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["line_count"] == 0
    assert any("no readable text" in w.lower() for w in data["warning_notes"])
    print("\n[Test 8 Passed] Empty image handled cleanly with informative notice.")


def test_09_multi_message_screenshot():
    """Test 9: Screenshot containing multiple conversation messages."""
    lines = [
        "Your FedEx parcel is held by customs in Delhi.",
        "Please pay customs clearance charges of Rs 3500 immediately.",
        "Send payment to customs-desk@paytm",
        "If not paid in 1 hour, police arrest warrant will be issued.",
    ]
    img_bytes = create_image_bytes(lines, height=220)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("multi_chat.png", img_bytes, "image/png")},
        data={"user_consent": "true"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["line_count"] >= 3
    entities = data["entities"]
    assert 3500.0 in entities["currency_amounts"]
    assert any("customs-desk@paytm" in u for u in entities["upi_ids"])
    ctx = data["context_analysis"]
    assert ctx["context_risk_score"] >= 65
    print("\n[Test 9 Passed] Multi-message threat parsed successfully: Risk =", ctx["context_risk_score"])


def test_10_privacy_consent_required():
    """Test 10: Explicit consent is required before processing screenshot."""
    lines = ["Test text"]
    img_bytes = create_image_bytes(lines)

    response = client.post(
        "/api/scan/screenshot",
        files={"file": ("screenshot.png", img_bytes, "image/png")},
        data={"user_consent": "false"},
    )
    assert response.status_code == 400
    assert "Explicit user consent is required" in response.json()["detail"]
    print("\n[Test 10 Passed] Consent validation enforced: HTTP 400 returned when consent=False.")


def test_11_screenshot_text_edit_and_correlation():
    """Test 11: User edits extracted text and correlates with transaction details."""
    edited_text = "Pay Rs 4999 to refund-scam@upi to unblock your account"
    payload = {
        "text": edited_text,
        "amount": 4999.0,
        "recipient_vpa": "refund-scam@upi",
        "payment_purpose": "merchant_payment",
    }

    response = client.post("/api/scan/screenshot-text", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["ocr_engine"] == "User Edited (Manual Verification)"
    assert data["transaction_ml_assessed"] is True
    assert data["unified_assessment"] is not None
    assert data["unified_assessment"]["final_risk_score"] >= 50
    print("\n[Test 11 Passed] Edited text re-analysis and ML fusion succeeded: Final Risk =", data["unified_assessment"]["final_risk_score"])


if __name__ == "__main__":
    pytest.main(["-v", "-s", "test_ocr_integration.py"])
