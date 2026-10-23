import os
from pathlib import Path
from typing import Dict, Any, List
import joblib
import numpy as np
from flask import current_app

MODEL_CACHE = None

def get_model_artifact():
    global MODEL_CACHE
    if MODEL_CACHE is not None:
        return MODEL_CACHE

    model_path = current_app.config.get("ML_MODEL_PATH")
    if model_path and Path(model_path).exists():
        try:
            MODEL_CACHE = joblib.load(model_path)
            return MODEL_CACHE
        except Exception as e:
            current_app.logger.warning(f"Could not load ML artifact from {model_path}: {e}")

    return None

def predict_ppd_risk(
    epds_score: int,
    sleep_hours: float = 6.0,
    history_of_depression: int = 0,
    social_support_score: int = 3,
    parity: int = 1,
    delivery_complication: int = 0,
    infant_colic_score: int = 2,
    gestational_age_weeks: int = 39
) -> Dict[str, Any]:
    """
    Predicts postpartum depression risk probability using the trained ML model.
    Clearly distinguishes ML probability estimate from validated EPDS scale thresholds.
    """
    artifact = get_model_artifact()

    features_dict = {
        "epds_score": float(epds_score),
        "sleep_hours_avg": float(sleep_hours),
        "history_of_depression": int(history_of_depression),
        "social_support_score": int(social_support_score),
        "parity": int(parity),
        "delivery_complication": int(delivery_complication),
        "infant_colic_score": int(infant_colic_score),
        "gestational_age_weeks": int(gestational_age_weeks)
    }

    if artifact and "model" in artifact:
        model = artifact["model"]
        feature_names = artifact.get("feature_names", list(features_dict.keys()))
        input_vector = [features_dict[name] for name in feature_names]
        
        prob = float(model.predict_proba([input_vector])[0][1])
        model_version = artifact.get("version", "1.0.0-academic")
        model_name = artifact.get("model_name", "RandomForestClassifier")
    else:
        # Fallback heuristic calculation if model file not yet compiled
        logit = (
            0.18 * (epds_score - 9)
            - 0.45 * (sleep_hours - 6)
            + 1.25 * history_of_depression
            - 0.55 * (social_support_score - 3)
            + 0.40 * delivery_complication
            + 0.35 * (infant_colic_score - 2.5)
            - 0.08 * (gestational_age_weeks - 38)
            - 0.85
        )
        prob = float(1.0 / (1.0 + np.exp(-logit)))
        prob = max(0.02, min(0.98, prob))
        model_version = "1.0.0-heuristic-fallback"
        model_name = "LogisticClinicalPrior"

    # Category classification based on risk probability
    if prob >= 0.65:
        category = "high"
        guidance = "Elevated risk profile detected across combined clinical and behavioral indicators. Clinical evaluation and personalized care plan strongly suggested."
    elif prob >= 0.35:
        category = "moderate"
        guidance = "Moderate risk factors detected. Regular emotional tracking, peer support, and family assistance recommended."
    else:
        category = "low"
        guidance = "Risk metrics within standard postpartum adaptation range. Continue supportive self-care and routine pediatric visits."

    # Top contributing features explanation
    top_features = []
    if epds_score >= 10:
        top_features.append({
            "feature": "EPDS Screening Score",
            "value": f"{epds_score}/30",
            "impact": "High positive contributor to risk",
            "clinical_relevance": "Standardized depressive symptom severity reported over past 7 days"
        })
    if sleep_hours < 5.5:
        top_features.append({
            "feature": "Severe Sleep Deprivation",
            "value": f"{sleep_hours} hrs/night",
            "impact": "Increases emotional vulnerability",
            "clinical_relevance": "Fragmented or inadequate REM/deep sleep impairs mood regulation"
        })
    if history_of_depression == 1:
        top_features.append({
            "feature": "Prior Depressive History",
            "value": "Yes",
            "impact": "Significant established predisposing factor",
            "clinical_relevance": "Personal history is one of the strongest epidemiological predictors for PPD"
        })
    if social_support_score <= 2:
        top_features.append({
            "feature": "Low Perceived Social Support",
            "value": f"{social_support_score}/5",
            "impact": "Reduces protective buffer",
            "clinical_relevance": "Limited instrumental or emotional support increases parental stress"
        })
    if not top_features:
        top_features.append({
            "feature": "Postpartum Adaptation Baseline",
            "value": "Stable",
            "impact": "Protective factors dominant",
            "clinical_relevance": "Support, rest, and screening scores are within favorable parameters"
        })

    return {
        "predicted_risk_score": round(prob, 3),
        "predicted_category": category,
        "clinical_guidance": guidance,
        "model_name": model_name,
        "model_version": model_version,
        "top_features": top_features,
        "disclaimer": "This machine learning estimate is strictly for academic research demonstration and educational decision-support. It is NOT a validated medical device and must never substitute for a licensed healthcare provider's clinical judgment."
    }
