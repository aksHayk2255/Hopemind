from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.ml_service import predict_ppd_risk, get_model_artifact
from app.services.nlp_service import analyze_journal_nlp

ml_bp = Blueprint("ml", __name__)

@ml_bp.route("/predict", methods=["POST"])
@jwt_required()
def run_ml_prediction():
    data = request.get_json() or {}
    
    epds_score = data.get("epds_score")
    if epds_score is None:
        return jsonify({"error": "epds_score is required"}), 400

    try:
        epds_score = int(epds_score)
        sleep_hours = float(data.get("sleep_hours", 6.0))
        history_dep = int(data.get("history_of_depression", 0))
        social_support = int(data.get("social_support_score", 3))
        parity = int(data.get("parity", 1))
        complications = int(data.get("delivery_complication", 0))
        colic = int(data.get("infant_colic_score", 2))
        gestational = int(data.get("gestational_age_weeks", 39))
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid feature values: {str(e)}"}), 400

    result = predict_ppd_risk(
        epds_score=epds_score,
        sleep_hours=sleep_hours,
        history_of_depression=history_dep,
        social_support_score=social_support,
        parity=parity,
        delivery_complication=complications,
        infant_colic_score=colic,
        gestational_age_weeks=gestational
    )

    return jsonify({
        "prediction": result,
        "input_features": {
            "epds_score": epds_score,
            "sleep_hours_avg": sleep_hours,
            "history_of_depression": history_dep,
            "social_support_score": social_support,
            "parity": parity,
            "delivery_complication": complications,
            "infant_colic_score": colic,
            "gestational_age_weeks": gestational
        }
    }), 200


@ml_bp.route("/model-info", methods=["GET"])
def get_model_information():
    artifact = get_model_artifact()
    if not artifact:
        return jsonify({
            "status": "baseline_heuristic",
            "model_name": "ClinicalPriorBaseline",
            "version": "1.0.0-fallback",
            "message": "Compiled Scikit-learn model artifact not loaded. Running clinical prior baseline.",
            "disclaimer": "Academic demonstration only. Not for clinical diagnosis."
        }), 200

    return jsonify({
        "status": "ready",
        "model_name": artifact.get("model_name"),
        "version": artifact.get("version"),
        "features": artifact.get("feature_names"),
        "feature_importances": artifact.get("feature_importances"),
        "metrics": artifact.get("metrics"),
        "disclaimer": artifact.get("disclaimer")
    }), 200


@ml_bp.route("/nlp-analyze", methods=["POST"])
@jwt_required()
def run_nlp_text_analysis():
    data = request.get_json() or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "Text payload is required"}), 400

    nlp_result = analyze_journal_nlp(text)
    return jsonify({"nlp_analysis": nlp_result}), 200
