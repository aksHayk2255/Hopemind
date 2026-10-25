from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.assessment import Assessment, AssessmentResponse
from app.models.ml_prediction import ModelPrediction
from app.models.notification import Notification
from app.services.epds_service import EPDS_QUESTIONS, calculate_epds_score
from app.services.ml_service import predict_ppd_risk
from app.services.audit_service import log_audit_event
from app.security.rbac import role_required, verify_mother_access

assessment_bp = Blueprint("assessment", __name__)

@assessment_bp.route("/questions", methods=["GET"])
def get_assessment_questions():
    """
    Returns the Edinburgh Postnatal Depression Scale questionnaire structure.
    Safe for frontend rendering without revealing score indices.
    """
    clean_questions = []
    for q in EPDS_QUESTIONS:
        clean_questions.append({
            "id": q["id"],
            "question": q["question"],
            "options": [{"index": i, "text": opt["text"]} for i, opt in enumerate(q["options"])]
        })

    return jsonify({
        "instrument": "Edinburgh Postnatal Depression Scale (EPDS)",
        "source": "Cox, Holden, & Sagovsky (1987), British Journal of Psychiatry",
        "instructions": (
            "Please select the answer which comes closest to how you have felt in the past 7 days, "
            "not just how you feel today. There are 10 questions. Please complete all items."
        ),
        "disclaimer": (
            "The EPDS is a screening instrument, not a diagnostic medical evaluation. "
            "A high score indicates depressive symptoms that warrant professional clinical follow-up."
        ),
        "questions": clean_questions
    }), 200


@assessment_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_assessment():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Only registered mothers can submit assessments directly"}), 403

    data = request.get_json() or {}
    responses = data.get("responses") # Array of 10 option indices (0-3)
    completion_time = data.get("completion_time_seconds", 60)

    if not responses or not isinstance(responses, list) or len(responses) != 10:
        return jsonify({"error": "Responses array with exactly 10 question answers is required"}), 400

    try:
        total_score, category, q10_flag, recommendation, breakdown = calculate_epds_score(responses)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    mother_profile = user.mother_profile

    # Save Assessment record
    assessment = Assessment(
        mother_id=mother_profile.id,
        assessment_type="EPDS",
        total_score=total_score,
        screening_category=category,
        question_10_flag=q10_flag,
        clinical_action_recommended=recommendation,
        completion_time_seconds=completion_time
    )
    db.session.add(assessment)
    db.session.flush()

    # Save individual responses for clinical review
    for item in breakdown:
        resp_record = AssessmentResponse(
            assessment_id=assessment.id,
            question_index=item["question_index"],
            question_text=item["question_text"],
            selected_option_index=item["selected_option_index"],
            selected_option_text=item["selected_option_text"],
            score=item["score"]
        )
        db.session.add(resp_record)

    # ML Multimodal Risk Prediction
    # Pull average sleep hours from recent mood entries if available
    recent_moods = mother_profile.mood_entries.order_by(db.desc("created_at")).limit(5).all()
    avg_sleep = 6.0
    if recent_moods:
        sleep_vals = [m.sleep_hours for m in recent_moods if m.sleep_hours is not None]
        if sleep_vals:
            avg_sleep = sum(sleep_vals) / len(sleep_vals)

    ml_result = predict_ppd_risk(
        epds_score=total_score,
        sleep_hours=avg_sleep,
        history_of_depression=data.get("history_of_depression", 0),
        social_support_score=data.get("social_support_score", 3),
        parity=mother_profile.parity or 1,
        delivery_complication=1 if mother_profile.delivery_type == "cesarean" else 0
    )

    pred_record = ModelPrediction(
        mother_id=mother_profile.id,
        assessment_id=assessment.id,
        predicted_risk_score=ml_result["probability"],
        predicted_category=ml_result["category"],
        model_version=ml_result["model_version"]
    )
    pred_record.set_features(ml_result["top_contributing_features"])
    db.session.add(pred_record)

    # Crisis / Escalation Notification
    if q10_flag:
        alert_notif = Notification(
            user_id=user.id,
            title="Support & Safety Resources",
            message="Your response indicates that you may be experiencing distressing thoughts. Compassionate, 24/7 support is available right now. Please reach out to our emergency helplines.",
            type="crisis_alert",
            action_url="/emergency"
        )
        db.session.add(alert_notif)
    elif category == "high":
        reminder_notif = Notification(
            user_id=user.id,
            title="Follow-Up Recommendation",
            message="Your latest assessment score indicates elevated distress. We encourage scheduling a review with your healthcare provider.",
            type="assessment_reminder",
            action_url="/dashboard"
        )
        db.session.add(reminder_notif)

    db.session.commit()
    log_audit_event(user.id, "ASSESSMENT_SUBMIT", "assessments", assessment.id, f"EPDS score={total_score}, category={category}, q10_flag={q10_flag}")

    return jsonify({
        "assessment": assessment.to_dict(include_responses=True),
        "ml_risk_assessment": {
            "predicted_risk_score": ml_result["probability"],
            "risk_percentage": f"{ml_result['probability']*100:.1f}%",
            "category": ml_result["category"],
            "guidance": ml_result["guidance"],
            "model_version": ml_result["model_version"],
            "top_features": ml_result["top_contributing_features"],
            "disclaimer": ml_result["disclaimer"]
        },
        "critical_alert": q10_flag
    }), 201


@assessment_bp.route("/history", methods=["GET"])
@jwt_required()
def get_assessment_history():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Mother profile not found"}), 404

    history = Assessment.query.filter_by(mother_id=user.mother_profile.id)\
        .order_by(Assessment.created_at.desc()).all()

    return jsonify({
        "assessments": [a.to_dict(include_responses=False) for a in history]
    }), 200


@assessment_bp.route("/<int:assessment_id>", methods=["GET"])
@jwt_required()
def get_assessment_detail(assessment_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    assessment = Assessment.query.get(assessment_id)
    if not assessment:
        return jsonify({"error": "Assessment not found"}), 404

    # RBAC check
    allowed, err_msg = verify_mother_access(user, assessment.mother_id)
    if not allowed:
        return jsonify({"error": err_msg}), 403

    log_audit_event(user.id, "ASSESSMENT_VIEW", "assessments", assessment.id, f"Viewed assessment #{assessment.id}")

    data = assessment.to_dict(include_responses=True)
    if assessment.ml_prediction:
        data["ml_prediction"] = assessment.ml_prediction.to_dict()

    return jsonify({"assessment": data}), 200
