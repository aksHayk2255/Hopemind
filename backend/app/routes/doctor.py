from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.profile import DoctorProfile, MotherProfile, DoctorPatientAssignment
from app.models.assessment import Assessment
from app.models.mood import MoodEntry
from app.models.follow_up import FollowUp
from app.models.notification import Notification
from app.security.rbac import role_required, verify_mother_access
from app.services.audit_service import log_audit_event

doctor_bp = Blueprint("doctor", __name__)

@doctor_bp.route("/patients", methods=["GET"])
@role_required(["doctor", "admin"])
def get_assigned_patients():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user.doctor_profile:
        return jsonify({"error": "Doctor profile not found"}), 404

    search_query = request.args.get("q", "").strip().lower()
    filter_category = request.args.get("category", "").strip().lower()

    assignments = DoctorPatientAssignment.query.filter_by(
        doctor_id=user.doctor_profile.id,
        is_active=True
    ).all()

    patient_list = []
    for a in assignments:
        mother = a.mother
        mother_user = mother.user
        
        # Apply search filter
        if search_query:
            match_name = search_query in mother_user.full_name.lower()
            match_email = search_query in mother_user.email.lower()
            if not (match_name or match_email):
                continue

        # Fetch latest assessment
        latest_assessment = Assessment.query.filter_by(mother_id=mother.id)\
            .order_by(Assessment.created_at.desc()).first()

        # Check screening category filter
        if filter_category and latest_assessment:
            if latest_assessment.screening_category != filter_category:
                continue
        elif filter_category and not latest_assessment:
            continue

        # Check pending follow-ups
        pending_followups = FollowUp.query.filter_by(
            mother_id=mother.id,
            status="scheduled"
        ).count()

        # Clinical status calculation
        status = "stable"
        if latest_assessment:
            if latest_assessment.question_10_flag or latest_assessment.screening_category == "high":
                status = "review_required"
            elif pending_followups > 0:
                status = "follow_up_scheduled"
            elif latest_assessment.screening_category == "moderate":
                status = "monitor"

        patient_list.append({
            "assignment_id": a.id,
            "mother_id": mother.id,
            "user_id": mother_user.id,
            "full_name": mother_user.full_name,
            "email": mother_user.email,
            "phone": mother_user.phone,
            "weeks_postpartum": mother.weeks_postpartum(),
            "infant_name": mother.infant_name,
            "delivery_date": mother.delivery_date.isoformat() if mother.delivery_date else None,
            "latest_assessment": {
                "id": latest_assessment.id,
                "score": latest_assessment.total_score,
                "category": latest_assessment.screening_category,
                "question_10_flag": latest_assessment.question_10_flag,
                "created_at": latest_assessment.created_at.isoformat()
            } if latest_assessment else None,
            "clinical_status": status,
            "pending_followups": pending_followups,
            "assigned_at": a.assigned_at.isoformat()
        })

    log_audit_event(user.id, "DOCTOR_PATIENTS_VIEW", "doctor_profiles", user.doctor_profile.id, f"Viewed {len(patient_list)} assigned patients")

    return jsonify({
        "patients": patient_list,
        "total_assigned": len(assignments)
    }), 200


