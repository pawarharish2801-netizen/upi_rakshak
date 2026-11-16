"""
UPI Rakshak - Module A: Advanced Conversation Intelligence Engine
Provides multi-lingual semantic context analysis, relationship parsing, and threat extraction.
"""

import re
import uuid
from typing import List, Tuple, Dict, Any, Optional
try:
    from app.context.schemas import (
        ScamSignal,
        ConversationAnalysisResult,
    )
except ImportError:
    from backend.app.context.schemas import (
        ScamSignal,
        ConversationAnalysisResult,
    )

# Common Hinglish Markers
HINGLISH_WORDS = {
    "karo", "kijiye", "karein", "bhejo", "batao", "bataiye", "raha", "rahi", "hai", "hain",
    "nahi", "mat", "paise", "khata", "band", "turant", "jaldi", "aayega", "aayenge", "hoga",
    "chahiye", "kaise", "karna", "aapka", "aapke", "hua", "toh", "jayega", "mein", "mera",
    "apna", "shuru", "kholna", "rok", "police", "dar", "vapas", "wapas", "khatre", "giraftari"
}

# Educational & Negation Guards (False positive suppression)
EDUCATIONAL_GUARDS = [
    re.compile(r"\b(beware of|never share|do not share|don't share|never enter|do not enter|be cautious|awareness|scam alert|fraud warning|rbi cautions|bank never asks|advisory)\b", re.I),
    re.compile(r"\b(kabhi.*share.*mat.*karna|kisi.*ko.*mat.*batao|savdhan.*rahein|chetavni|satark.*rahein|rbi.*kehta.*hai)\b", re.I),
    re.compile(r"(कभी.*शेयर.*न.*करें|सावधान.*रहें|सतर्क.*रहें|बैंक.*कभी.*नहीं.*मांगता|चेतावनी)", re.I),
]

