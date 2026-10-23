from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.user import User
from app.models.profile import MotherProfile, DoctorProfile, DoctorPatientAssignment

def role_required(allowed_roles):
    """Decorator to enforce role-based access control."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({"error": "Account inactive or unauthorized"}), 403
                
            if user.role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Role '{user.role}' does not have permission for this resource"
                }), 403
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_current_user():
    """Retrieve the currently authenticated User instance."""
    verify_jwt_in_request()
    user_id = get_jwt_identity()
    return User.query.get(user_id)

def verify_mother_access(current_user, target_mother_id):
    """
    Strict ownership and authorization check:
    - Mother can only access her own records.
    - Doctor can only access mothers assigned to them.
    - Admin does NOT automatically access private clinical records.
    """
    if current_user.role == "mother":
        if not current_user.mother_profile or current_user.mother_profile.id != target_mother_id:
            return False, "Access denied: You can only view your own records."
        return True, None

    if current_user.role == "doctor":
        if not current_user.doctor_profile:
            return False, "Doctor profile not configured."
        assignment = DoctorPatientAssignment.query.filter_by(
            doctor_id=current_user.doctor_profile.id,
            mother_id=target_mother_id,
            is_active=True
        ).first()
        if not assignment:
            return False, "Access denied: Patient is not assigned to you."
        return True, None

    if current_user.role == "admin":
        return False, "Access denied: Administrators cannot access private clinical records."

    return False, "Unauthorized access."