@doctor_bp.route("/patients/<int:mother_id>", methods=["GET"])
@role_required(["doctor", "admin"])
def get_patient_detail(mother_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    allowed, err_msg = verify_mother_access(user, mother_id)
    if not allowed:
        return jsonify({"error": err_msg}), 403

    mother = MotherProfile.query.get(mother_id)
    if not mother:
        return jsonify({"error": "Patient not found"}), 404

    mother_user = mother.user

    # Assessments
    assessments = Assessment.query.filter_by(mother_id=mother.id)\
        .order_by(Assessment.created_at.desc()).all()

    # Mood records
    moods = MoodEntry.query.filter_by(mother_id=mother.id)\
        .order_by(MoodEntry.entry_date.desc()).limit(20).all()

    # Check privacy setting for journals
    allow_journal = False
    if mother_user.privacy_preferences and mother_user.privacy_preferences.share_journal_with_doctor:
        allow_journal = True

    # Follow-ups
    follow_ups = FollowUp.query.filter_by(mother_id=mother.id)\
        .order_by(FollowUp.scheduled_date.desc()).all()

    log_audit_event(user.id, "DOCTOR_PATIENT_DETAIL_VIEW", "mother_profiles", mother.id, f"Doctor reviewed patient profile #{mother.id}")

    return jsonify({
        "patient": {
            "mother_id": mother.id,
            "user_id": mother_user.id,
            "full_name": mother_user.full_name,
            "email": mother_user.email,
            "phone": mother_user.phone,
            "delivery_date": mother.delivery_date.isoformat() if mother.delivery_date else None,
            "weeks_postpartum": mother.weeks_postpartum(),
            "infant_name": mother.infant_name,
            "infant_gender": mother.infant_gender,
            "parity": mother.parity,
            "delivery_type": mother.delivery_type,
            "emergency_contact_name": mother.emergency_contact_name,
            "emergency_contact_phone": mother.emergency_contact_phone,
            "journal_sharing_enabled": allow_journal
        },
        "assessments": [a.to_dict(include_responses=True) for a in assessments],
        "mood_history": [m.to_dict(include_journal=allow_journal) for m in moods],
        "follow_ups": [f.to_dict() for f in follow_ups]
    }), 200


@doctor_bp.route("/follow-ups", methods=["POST"])
@role_required(["doctor", "admin"])
def schedule_follow_up():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user.doctor_profile:
        return jsonify({"error": "Doctor profile required"}), 403

    data = request.get_json() or {}
    mother_id = data.get("mother_id")
    scheduled_str = data.get("scheduled_date")
    reason = data.get("reason", "").strip()
    clinical_notes = data.get("clinical_notes", "").strip()

    if not mother_id or not scheduled_str or not reason:
        return jsonify({"error": "mother_id, scheduled_date, and reason are required"}), 400

    allowed, err_msg = verify_mother_access(user, mother_id)
    if not allowed:
        return jsonify({"error": err_msg}), 403

    try:
        scheduled_date = datetime.fromisoformat(scheduled_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}), 400

    follow_up = FollowUp(
        mother_id=mother_id,
        doctor_id=user.doctor_profile.id,
        scheduled_date=scheduled_date,
        reason=reason,
        clinical_notes=clinical_notes,
        status="scheduled"
    )
    db.session.add(follow_up)

    # Send Notification to Mother
    mother = MotherProfile.query.get(mother_id)
    if mother and mother.user:
        notif = Notification(
            user_id=mother.user.id,
            title="Follow-Up Appointment Scheduled",
            message=f"Dr. {user.full_name} has scheduled a clinical review for {scheduled_date.strftime('%B %d, %Y at %I:%M %p')}. Reason: {reason}",
            type="follow_up",
            action_url="/dashboard"
        )
        db.session.add(notif)

    db.session.commit()
    log_audit_event(user.id, "FOLLOW_UP_SCHEDULE", "follow_ups", follow_up.id, f"Scheduled follow-up for mother #{mother_id}")

    return jsonify({
        "message": "Follow-up scheduled successfully",
        "follow_up": follow_up.to_dict()
    }), 201


@doctor_bp.route("/follow-ups/<int:follow_up_id>", methods=["PUT"])
@role_required(["doctor", "admin"])
def update_follow_up(follow_up_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    follow_up = FollowUp.query.get(follow_up_id)
    if not follow_up:
        return jsonify({"error": "Follow-up not found"}), 404

    allowed, err_msg = verify_mother_access(user, follow_up.mother_id)
    if not allowed:
        return jsonify({"error": err_msg}), 403

    data = request.get_json() or {}
    if "status" in data:
        follow_up.status = data["status"]
    if "clinical_notes" in data:
        follow_up.clinical_notes = data["clinical_notes"]
    if "scheduled_date" in data:
        try:
            follow_up.scheduled_date = datetime.fromisoformat(data["scheduled_date"])
        except ValueError:
            pass

    db.session.commit()
    log_audit_event(user.id, "FOLLOW_UP_UPDATE", "follow_ups", follow_up.id, f"Updated status to {follow_up.status}")

    return jsonify({
        "message": "Follow-up updated successfully",
        "follow_up": follow_up.to_dict()
    }), 200


@doctor_bp.route("/follow-ups", methods=["GET"])
@role_required(["doctor", "admin"])
def list_doctor_follow_ups():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user.doctor_profile:
        return jsonify({"error": "Doctor profile not found"}), 404

    follow_ups = FollowUp.query.filter_by(doctor_id=user.doctor_profile.id)\
        .order_by(FollowUp.scheduled_date.asc()).all()

    return jsonify({
        "follow_ups": [f.to_dict() for f in follow_ups]
    }), 200