# 14 Core Threat Pattern Clusters
PATTERNS = {
    "BANK_IMPERSONATION": {
        "label": "Bank / Financial Authority Impersonation",
        "severity": "HIGH",
        "weight": 30.0,
        "regex": [
            re.compile(r"\b(?:calling|speaking|officer|manager|security.*cell|fraud.*dept|vigilance|head.*office|nodal.*officer|customer.*care).*from.*(?:bank|rbi|sbi|hdfc|icici|axis|pnb|kotak)\b", re.I),
            re.compile(r"\b(?:bank|rbi|sbi|hdfc|axis|pnb|icici).*(?:account|safety|fraud.*prevention|safety.*audit|manager.*calling|vigilance.*(?:team|manager|dept)|security.*officer)\b", re.I),
            re.compile(r"\b(?:bank|rbi|sbi|hdfc|axis).*(?:se.*bol.*raha|se.*call.*hai|ka.*manager|ki.*taraf.*se|head.*office.*se)\b", re.I),
            re.compile(r"(बैंक|आरबीआई|एसबीआई|एचडीएफसी|प्रबंधक|अधिकारी).*(से.*बोल.*रहा|की.*तरफ.*से|मुख्यालय.*से)", re.I),
        ]
    },
    "DIGITAL_ARREST": {
        "label": "Digital Arrest / Law Enforcement Coercion",
        "severity": "CRITICAL",
        "weight": 40.0,
        "regex": [
            re.compile(r"\b(digital.*arrest|cbi|police|narcotics|customs|cyber.*crime|trai|court.*warrant|arrest.*warrant|money.*laundering|illegal.*parcel)\b", re.I),
            re.compile(r"\b(police|cbi|customs|crime.*branch).*(arrest|giraftar|jail|case.*darj|fir.*hogi|warrant)\b", re.I),
            re.compile(r"\b(stay.*on.*video|do.*not.*disconnect|video.*call.*par.*raho|camera.*on.*rakho|confidential.*interrogation)\b", re.I),
            re.compile(r"(डिजिटल.*अरेस्ट|सीबीआई|पुलिस|नारकोटिक्स|कस्टम्स|वारंट|मनी.*लॉन्ड्रिंग|गिरफ्तारी)", re.I),
        ]
    },
    "PIN_TO_RECEIVE": {
        "label": "UPI PIN Demanded to Receive Funds (Severe Deception)",
        "severity": "CRITICAL",
        "weight": 45.0,
        "regex": [
            re.compile(r"\b(enter|type|put|dial|provide).*upi.*pin.*(to|for).*(receive|credit|accept|claim|deposit|get|refund)\b", re.I),
            re.compile(r"\b(upi.*pin|pin).*(dalo|enter.*karo|enter.*kijiye|enter.*karein|enterkarein|lagao).*(paise.*aayenge|credit.*hoga|refund.*mil.*jayega|receive.*karein|receivekarein)\b", re.I),
            re.compile(r"\b(?:enter|type|put).*pin.*to.*(?:receive|get|claim)\b", re.I),
            re.compile(r"\b(?:upi.*pin|pin).*(?:is.*required|needed).*to.*receive\b", re.I),
            re.compile(r"\b(refund|cashback|prize|reward).*(?:ke.*liye)?.*(?:upi.*pin|pin).*(?:enter|type|dalo|lagao|karein)\b", re.I),
            re.compile(r"(पैसे.*प्राप्त.*करने|रिफंड.*पाने).*पिन.*(दर्ज|डालें)", re.I),
        ]
    },
    "OTP_DISCLOSURE": {
        "label": "OTP / Security Code Disclosure Request",
        "severity": "CRITICAL",
        "weight": 35.0,
        "regex": [
            re.compile(r"\b(share|tell|give|read.*out|send|provide).*(otp|one.*time.*password|6.*digit.*code|sms.*code|secret.*code)\b", re.I),
            re.compile(r"\b(otp|code).*(batao|bhejo|bataiye|forward.*karo|share.*kijiye)\b", re.I),
            re.compile(r"(ओटीपी|कोड).*(शेयर.*करें|बताएं|भेजें)", re.I),
        ]
    },
    "REMOTE_ACCESS": {
        "label": "Remote Screen-Sharing / Takeover Tool",
        "severity": "CRITICAL",
        "weight": 40.0,
        "regex": [
            re.compile(r"\b(install|download|open|start).*(anydesk|teamviewer|quicksupport|anymeeting|rustdesk|airmirror)\b", re.I),
            re.compile(r"\b(screen.*share|remote.*support|share.*your.*screen|screen.*dikhao)\b", re.I),
            re.compile(r"\b(anydesk|teamviewer|quicksupport).*(download.*karo|install.*kijiye|chalu.*karo)\b", re.I),
            re.compile(r"(एनीडेस्क|टीमव्यूअर|स्क्रीन.*शेयर).*(डाउनलोड|इंस्टॉल|चालू)", re.I),
        ]
    },
    "FAKE_KYC": {
        "label": "Fake KYC Expiration / Account Freeze Threat",
        "severity": "HIGH",
        "weight": 30.0,
        "regex": [
            re.compile(r"\b(kyc.*(?:expired|expiring|update|pending)|aadhaar.*pan.*link|sim.*deactivat[a-z]*|account.*(?:block|freeze)[a-z]*|account.*suspension|account.*suspended)\b", re.I),
            re.compile(r"\b(?:account|bank.*account|card).*(?:will.*be.*blocked|has.*been.*blocked|suspended|frozen|block.*ho.*jayega)\b", re.I),
            re.compile(r"\b(kyc.*khatam|kyc.*update.*karo|khata.*(?:band|block).*(?:hoga|ho.*jayega)|sim.*band.*ho.*jayegi|account.*freeze.*hoga)\b", re.I),
            re.compile(r"(केवाईसी.*समाप्त|केवाईसी.*अपडेट|खाता.*ब्लॉक|सिम.*बंद)", re.I),
        ]
    },
    "UTILITY_DISCONNECTION": {
        "label": "Utility / Electricity Power Disconnection Scare",
        "severity": "HIGH",
        "weight": 30.0,
        "regex": [
            re.compile(r"\b(electricity|power|bill).*(?:disconnected|disconnect|cut.*off|suspended)\b", re.I),
            re.compile(r"\b(bijli|power).*(?:kat.*di.*jayegi|band.*ho.*jayegi|disconnect.*hogi)\b", re.I),
            re.compile(r"(बिजली.*काट.*दी.*जाएगी|बिजली.*बिल|पावर.*कट)", re.I),
        ]
    },
    "REFUND_MANIPULATION": {
        "label": "Fake Refund / Cashback Trap",
        "severity": "HIGH",
        "weight": 30.0,
        "regex": [
            re.compile(r"\b(refund.*approved|claim.*refund|processing.*cashback|double.*payment.*reversal|wrong.*transfer.*refund)\b", re.I),
            re.compile(r"\b(refund.*(?:ke.*liye|lene)|cashback.*claim|paise.*wapas.*lene|reversal.*karne)\b", re.I),
            re.compile(r"(रिफंड.*स्वीकृत|कैशबैक.*दावा|पैसे.*वापस)", re.I),
        ]
    },
    "QR_MANIPULATION": {
        "label": "QR Code Scan to Receive Trap",
        "severity": "HIGH",
        "weight": 35.0,
        "regex": [
            re.compile(r"\b(scan.*qr.*to.*receive|qr.*code.*se.*paise.*aate|scan.*this.*code.*for.*refund)\b", re.I),
            re.compile(r"\bqr.*(?:code)?.*scan.*(?:karke|karo|kijiye|karna)\b", re.I),
            re.compile(r"(क्यूआर.*स्कैन.*करके.*पैसे.*प्राप्त)", re.I),
        ]
    },
    "LOTTERY_CASHBACK": {
        "label": "Lottery / Prize / Cashback Clearance Scam",
        "severity": "HIGH",
        "weight": 35.0,
        "regex": [
            re.compile(r"\b(won.*lottery|lottery.*winner|won.*cash.*prize|tax.*clearance|claim.*prize|kbc.*lottery)\b", re.I),
            re.compile(r"\b(lottery.*lagi.*hai|inam.*mila.*hai|prize.*money)\b", re.I),
            re.compile(r"(लॉटरी.*जीती|इनाम|प्राइज.*मनी)", re.I),
        ]
    },
    "FEAR_URGENCY": {
        "label": "Artificial Urgency & Coercive Deadline",
        "severity": "MEDIUM",
        "weight": 20.0,
        "regex": [
            re.compile(r"\b(immediately|within.*10.*minutes|within.*15.*minutes|urgent|tonight.*deadline|last.*warning|final.*notice|hurry)\b", re.I),
            re.compile(r"\b(turant|jaldi.*kijiye|aaj.*raat.*tak|aakhri.*mauka|warna.*band.*ho.*jayega)\b", re.I),
            re.compile(r"(तुरंत.*करें|जल्दी|अंतिम.*सूचना|समय.*सीमा)", re.I),
        ]
    },
    "INVESTMENT_SCAM": {
        "label": "High-Yield Investment / Crypto Ponzi Scheme",
        "severity": "HIGH",
        "weight": 35.0,
        "regex": [
            re.compile(r"\b(guaranteed.*(?:return|profit)|double.*your.*money|daily.*profit|[0-9]+%.*daily.*profit|crypto.*mining.*bot|trading.*signal.*group|minimum.*deposit)\b", re.I),
            re.compile(r"\b(paisa.*double|rozana.*munafa|guaranteed.*kamai|investment.*plan)\b", re.I),
            re.compile(r"(गारंटीड.*रिटर्न|दोगुना.*पैसा|दैनिक.*लाभ|निवेश.*योजना)", re.I),
        ]
    },
    "FAKE_JOB_OFFER": {
        "label": "Bogus Job Registration / Task Scam",
        "severity": "HIGH",
        "weight": 35.0,
        "regex": [
            re.compile(r"\b(part.*time.*job|work.*from.*home|like.*youtube.*videos|telegram.*task|registration.*fee.*for.*job|registration.*fee)\b", re.I),
            re.compile(r"\b(ghar.*baithe.*kamai|part.*time.*kaam|task.*karo.*paise.*kamao)\b", re.I),
            re.compile(r"(घर.*बैठे.*काम|पार्ट.*टाइम.*जॉब|टास्क.*कमाई)", re.I),
        ]
    },
    "SUSPICIOUS_APK_LINK": {
        "label": "Malicious APK / Shortened Phishing Link",
        "severity": "CRITICAL",
        "weight": 35.0,
        "regex": [
            re.compile(r"\b(download.*apk|install.*this.*app|bit\.ly|tinyurl|is\.gd|apk.*file|update.*app\.apk)\b", re.I),
            re.compile(r"\b(link.*par.*click.*karo|apk.*install.*karo|ye.*app.*chalu.*karo)\b", re.I),
            re.compile(r"(एपीके.*डाउनलोड|लिंक.*पर.*क्लिक|ऐप.*इंस्टॉल)", re.I),
        ]
    },
}


