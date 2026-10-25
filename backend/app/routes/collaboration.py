from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

from app import db
from app.models.collaboration import (
    Appointment,
    CareConnection,
    ClinicalNote,
    ClinicianVerification,
    DataConsent,
    Referral,
)
from app.models.profile import DoctorPatientAssignment, DoctorProfile, MotherProfile
from app.models.user import User
from app.security.rbac import role_required
from app.services.audit_service import log_audit_event

collaboration_bp = Blueprint("collaboration", __name__)
CONSENT_CATEGORIES = {
    "assessments": "Share EPDS screening history with this clinician.",
    "mood": "Share mood and wellness trends with this clinician.",
    "reports": "Share selected clinical reports with this clinician.",
}


def current_user():
    return User.query.get(int(get_jwt_identity()))


def doctor_is_verified(doctor):
    verification = ClinicianVerification.query.filter_by(doctor_id=doctor.id).first()
    return bool(verification and verification.status == "verified")


def active_connection(mother_id, doctor_id):
    return CareConnection.query.filter_by(
        mother_id=mother_id, doctor_id=doctor_id, status="accepted"
    ).first()


def parse_datetime(value):
    if not isinstance(value, str):
        raise ValueError
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo:
        parsed = parsed.replace(tzinfo=None)
    return parsed


@collaboration_bp.route("/professionals", methods=["GET"])
@role_required(["mother"])
def professionals():
    query = DoctorProfile.query.join(User).filter(User.is_active.is_(True))
    specialization = request.args.get("specialization", "").strip().lower()
    if specialization:
        query = query.filter(DoctorProfile.specialization.ilike(f"%{specialization}%"))

    results = []
    for doctor in query.order_by(User.full_name.asc()).all():
        verification = ClinicianVerification.query.filter_by(doctor_id=doctor.id).first()
        if not verification or verification.status != "verified":
            continue
        results.append({
            "doctor_id": doctor.id,
            "user_id": doctor.user_id,
            "full_name": doctor.user.full_name,
            "specialization": doctor.specialization,
            "qualifications": verification.qualifications,
            "hospital_affiliation": doctor.hospital_affiliation,
            "biography": doctor.biography,
            "verification": verification.to_dict(),
        })
    return jsonify({"professionals": results}), 200


@collaboration_bp.route("/connections", methods=["GET"])
@role_required(["mother", "doctor"])
def list_connections():
    user = current_user()
    if user.role == "mother":
        connections = CareConnection.query.filter_by(mother_id=user.mother_profile.id).all()
    else:
        connections = CareConnection.query.filter_by(doctor_id=user.doctor_profile.id).all()
    return jsonify({"connections": [connection.to_dict() for connection in connections]}), 200


@collaboration_bp.route("/connections", methods=["POST"])
@role_required(["mother"])
def request_connection():
    user = current_user()
    data = request.get_json(silent=True) or {}
    doctor_id = data.get("doctor_id")
    doctor = DoctorProfile.query.get(doctor_id) if doctor_id else None
    if not doctor or not doctor.user.is_active or not doctor_is_verified(doctor):
        return jsonify({"error": "Verified professional not found"}), 404
    existing = CareConnection.query.filter_by(
        mother_id=user.mother_profile.id, doctor_id=doctor.id
    ).first()
    if existing and existing.status in {"pending", "accepted"}:
        return jsonify({"error": "A connection already exists"}), 409
    if existing:
        existing.status = "pending"
        existing.requested_at = datetime.utcnow()
        existing.revoked_at = None
    else:
        existing = CareConnection(mother_id=user.mother_profile.id, doctor_id=doctor.id)
        db.session.add(existing)
    db.session.commit()
    return jsonify({"connection": existing.to_dict()}), 201


@collaboration_bp.route("/connections/<int:connection_id>", methods=["PATCH"])
@role_required(["mother", "doctor"])
def update_connection(connection_id):
    user = current_user()
    connection = CareConnection.query.get(connection_id)
    if not connection:
        return jsonify({"error": "Connection not found"}), 404
    action = (request.get_json(silent=True) or {}).get("action")
    is_mother = user.role == "mother" and connection.mother_id == user.mother_profile.id
    is_doctor = user.role == "doctor" and connection.doctor_id == user.doctor_profile.id
    if not (is_mother or is_doctor):
        return jsonify({"error": "Access denied"}), 403

    if action == "accept" and is_doctor and connection.status == "pending":
        connection.status = "accepted"
        connection.accepted_at = datetime.utcnow()
        assignment = DoctorPatientAssignment.query.filter_by(
            doctor_id=connection.doctor_id, mother_id=connection.mother_id
        ).first()
        if assignment:
            assignment.is_active = True
        else:
            db.session.add(DoctorPatientAssignment(
                doctor_id=connection.doctor_id, mother_id=connection.mother_id
            ))
    elif action == "decline" and is_doctor and connection.status == "pending":
        connection.status = "declined"
    elif action in {"revoke", "cancel"} and is_mother:
        connection.status = "revoked"
        connection.revoked_at = datetime.utcnow()
        assignment = DoctorPatientAssignment.query.filter_by(
            doctor_id=connection.doctor_id, mother_id=connection.mother_id
        ).first()
        if assignment:
            assignment.is_active = False
    else:
        return jsonify({"error": "Invalid connection action"}), 400
    db.session.commit()
    return jsonify({"connection": connection.to_dict()}), 200


