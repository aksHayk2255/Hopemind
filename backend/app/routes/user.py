from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.privacy import UserPrivacyPreference
from app.services.audit_service import log_audit_event

user_bp = Blueprint("user", __name__)

@user_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    profile_data = user.to_dict()
    if user.role == "mother" and user.mother_profile:
        profile_data["mother_profile"] = user.mother_profile.to_dict()
    elif user.role == "doctor" and user.doctor_profile:
        profile_data["doctor_profile"] = user.doctor_profile.to_dict()

    if user.privacy_preferences:
        profile_data["privacy_preferences"] = user.privacy_preferences.to_dict()

    return jsonify({"profile": profile_data}), 200


@user_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}

    if "full_name" in data and data["full_name"].strip():
        user.full_name = data["full_name"].strip()
    if "phone" in data:
        user.phone = data["phone"]

    if user.role == "mother" and user.mother_profile:
        mp = user.mother_profile
        if "infant_name" in data:
            mp.infant_name = data["infant_name"]
        if "infant_gender" in data:
            mp.infant_gender = data["infant_gender"]
        if "delivery_date" in data and data["delivery_date"]:
            try:
                mp.delivery_date = datetime.strptime(data["delivery_date"], "%Y-%m-%d").date()
            except ValueError:
                pass
        if "parity" in data:
            mp.parity = int(data["parity"])
        if "delivery_type" in data:
            mp.delivery_type = data["delivery_type"]
        if "emergency_contact_name" in data:
            mp.emergency_contact_name = data["emergency_contact_name"]
        if "emergency_contact_phone" in data:
            mp.emergency_contact_phone = data["emergency_contact_phone"]

    elif user.role == "doctor" and user.doctor_profile:
        dp = user.doctor_profile
        if "specialization" in data:
            dp.specialization = data["specialization"]
        if "hospital_affiliation" in data:
            dp.hospital_affiliation = data["hospital_affiliation"]
        if "license_number" in data:
            dp.license_number = data["license_number"]
        if "biography" in data:
            dp.biography = data["biography"]

    db.session.commit()
    log_audit_event(user.id, "PROFILE_UPDATE", "users", user.id, "Updated profile information")

    return jsonify({"message": "Profile updated successfully", "user": user.to_dict()}), 200


@user_bp.route("/privacy", methods=["GET"])
@jwt_required()
def get_privacy_preferences():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    pref = user.privacy_preferences
    if not pref:
        pref = UserPrivacyPreference(user_id=user.id)
        db.session.add(pref)
        db.session.commit()

    return jsonify({"privacy_preferences": pref.to_dict()}), 200


@user_bp.route("/privacy", methods=["PUT"])
@jwt_required()
def update_privacy_preferences():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    pref = user.privacy_preferences
    if not pref:
        pref = UserPrivacyPreference(user_id=user.id)
        db.session.add(pref)

    data = request.get_json() or {}
    if "share_journal_with_doctor" in data:
        pref.share_journal_with_doctor = bool(data["share_journal_with_doctor"])
    if "share_mood_with_doctor" in data:
        pref.share_mood_with_doctor = bool(data["share_mood_with_doctor"])
    if "allow_nlp_analysis" in data:
        pref.allow_nlp_analysis = bool(data["allow_nlp_analysis"])
    if "reminder_frequency" in data:
        pref.reminder_frequency = data["reminder_frequency"]

    db.session.commit()
    log_audit_event(user.id, "PRIVACY_UPDATE", "user_privacy_preferences", pref.id, "Updated privacy controls")

    return jsonify({
        "message": "Privacy settings updated successfully",
        "privacy_preferences": pref.to_dict()
    }), 200


@user_bp.route("/emergency-contacts", methods=["GET"])
def get_emergency_contacts():
    contacts = current_app.config.get("EMERGENCY_CONTACTS", [])
    return jsonify({
        "contacts": contacts,
        "disclaimer": "These numbers provide free, confidential crisis and psychological support. If you or someone you know is in immediate life-threatening physical danger, dial 112 / 911 immediately."
    }), 200