def detect_language(text: str) -> str:
    """Detects if text is English, Hindi Devanagari, or Hinglish."""
    if not text:
        return "en"
    clean = text.strip()
    devanagari_count = len(re.findall(r"[\u0900-\u097F]", clean))
    latin_count = len(re.findall(r"[a-zA-Z]", clean))

    if devanagari_count > 5 and devanagari_count >= (latin_count * 0.4):
        return "hi"

    words = re.findall(r"[a-zA-Z]+", clean.lower())
    if words:
        hinglish_hits = sum(1 for w in words if w in HINGLISH_WORDS)
        if hinglish_hits >= 2 or (len(words) >= 4 and (hinglish_hits / len(words)) >= 0.15):
            return "hinglish"

    return "en"


def is_educational_or_benign_discussion(text: str) -> bool:
    """Checks whether the text is talking about scams educationally rather than attacking."""
    text_lower = text.lower()
    for guard in EDUCATIONAL_GUARDS:
        if guard.search(text_lower):
            # Check if there are aggressive second-person commands (e.g. "enter your pin right now")
            urgent_imperatives = [
                "your account will be blocked unless you",
                "transfer immediately to",
                "i am calling from police",
                "pay now",
                "turant transfer karo",
            ]
            if not any(imp in text_lower for imp in urgent_imperatives):
                return True
    return False


