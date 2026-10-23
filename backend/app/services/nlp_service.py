import re
from typing import Dict, Any, List

# Lexicons for emotion theme mapping and polarity estimation
EMOTION_LEXICON = {
    "exhaustion": ["exhausted", "tired", "sleepy", "drained", "weary", "fatigued", "sleepless", "no sleep", "restless"],
    "anxiety": ["anxious", "worried", "scared", "nervous", "panicky", "fear", "dread", "tense", "stress", "stressed"],
    "sadness": ["sad", "down", "unhappy", "cry", "crying", "miserable", "lonely", "isolated", "empty", "gloomy"],
    "overwhelmed": ["overwhelmed", "too much", "cannot cope", "swamped", "burden", "drowning", "pressure"],
    "guilt": ["guilty", "bad mom", "bad mother", "failing", "fault", "blame", "inadequate"],
    "gratitude": ["grateful", "thankful", "blessed", "appreciate", "joy", "loved", "cherish", "happy", "smile"],
    "calm": ["peaceful", "calm", "relaxed", "better", "settled", "relieved", "hopeful", "resting"]
}

POSITIVE_WORDS = {
    "happy", "joy", "good", "great", "better", "blessed", "wonderful", "calm", 
    "peaceful", "relief", "relieved", "grateful", "love", "loved", "healing", 
    "resting", "progress", "smile", "laugh", "bright", "comfort", "supported"
}

NEGATIVE_WORDS = {
    "sad", "exhausted", "tired", "anxious", "worried", "cry", "crying", "tears", 
    "hard", "difficult", "struggling", "scared", "guilty", "pain", "hopeless", 
    "failing", "lonely", "alone", "overwhelmed", "pressure", "drained", "awful"
}

def analyze_journal_nlp(text: str) -> Dict[str, Any]:
    """
    Modular, privacy-conscious NLP text analysis.
    Computes sentiment polarity (-1.0 to +1.0) and detects dominant emotional themes.
    Does NOT send private journal text to external third-party services.
    """
    if not text or not text.strip():
        return {
            "sentiment_score": 0.0,
            "sentiment_label": "neutral",
            "dominant_emotion": "neutral",
            "detected_themes": [],
            "word_count": 0,
            "disclaimer": "NLP emotion analysis is an algorithmic reflection tool. It does not establish clinical diagnoses or replace clinical evaluations."
        }

    words = re.findall(r"\b[a-zA-Z']+\b", text.lower())
    total_words = len(words)
    if total_words == 0:
        return {
            "sentiment_score": 0.0,
            "sentiment_label": "neutral",
            "dominant_emotion": "neutral",
            "detected_themes": [],
            "word_count": 0,
            "disclaimer": "NLP emotion analysis is an algorithmic reflection tool. It does not establish clinical diagnoses or replace clinical evaluations."
        }

    pos_count = sum(1 for w in words if w in POSITIVE_WORDS)
    neg_count = sum(1 for w in words if w in NEGATIVE_WORDS)

    # Polarity calculation bounded between -1.0 and +1.0
    denom = max(1, pos_count + neg_count)
    polarity = (pos_count - neg_count) / denom
    polarity = round(polarity, 2)

    if polarity > 0.15:
        sentiment_label = "positive"
    elif polarity < -0.15:
        sentiment_label = "negative"
    else:
        sentiment_label = "neutral"

    # Detect emotional themes
    theme_counts = {}
    for theme, keywords in EMOTION_LEXICON.items():
        count = sum(1 for w in words if w in keywords)
        if count > 0:
            theme_counts[theme] = count

    sorted_themes = sorted(theme_counts.items(), key=lambda item: item[1], reverse=True)
    detected_themes = [t[0] for t in sorted_themes]
    dominant_emotion = detected_themes[0] if detected_themes else sentiment_label

    return {
        "sentiment_score": polarity,
        "sentiment_label": sentiment_label,
        "dominant_emotion": dominant_emotion,
        "detected_themes": detected_themes,
        "word_count": total_words,
        "positive_word_count": pos_count,
        "negative_word_count": neg_count,
        "disclaimer": "NLP emotion analysis is an algorithmic reflection tool. It does not establish clinical diagnoses or replace clinical evaluations."
    }
