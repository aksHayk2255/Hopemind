import re
from typing import Dict, Any, Tuple

CRISIS_PATTERNS = {
    "suicide_self_harm": [
        r"\bkill\s+myself\b",
        r"\bsuicid(e|al)\b",
        r"\bend\s+my\s+life\b",
        r"\bwant\s+to\s+die\b",
        r"\bdon'?t\s+want\s+to\s+live\b",
        r"\bbetter\s+off\s+dead\b",
        r"\bhurt\s+myself\b",
        r"\bharm(ing)?\s+myself\b",
        r"\bcut(ting)?\s+myself\b",
        r"\boverdose\b",
        r"\bdon'?t\s+want\s+to\s+wake\s+up\b"
    ],
    "infant_harm": [
        r"\bhurt\s+(my|the)?\s*baby\b",
        r"\bharm\s+(my|the)?\s*baby\b",
        r"\bshake\s+(my|the)?\s*baby\b",
        r"\bthrow\s+(my|the)?\s*baby\b",
        r"\bdrop\s+(my|the)?\s*baby\s+on\s+purpose\b",
        r"\bhit\s+(my|the)?\s*baby\b",
        r"\bsmother\s+(my|the)?\s*baby\b"
    ],
    "severe_despair": [
        r"\bcan'?t\s+take\s+this\s+anymore\b",
        r"\bno\s+point\s+in\s+living\b",
        r"\beveryone\s+would\s+be\s+better\s+without\s+me\b",
        r"\bhopeless\s+and\s+trapped\b"
    ]
}

def analyze_safety(text: str) -> Tuple[bool, str, list]:
    """
    Evaluates input text for signs of crisis, suicidal ideation, or harm.
    Returns: (is_crisis, category, matched_phrases)
    """
    if not text:
        return False, "safe", []
        
    normalized = text.lower()
    
    # Priority 1: Check infant harm
    for pattern in CRISIS_PATTERNS["infant_harm"]:
        matches = re.findall(pattern, normalized)
        if matches:
            return True, "infant_harm", matches

    # Priority 2: Check self-harm / suicide
    for pattern in CRISIS_PATTERNS["suicide_self_harm"]:
        matches = re.findall(pattern, normalized)
        if matches:
            return True, "suicide_self_harm", matches

    # Priority 3: Check severe despair
    for pattern in CRISIS_PATTERNS["severe_despair"]:
        matches = re.findall(pattern, normalized)
        if matches:
            return True, "severe_despair", matches

    return False, "safe", []

def get_crisis_response(category: str, emergency_contacts: list) -> Dict[str, Any]:
    """Generates an immediate, empathetic crisis intervention payload."""
    contacts_summary = "\n".join([f"- {c['name']}: {c['number']} ({c['available']})" for c in emergency_contacts[:3]])
    
    if category == "infant_harm":
        message = (
            "We hear that you are going through an extraordinarily overwhelming moment. Your feelings and stress are valid, "
            "but the safety of you and your baby is the utmost priority right now. Please place your baby in a safe crib or bassinet, "
            "step away into another room for a few moments, and contact immediate help. You are not alone, and help is available 24/7."
        )
    else:
        message = (
            "I want you to know that you are deeply valued, and you do not have to carry this immense weight alone. "
            "Postpartum emotions can feel unbearable, but there is real, compassionate support available right this very moment. "
            "Please reach out immediately to a caring professional or crisis helpline listed below."
        )

    return {
        "is_crisis": True,
        "category": category,
        "message": message,
        "emergency_contacts": emergency_contacts,
        "action_required": "Please call an emergency helpline or reach out to your designated doctor or trusted family member immediately."
    }