def extract_amounts(text: str) -> List[float]:
    """Extracts explicit currency amounts from conversation text."""
    amounts: List[float] = []
    # Patterns like ₹5000, Rs 4999, 5,000 rupees, 5000/-
    patterns = [
        r"[₹Rs\.]+\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)",
        r"\b([0-9]+(?:,[0-9]{2,3})*)\s*(?:rupees|rs|inr|rupya|rupaye|\/-)",
    ]
    for p in patterns:
        for match in re.finditer(p, text, re.I):
            clean_str = match.group(1).replace(",", "")
            try:
                val = float(clean_str)
                if 1.0 <= val <= 10000000.0 and val not in amounts:
                    amounts.append(val)
            except ValueError:
                continue
    return amounts


def extract_named_entities(text: str) -> List[str]:
    """Extracts key institutional entities or software names."""
    entities: List[str] = []
    targets = [
        "SBI", "HDFC", "ICICI", "Axis Bank", "RBI", "CBI", "Cyber Crime",
        "Police", "AnyDesk", "TeamViewer", "QuickSupport", "WhatsApp", "Telegram",
        "Aadhaar", "TRAI", "Income Tax", "Amazon", "Flipkart", "Swiggy", "Zomato"
    ]
    for t in targets:
        if re.search(r"\b" + re.escape(t) + r"\b", text, re.I):
            entities.append(t)
    return entities


