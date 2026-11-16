"""
UPI Rakshak - OCR Screenshot Intelligence Engine
Privacy-Preserving In-Memory OCR Pipeline for Pre-Transaction Scam Detection.
Extracts message text, UPI IDs, phone numbers, amounts, URLs, dates, and instructions.
"""

import io
import re
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from PIL import Image

# Protect against decompression bomb denial of service (CWE-409 / OWASP API4)
Image.MAX_IMAGE_PIXELS = 10_000_000  # Cap maximum dimensions at 10 Megapixels

logger = logging.getLogger("upirakshak.ocr")

# Optional PyTesseract import
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    pytesseract = None
    PYTESSERACT_AVAILABLE = False

# RapidOCR (ONNX Runtime based PaddleOCR models)
try:
    from rapidocr_onnxruntime import RapidOCR
    RAPIDOCR_AVAILABLE = True
except ImportError:
    RapidOCR = None
    RAPIDOCR_AVAILABLE = False

# OpenCV for image quality & blur assessment
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False


class OCRError(Exception):
    """Base exception for OCR processing failures."""
    pass


class InvalidImageFormatError(OCRError):
    """Raised when uploaded file is not a supported image format."""
    pass


class FileSizeLimitExceededError(OCRError):
    """Raised when image exceeds the maximum allowed size."""
    pass