@collaboration_bp.route("/consents", methods=["GET"])
@role_required(["mother", "doctor"])
def list_consents():
    user = current_user()
    query = DataConsent.query
    if user.role == "mother":
        query = query.filter_by(mother_id=user.mother_profile.id)
    else:
        query = query.filter_by(doctor_id=user.doctor_profile.id)
    return jsonify({"consents": [consent.to_dict() for consent in query.all()]}), 200


@collaboration_bp.route("/consents", methods=["PUT"])
@role_required(["mother"])
def update_consent():
    user = current_user()
    data = request.get_json(silent=True) or {}
    doctor_id = data.get("doctor_id")
    category = data.get("category")
    if category not in CONSENT_CATEGORIES or not doctor_id:
        return jsonify({"error": "doctor_id and a supported category are required"}), 400
    connection = active_connection(user.mother_profile.id, doctor_id)
    if not connection:
        return jsonify({"error": "An accepted care connection is required"}), 403
    consent = DataConsent.query.filter_by(
        mother_id=user.mother_profile.id, doctor_id=doctor_id, category=category
    ).first()
    grant = bool(data.get("grant"))
    if not consent:
        consent = DataConsent(
            mother_id=user.mother_profile.id,
            doctor_id=doctor_id,
            category=category,
            purpose=CONSENT_CATEGORIES[category],
        )
        db.session.add(consent)
    consent.status = "granted" if grant else "withdrawn"
    consent.granted_at = datetime.utcnow() if grant else consent.granted_at
    consent.withdrawn_at = None if grant else datetime.utcnow()
    db.session.commit()
    log_audit_event(user.id, "CONSENT_UPDATE", "data_consents", consent.id, f"Updated {category} consent")
    return jsonify({"consent": consent.to_dict()}), 200


@collaboration_bp.route("/appointments", methods=["GET"])
@role_required(["mother", "doctor"])
def list_appointments():
    user = current_user()
    if user.role == "mother":
        query = Appointment.query.filter_by(mother_id=user.mother_profile.id)
    else:
        query = Appointment.query.filter_by(doctor_id=user.doctor_profile.id)
    return jsonify({"appointments": [item.to_dict() for item in query.order_by(Appointment.start_time.asc()).all()]}), 200


@collaboration_bp.route("/appointments", methods=["POST"])
@role_required(["mother"])
def request_appointment():
    user = current_user()
    data = request.get_json(silent=True) or {}
    try:
        start = parse_datetime(data.get("start_time"))
        end = parse_datetime(data.get("end_time"))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid start_time and end_time are required"}), 400
    if start <= datetime.utcnow() or end <= start:
        return jsonify({"error": "Appointment must have a future start and a later end time"}), 400
    doctor = DoctorProfile.query.get(data.get("doctor_id"))
    if not doctor or not doctor.user.is_active or not doctor_is_verified(doctor):
        return jsonify({"error": "Verified professional not found"}), 404
    if not active_connection(user.mother_profile.id, doctor.id):
        return jsonify({"error": "An accepted care connection is required"}), 403
    overlap = Appointment.query.filter(
        Appointment.doctor_id == doctor.id,
        Appointment.status.in_(["requested", "confirmed"]),
        Appointment.start_time < end,
        Appointment.end_time > start,
    ).first()
    if overlap:
        return jsonify({"error": "That time overlaps an existing appointment"}), 409
    mode = data.get("consultation_mode", "video")
    if mode not in {"video", "in_person", "phone"}:
        return jsonify({"error": "Unsupported consultation mode"}), 400
    appointment = Appointment(
        mother_id=user.mother_profile.id, doctor_id=doctor.id, start_time=start,
        end_time=end, consultation_mode=mode,
        reason=(data.get("reason") or "").strip() or None,
    )
    db.session.add(appointment)
    db.session.commit()
    return jsonify({"appointment": appointment.to_dict()}), 201