class ConversationIntelligenceEngine:
    """
    Advanced Conversation Scanner analyzing linguistic signals,
    relational threats, and psychological coercion markers.
    """

    def analyze(self, text: str) -> ConversationAnalysisResult:
        if not text or not text.strip():
            return ConversationAnalysisResult(
                intent="BENIGN_CONVERSATION",
                scam_category="Legitimate",
                language="en",
                context_risk_score=0,
                confidence=0.95,
                is_educational_or_benign=True,
                signals=[],
                evidence_snippets=[],
                relationship_detected=None,
                extracted_amounts=[],
                extracted_entities=[],
                explanation="No conversational context provided.",
            )

        # Defense-in-depth: cap input text length to 15,000 characters to prevent ReDoS / CPU spikes
        MAX_ANALYSIS_CHARS = 15000
        safe_text = text[:MAX_ANALYSIS_CHARS]

        lang = detect_language(safe_text)
        is_educational = is_educational_or_benign_discussion(safe_text)
        extracted_amounts = extract_amounts(safe_text)
        extracted_entities = extract_named_entities(safe_text)

        signals: List[ScamSignal] = []
        matched_categories = set()

        for cat_key, cat_data in PATTERNS.items():
            for rgx in cat_data["regex"]:
                for m in rgx.finditer(safe_text):
                    evidence_text = m.group(0).strip()
                    sig_id = f"sig_{cat_key.lower()}_{len(signals)}"
                    signal = ScamSignal(
                        id=sig_id,
                        category=cat_key,
                        label=cat_data["label"],
                        evidence=evidence_text,
                        severity=cat_data["severity"],
                        weight=cat_data["weight"],
                        start_char=m.start(),
                        end_char=m.end(),
                        reason=f"Detected pattern for {cat_data['label']}",
                    )
                    signals.append(signal)
                    matched_categories.add(cat_key)
                    break  # Take primary hit per category

        # Compound Relational Threat Detection
        has_threat = "DIGITAL_ARREST" in matched_categories or "FAKE_KYC" in matched_categories or "BANK_IMPERSONATION" in matched_categories
        has_urgency = "FEAR_URGENCY" in matched_categories
        has_demand = "PIN_TO_RECEIVE" in matched_categories or "OTP_DISCLOSURE" in matched_categories or "REMOTE_ACCESS" in matched_categories or len(extracted_amounts) > 0

        relationship = None
        relational_multiplier = 1.0

        if has_threat and has_urgency and has_demand:
            relationship = "COMPOUND_THREAT_SYNERGY: Coercive Authority Threat + Strict Deadline + Financial/PIN Demand"
            relational_multiplier = 1.35
        elif has_threat and has_demand:
            relationship = "THREAT_DEMAND_COUPLE: Direct consequence threat coupled with payment or credential demand"
            relational_multiplier = 1.20
        elif has_urgency and has_demand:
            relationship = "URGENT_DEMAND_COUPLE: Time-pressured deadline driving hurried payment execution"
            relational_multiplier = 1.15

        # Calculate raw risk score
        if is_educational:
            signals = []
            context_score = 5
            intent = "EDUCATIONAL_OR_WARNING"
            scam_cat = "Educational_Alert"
            confidence = 0.92
            explanation = "Educational or cautionary discussion. Scam terminology referenced without active imperative threat directed at user."
        elif not signals:
            context_score = 0
            intent = "BENIGN_MESSAGE"
            scam_cat = "Legitimate"
            confidence = 0.90
            explanation = "Conversation appears clean with zero detected coercive or deceitful markers."
        else:
            base_score = sum(s.weight for s in signals)
            if "PIN_TO_RECEIVE" in matched_categories or "DIGITAL_ARREST" in matched_categories or "REMOTE_ACCESS" in matched_categories:
                # Direct critical floor
                base_score = max(base_score, 85.0)

            final_score = int(min(100, round(base_score * relational_multiplier)))
            context_score = final_score

            # Primary Category Selection
            if "DIGITAL_ARREST" in matched_categories:
                scam_cat = "Digital_Arrest"
                intent = "COERCIVE_LAW_ENFORCEMENT_EXTORTION"
            elif "PIN_TO_RECEIVE" in matched_categories or "REFUND_MANIPULATION" in matched_categories:
                scam_cat = "Fake_Refund"
                intent = "DECEPTIVE_REFUND_OR_COLLECT_TRAP"
            elif "REMOTE_ACCESS" in matched_categories:
                scam_cat = "Screen_Sharing_Scam"
                intent = "DEVICE_TAKEOVER_ATTEMPT"
            elif "BANK_IMPERSONATION" in matched_categories or "FAKE_KYC" in matched_categories:
                scam_cat = "Fake_Customer_Care"
                intent = "BANK_OR_KYC_IMPERSONATION"
            elif "QR_MANIPULATION" in matched_categories:
                scam_cat = "QR_Code_Scam"
                intent = "MALICIOUS_QR_REVERSAL"
            elif "INVESTMENT_SCAM" in matched_categories:
                scam_cat = "Investment_Scam"
                intent = "FRAUDULENT_HIGH_YIELD_SCHEME"
            elif "FAKE_JOB_OFFER" in matched_categories:
                scam_cat = "Fake_Job_Offer"
                intent = "BOGUS_TASK_EMPLOYMENT_FEE"
            else:
                scam_cat = "Social_Engineering_Suspicion"
                intent = "PRESSURE_TACTIC_DETECTED"

            confidence = 0.95 if context_score >= 80 else 0.85
            evidence_count = len(signals)
            explanation = f"Detected {evidence_count} threat indicators including {scam_cat.replace('_', ' ')}. {relationship or 'Individual coercion cues observed.'}"

        return ConversationAnalysisResult(
            intent=intent,
            scam_category=scam_cat,
            language=lang,
            context_risk_score=context_score,
            confidence=confidence,
            is_educational_or_benign=is_educational,
            signals=signals,
            evidence_snippets=[s.evidence for s in signals],
            relationship_detected=relationship,
            extracted_amounts=extracted_amounts,
            extracted_entities=extracted_entities,
            explanation=explanation,
        )


# Global singleton
conversation_engine = ConversationIntelligenceEngine()