class OCRService:
    """
    Production-grade in-memory OCR service for fintech screenshot analysis.
    Supports English, Hinglish, and numerals out-of-the-box with low-latency ONNX inference.
    """

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/jpg"]
    BLUR_THRESHOLD = 45.0  # Laplacian variance threshold for blur warning

    def __init__(self):
        self._rapid_engine = None
        self._tesseract_cmd_verified = False

        if RAPIDOCR_AVAILABLE:
            try:
                self._rapid_engine = RapidOCR()
                logger.info("RapidOCR (ONNX Runtime) engine initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize RapidOCR: {e}")

        # Check if pytesseract has a working binary
        if PYTESSERACT_AVAILABLE:
            try:
                pytesseract.get_tesseract_version()
                self._tesseract_cmd_verified = True
                logger.info("Host Tesseract OCR binary verified.")
            except Exception:
                self._tesseract_cmd_verified = False

    def validate_image_bytes(self, image_bytes: bytes, filename: str = "upload.png") -> str:
        """
        Validates image payload size and magic bytes in memory.
        Returns detected format string ('png', 'jpeg', or 'webp').
        """
        if not image_bytes or len(image_bytes) == 0:
            raise InvalidImageFormatError("Uploaded image file is empty (0 bytes).")

        if len(image_bytes) > self.MAX_FILE_SIZE:
            size_mb = len(image_bytes) / (1024 * 1024)
            raise FileSizeLimitExceededError(
                f"Image size ({size_mb:.2f} MB) exceeds maximum permissible threshold of 5.0 MB."
            )

        # Check magic bytes
        if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "png"
        elif image_bytes.startswith(b"\xff\xd8\xff"):
            return "jpeg"
        elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
            return "webp"

        # Fallback inspection via PIL header parse
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                fmt = (img.format or "").lower()
                if fmt in ["png", "jpeg", "webp", "jpg"]:
                    return fmt
        except Exception:
            pass

        raise InvalidImageFormatError(
            f"Unsupported image format for '{filename}'. Allowed formats: PNG, JPEG, WebP."
        )

    def assess_image_quality(self, img_pil: Image.Image) -> Tuple[bool, float]:
        """
        Calculates Laplacian variance to detect out-of-focus, blurry screenshots.
        Returns (is_blurry, blur_score).
        """
        if not CV2_AVAILABLE:
            return False, 100.0

        try:
            # Convert PIL to grayscale numpy array
            gray = np.array(img_pil.convert("L"))
            var = cv2.Laplacian(gray, cv2.CV_64F).var()
            is_blurry = float(var) < self.BLUR_THRESHOLD
            return is_blurry, round(float(var), 2)
        except Exception as e:
            logger.debug(f"Blur estimation error: {e}")
            return False, 100.0

    def preprocess_image(self, img_pil: Image.Image) -> Image.Image:
        """
        Applies non-destructive in-memory image enhancement:
        - Converts color spaces to RGB (dropping alpha channels safely)
        - Upscales low-resolution screenshots for OCR legibility
        """
        if img_pil.mode in ("RGBA", "LA", "P"):
            rgb_img = Image.new("RGB", img_pil.size, (255, 255, 255))
            if img_pil.mode == "RGBA":
                rgb_img.paste(img_pil, mask=img_pil.split()[3])
            else:
                rgb_img.paste(img_pil.convert("RGB"))
            img_pil = rgb_img
        elif img_pil.mode != "RGB":
            img_pil = img_pil.convert("RGB")

        # Upscale if dimensions are very small (< 600px width)
        w, h = img_pil.size
        if w < 600 and w > 0:
            scale = 600.0 / float(w)
            new_size = (int(w * scale), int(h * scale))
            img_pil = img_pil.resize(new_size, Image.Resampling.LANCZOS)

        return img_pil

    def _clean_ocr_spaces(self, text: str) -> str:
        """
        Heuristic normalization for OCR text where spaces were dropped
        due to tight typography or font kerning in mobile screenshots.
        """
        if not text:
            return ""

        # Punctuation spacing: e.g. "Caller:Sir" -> "Caller: Sir"
        text = re.sub(r"([:,!;?])([A-Za-z0-9])", r"\1 \2", text)

        # Digit to letter & letter to digit transitions (except in URLs or UPI IDs)
        # Handle "in1hour" -> "in 1 hour", "Rs3500" -> "Rs 3500"
        text = re.sub(r"\b([a-zA-Z]+)(\d+)\b", r"\1 \2", text)
        text = re.sub(r"\b(\d+)([a-zA-Z]+)\b", r"\1 \2", text)

        # CamelCase word separation: "FedExParcel" -> "FedEx Parcel"
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

        # Common fused OCR keywords in Indian scam alerts
        fused_patterns = [
            (r"(?i)\bpleasepay\b", "Please pay"),
            (r"(?i)\bcustomsclearance\b", "customs clearance"),
            (r"(?i)\bclearancecharges\b", "clearance charges"),
            (r"(?i)\bsendpayment\b", "Send payment"),
            (r"(?i)\bpolicearrest\b", "police arrest"),
            (r"(?i)\barrestwarrant\b", "arrest warrant"),
            (r"(?i)\bnotpaid\b", "not paid"),
            (r"(?i)\bheldby\b", "held by"),
            (r"(?i)\bchargesof\b", "charges of"),
            (r"(?i)\byourfedex\b", "your FedEx"),
            (r"(?i)\bparcelis\b", "parcel is"),
        ]
        for pat, rep in fused_patterns:
            text = re.sub(pat, rep, text)

        return text

    def _assemble_lines_from_boxes(self, ocr_results) -> Tuple[str, float, int]:
        """
        Groups detected bounding boxes into natural horizontal lines (left-to-right),
        ordered vertically (top-to-bottom). Preserves inter-word spacing.
        """
        if not ocr_results:
            return "", 0.0, 0

        items = []
        confidences = []
        for item in ocr_results:
            box = item[0]
            text = str(item[1]).strip()
            if not text:
                continue
            text = self._clean_ocr_spaces(text)
            conf = float(item[2]) if len(item) > 2 else 0.85
            confidences.append(conf)
            y_center = (box[0][1] + box[2][1]) / 2.0
            x_left = box[0][0]
            h = abs(box[2][1] - box[0][1])
            items.append({"y": y_center, "x": x_left, "h": max(h, 12.0), "text": text})

        if not items:
            return "", 0.0, 0

        # Sort primarily by vertical coordinate
        items.sort(key=lambda it: it["y"])

        lines = []
        cur_line = []
        cur_y = None
        cur_h = 20.0

        for it in items:
            if cur_y is None:
                cur_line.append(it)
                cur_y = it["y"]
                cur_h = it["h"]
            elif abs(it["y"] - cur_y) < (cur_h * 0.75):
                cur_line.append(it)
            else:
                cur_line.sort(key=lambda x: x["x"])
                lines.append(" ".join([x["text"] for x in cur_line]))
                cur_line = [it]
                cur_y = it["y"]
                cur_h = it["h"]

        if cur_line:
            cur_line.sort(key=lambda x: x["x"])
            lines.append(" ".join([x["text"] for x in cur_line]))

        full_text = "\n".join(lines)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.85
        return full_text, round(float(avg_conf), 3), len(lines)

    def extract_text(self, img_pil: Image.Image) -> Tuple[str, float, int, str]:
        """
        Executes OCR extraction on PIL image.
        Returns: (extracted_text, average_confidence, line_count, engine_name)
        """
        engine_name = "RapidOCR (ONNX Runtime)"

        # 1. Primary: RapidOCR
        if self._rapid_engine is not None:
            try:
                img_np = np.array(img_pil)
                ocr_results, _ = self._rapid_engine(img_np)
                full_text, avg_conf, line_count = self._assemble_lines_from_boxes(ocr_results)
                return full_text, avg_conf, line_count, engine_name
            except Exception as e:
                logger.warning(f"RapidOCR inference encountered an error: {e}")

        # 2. Fallback: Host Tesseract (if configured)
        if self._tesseract_cmd_verified and pytesseract:
            try:
                engine_name = "Tesseract-OCR"
                data = pytesseract.image_to_data(
                    img_pil, output_type=pytesseract.Output.DICT
                )
                words = []
                word_confs = []
                for i in range(len(data.get("text", []))):
                    w = data["text"][i].strip()
                    c = float(data["conf"][i])
                    if w and c > 0:
                        words.append(w)
                        word_confs.append(c / 100.0)

                full_text = pytesseract.image_to_string(img_pil).strip()
                avg_conf = sum(word_confs) / len(word_confs) if word_confs else 0.80
                line_count = len([ln for ln in full_text.splitlines() if ln.strip()])
                return full_text, round(float(avg_conf), 3), line_count, engine_name
            except Exception as e:
                logger.warning(f"Tesseract OCR fallback error: {e}")

        return "", 0.0, 0, "None (OCR Unavailable)"

    def extract_entities(self, text: str) -> Dict[str, Any]:
        """
        Parses high-risk fintech entities from raw or edited message text:
        - UPI Virtual Payment Addresses (VPAs)
        - Mobile & toll-free phone numbers
        - Currency transaction amounts
        - URLs and suspicious domain links
        - Dates and timestamps
        - Scam and payment instructions
        """
        if not text:
            return {
                "upi_ids": [],
                "phone_numbers": [],
                "currency_amounts": [],
                "urls": [],
                "dates_and_timestamps": [],
                "payment_instructions": [],
            }

        # 1. UPI IDs: handle OCR space variations around '@'
        upi_pattern = re.compile(
            r"([a-zA-Z0-9.\-_]{2,64})\s*@\s*([a-zA-Z]{2,32})", re.IGNORECASE
        )
        raw_upis = upi_pattern.findall(text)
        cleaned_upis = list(
            dict.fromkeys(
                [f"{u[0].strip()}@{u[1].strip()}".lower() for u in raw_upis]
            )
        )

        # 2. Phone Numbers: Indian mobile formats (+91, 10-digit) and 1800 toll-free
        phone_pattern = re.compile(
            r"(?:\+?91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}|\b1800[\s\-]?\d{3}[\s\-]?\d{3,4}\b"
        )
        raw_phones = phone_pattern.findall(text)
        cleaned_phones = list(
            dict.fromkeys(
                [re.sub(r"[\s\-]", "", p) for p in raw_phones if len(p.strip()) >= 10]
            )
        )

        # 3. Currency Amounts: handles ₹, Rs, INR, and standalone or verb-associated amounts
        amount_patterns = [
            re.compile(r"(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE),
            re.compile(r"\b([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs|inr|/-)\b", re.IGNORECASE),
            re.compile(r"\b(?:pay|transfer|send|bhejo|amount|debited|credited|charges|fee|refund|balance)\s*(?:of|is|:)?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\b", re.IGNORECASE),
            re.compile(r"\b([\d,]+(?:\.\d{1,2})?)\s*(?:transfer|karein|bhejo|pay|deducted|debited)\b", re.IGNORECASE),
        ]
        amounts: List[float] = []
        for pat in amount_patterns:
            for match in pat.findall(text):
                cleaned_str = str(match).replace(",", "").strip()
                try:
                    val = float(cleaned_str)
                    if 0 < val <= 5000000:
                        amounts.append(val)
                except ValueError:
                    continue
        amounts = sorted(list(set(amounts)), reverse=True)

        # 4. URLs: HTTP/HTTPS, short URLs, and suspicious scam TLDs (.apk, .xyz, etc.)
        url_pattern = re.compile(
            r"https?://[^\s\"'<>]+|"
            r"(?:bit\.ly|tinyurl\.com|t\.me|wa\.me)/[a-zA-Z0-9_\-]+|"
            r"\b[a-zA-Z0-9\-\.]+\.(?:apk|xyz|top|site|club|online|cc|ru|vip)(?:/[^\s\"'<>]*)?",
            re.IGNORECASE,
        )
        urls = list(dict.fromkeys(url_pattern.findall(text)))

        # 5. Dates and Timestamps
        date_time_pattern = re.compile(
            r"\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|"
            r"\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b|"
            r"\b(?:Today|Yesterday|Tomorrow)\b",
            re.IGNORECASE,
        )
        timestamps = list(dict.fromkeys(date_time_pattern.findall(text)))

        # 6. Payment Instructions
        instruction_keywords = [
            "pay", "transfer", "send money", "enter upi pin", "enter pin",
            "scan qr", "collect request", "approve request", "claim refund",
            "debit", "credit", "paise transfer", "bhejo", "pin dalein",
            "kyc update", "verify account", "block account", "screen share",
            "anydesk", "rustdesk", "quicksupport", "download apk"
        ]
        text_lower = text.lower()
        instructions = [
            kw for kw in instruction_keywords if kw in text_lower
        ]

        return {
            "upi_ids": cleaned_upis,
            "phone_numbers": cleaned_phones,
            "currency_amounts": amounts,
            "urls": urls,
            "dates_and_timestamps": timestamps,
            "payment_instructions": instructions,
        }

    def process_screenshot(
        self, image_bytes: bytes, filename: str = "screenshot.png"
    ) -> Dict[str, Any]:
        """
        End-to-end in-memory screenshot ingestion, quality assessment, OCR,
        and entity extraction.
        Never persists bytes to disk.
        """
        # 1. Validation
        fmt = self.validate_image_bytes(image_bytes, filename)

        # 2. In-memory PIL Load
        try:
            raw_img = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise InvalidImageFormatError(f"Could not decode image bytes: {e}")

        # 3. Quality assessment
        is_blurry, blur_score = self.assess_image_quality(raw_img)

        # 4. Preprocessing
        enhanced_img = self.preprocess_image(raw_img)

        # 5. OCR Execution
        text, avg_conf, line_count, engine_name = self.extract_text(enhanced_img)

        # 6. Entity Extraction
        entities = self.extract_entities(text)

        warning_notes: List[str] = []
        if is_blurry:
            warning_notes.append(
                f"Image appears blurry (sharpness score: {blur_score:.1f} < {self.BLUR_THRESHOLD}). "
                "Text recognition accuracy may be reduced."
            )
        if line_count == 0 or not text.strip():
            warning_notes.append(
                "No readable text was detected in the provided image. "
                "Ensure the screenshot is clear and contains text."
            )

        return {
            "extracted_text": text,
            "ocr_engine": engine_name,
            "average_confidence": avg_conf,
            "line_count": line_count,
            "is_blurry": is_blurry,
            "blur_score": blur_score,
            "warning_notes": warning_notes,
            "entities": entities,
            "privacy_notice": "Screenshot processed strictly in-memory. Zero disk persistence or long-term storage.",
        }


# Singleton instance for backend service injection
ocr_service = OCRService()