@collaboration_bp.route("/appointments/<int:appointment_id>", methods=["PATCH"])
@role_required(["mother", "doctor"])
def update_appointment(appointment_id):
    user = current_user()
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404
    owns = (user.role == "mother" and appointment.mother_id == user.mother_profile.id) or (
        user.role == "doctor" and appointment.doctor_id == user.doctor_profile.id
    )
    if not owns:
        return jsonify({"error": "Access denied"}), 403
    action = (request.get_json(silent=True) or {}).get("action")
    transitions = {
        "confirm": ("doctor", "confirmed"),
        "decline": ("doctor", "declined"),
        "cancel": ("any", "cancelled"),
        "complete": ("doctor", "completed"),
    }
    if action not in transitions or (transitions[action][0] == "doctor" and user.role != "doctor"):
        return jsonify({"error": "Invalid appointment action"}), 400
    if appointment.status in {"cancelled", "declined", "completed"}:
        return jsonify({"error": "Appointment is no longer changeable"}), 409
    appointment.status = transitions[action][1]
    db.session.commit()
    return jsonify({"appointment": appointment.to_dict()}), 200


@collaboration_bp.route("/notes/<int:mother_id>", methods=["GET"])
@role_required(["doctor"])
def list_notes(mother_id):
    user = current_user()
    if not DoctorPatientAssignment.query.filter_by(
        doctor_id=user.doctor_profile.id, mother_id=mother_id, is_active=True
    ).first():
        return jsonify({"error": "Patient is not assigned to you"}), 403
    notes = ClinicalNote.query.filter_by(mother_id=mother_id, doctor_id=user.doctor_profile.id).order_by(ClinicalNote.created_at.desc()).all()
    return jsonify({"notes": [note.to_dict() for note in notes]}), 200


@collaboration_bp.route("/notes", methods=["POST"])
@role_required(["doctor"])
def create_note():
    user = current_user()
    data = request.get_json(silent=True) or {}
    mother_id = data.get("mother_id")
    assigned = DoctorPatientAssignment.query.filter_by(
        doctor_id=user.doctor_profile.id, mother_id=mother_id, is_active=True
    ).first()
    if not assigned:
        return jsonify({"error": "Patient is not assigned to you"}), 403
    required = ["reason", "observations", "care_plan"]
    if not all(isinstance(data.get(field), str) and data[field].strip() for field in required):
        return jsonify({"error": "reason, observations, and care_plan are required"}), 400
    note = ClinicalNote(
        mother_id=mother_id, doctor_id=user.doctor_profile.id,
        appointment_id=data.get("appointment_id"), reason=data["reason"].strip(),
        observations=data["observations"].strip(), care_plan=data["care_plan"].strip(),
        status="final",
    )
    db.session.add(note)
    db.session.commit()
    log_audit_event(user.id, "CLINICAL_NOTE_CREATE", "clinical_notes", note.id, "Created clinical note")
    return jsonify({"note": note.to_dict()}), 201


@collaboration_bp.route("/referrals", methods=["GET", "POST"])
@role_required(["mother", "doctor"])
def referrals():
    user = current_user()
    if request.method == "GET":
        query = Referral.query.filter_by(
            mother_id=user.mother_profile.id if user.role == "mother" else None
        ) if user.role == "mother" else Referral.query.filter_by(doctor_id=user.doctor_profile.id)
        return jsonify({"referrals": [item.to_dict() for item in query.order_by(Referral.created_at.desc()).all()]}), 200
    if user.role != "doctor":
        return jsonify({"error": "Only clinicians can create referrals"}), 403
    data = request.get_json(silent=True) or {}
    mother_id = data.get("mother_id")
    assigned = DoctorPatientAssignment.query.filter_by(
        doctor_id=user.doctor_profile.id, mother_id=mother_id, is_active=True
    ).first()
    if not assigned or not data.get("destination") or not data.get("reason"):
        return jsonify({"error": "Assigned patient, destination, and reason are required"}), 400
    referral = Referral(
        mother_id=mother_id, doctor_id=user.doctor_profile.id,
        destination=data["destination"].strip(), reason=data["reason"].strip(),
    )
    db.session.add(referral)
    db.session.commit()
    return jsonify({"referral": referral.to_dict()}), 201


@collaboration_bp.route("/verifications/<int:doctor_id>", methods=["PATCH"])
@role_required(["admin"])
def update_verification(doctor_id):
    verification = ClinicianVerification.query.filter_by(doctor_id=doctor_id).first()
    if not verification:
        return jsonify({"error": "Verification request not found"}), 404
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in {"verified", "rejected", "pending"}:
        return jsonify({"error": "Invalid verification status"}), 400
    verification.status = status
    verification.verified_at = datetime.utcnow() if status == "verified" else None
    verification.reviewed_by = int(get_jwt_identity())
    db.session.commit()
    return jsonify({"verification": verification.to_dict()}), 200
