from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.profile import MotherProfile, DoctorProfile
from app.models.privacy import UserPrivacyPreference
from app.services.audit_service import log_audit_event
from datetime import datetime

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "mother").strip().lower()

    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
    if not full_name:
        return jsonify({"error": "Full name is required"}), 400
    if role not in ["mother", "doctor"]:
        return jsonify({"error": "Registration role must be 'mother' or 'doctor'"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        email=email,
        full_name=full_name,
        role=role,
        phone=data.get("phone")
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    # Create associated profile
    if role == "mother":
        delivery_date = None
        if data.get("delivery_date"):
            try:
                delivery_date = datetime.strptime(data["delivery_date"], "%Y-%m-%d").date()
            except ValueError:
                pass
        
        mother_profile = MotherProfile(
            user_id=user.id,
            infant_name=data.get("infant_name"),
            infant_gender=data.get("infant_gender"),
            delivery_date=delivery_date,
            parity=int(data.get("parity", 1)),
            emergency_contact_name=data.get("emergency_contact_name"),
            emergency_contact_phone=data.get("emergency_contact_phone")
        )
        db.session.add(mother_profile)
        
        # Privacy preferences
        privacy = UserPrivacyPreference(
            user_id=user.id,
            share_journal_with_doctor=data.get("share_journal_with_doctor", False),
            share_mood_with_doctor=data.get("share_mood_with_doctor", True),
            allow_nlp_analysis=data.get("allow_nlp_analysis", True)
        )
        db.session.add(privacy)

    elif role == "doctor":
        doctor_profile = DoctorProfile(
            user_id=user.id,
            specialization=data.get("specialization", "Perinatal Mental Health & OB/GYN"),
            license_number=data.get("license_number"),
            hospital_affiliation=data.get("hospital_affiliation"),
            phone=data.get("phone")
        )
        db.session.add(doctor_profile)

    db.session.commit()
    log_audit_event(user.id, "USER_REGISTER", "users", user.id, f"Registered new {role} account: {email}")

    # Generate JWT
    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Registration successful",
        "access_token": token,
        "user": user.to_dict()
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Your account has been deactivated. Please contact an administrator."}), 403

    token = create_access_token(identity=str(user.id))
    log_audit_event(user.id, "USER_LOGIN", "users", user.id, f"Logged in from {request.remote_addr}")

    user_info = user.to_dict()
    if user.role == "mother" and user.mother_profile:
        user_info["mother_profile"] = user.mother_profile.to_dict()
    elif user.role == "doctor" and user.doctor_profile:
        user_info["doctor_profile"] = user.doctor_profile.to_dict()

    return jsonify({
        "message": "Login successful",
        "access_token": token,
        "user": user_info
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"error": "User not found or inactive"}), 404

    data = user.to_dict()
    if user.role == "mother" and user.mother_profile:
        data["mother_profile"] = user.mother_profile.to_dict()
        if user.privacy_preferences:
            data["privacy_preferences"] = user.privacy_preferences.to_dict()
    elif user.role == "doctor" and user.doctor_profile:
        data["doctor_profile"] = user.doctor_profile.to_dict()

    return jsonify({"user": data}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    user_id = get_jwt_identity()
    log_audit_event(int(user_id), "USER_LOGOUT", "users", int(user_id), "User logged out")
    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    old_pw = data.get("current_password", "")
    new_pw = data.get("new_password", "")

    if not user.check_password(old_pw):
        return jsonify({"error": "Current password does not match"}), 400
    if len(new_pw) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    user.set_password(new_pw)
    db.session.commit()
    log_audit_event(user.id, "PASSWORD_CHANGE", "users", user.id, "User updated their password")

    return jsonify({"message": "Password updated successfully"}), 200
