from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.assessment import Assessment
from app.models.mood import MoodEntry
from app.models.chat import ChatConversation
from app.models.follow_up import FollowUp
from app.models.audit import AuditLog
from app.security.rbac import role_required
from app.services.audit_service import log_audit_event

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/users", methods=["GET"])
@role_required(["admin"])
def list_users():
    search = request.args.get("q", "").strip().lower()
    role_filter = request.args.get("role", "").strip().lower()

    query = User.query
    if role_filter:
        query = query.filter_by(role=role_filter)

    users = query.order_by(User.created_at.desc()).all()

    user_list = []
    for u in users:
        if search:
            match = search in u.email.lower() or search in u.full_name.lower()
            if not match:
                continue
        user_list.append(u.to_dict())

    return jsonify({
        "users": user_list,
        "total_users": len(user_list)
    }), 200


@admin_bp.route("/users/<int:user_id>/status", methods=["PUT"])
@role_required(["admin"])
def toggle_user_status(user_id):
    current_admin_id = int(get_jwt_identity())
    if current_admin_id == user_id:
        return jsonify({"error": "Administrators cannot deactivate their own account"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    new_status = data.get("is_active", not user.is_active)
    user.is_active = new_status
    db.session.commit()

    log_audit_event(
        current_admin_id, 
        "ADMIN_USER_STATUS_CHANGE", 
        "users", 
        user.id, 
        f"Changed active status to {new_status} for {user.email}"
    )

    return jsonify({
        "message": f"User account {'activated' if new_status else 'deactivated'} successfully",
        "user": user.to_dict()
    }), 200


@admin_bp.route("/users/<int:user_id>/role", methods=["PUT"])
@role_required(["admin"])
def update_user_role(user_id):
    current_admin_id = int(get_jwt_identity())
    if current_admin_id == user_id:
        return jsonify({"error": "Administrators cannot modify their own role"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    new_role = data.get("role")
    if new_role not in ["mother", "doctor", "admin"]:
        return jsonify({"error": "Invalid role. Must be 'mother', 'doctor', or 'admin'"}), 400

    user.role = new_role
    db.session.commit()

    log_audit_event(
        current_admin_id,
        "ADMIN_USER_ROLE_CHANGE",
        "users",
        user.id,
        f"Updated role to {new_role} for {user.email}"
    )

    return jsonify({
        "message": f"User role updated to {new_role}",
        "user": user.to_dict()
    }), 200


@admin_bp.route("/stats", methods=["GET"])
@role_required(["admin"])
def get_system_stats():
    total_users = User.query.count()
    mothers_count = User.query.filter_by(role="mother").count()
    doctors_count = User.query.filter_by(role="doctor").count()
    admins_count = User.query.filter_by(role="admin").count()

    total_assessments = Assessment.query.count()
    high_risk_assessments = Assessment.query.filter(
        (Assessment.screening_category == "high") | (Assessment.question_10_flag == True)
    ).count()

    total_moods = MoodEntry.query.count()
    total_convs = ChatConversation.query.count()
    total_follow_ups = FollowUp.query.count()

    return jsonify({
        "platform_statistics": {
            "total_users": total_users,
            "mothers": mothers_count,
            "doctors": doctors_count,
            "admins": admins_count,
            "total_assessments": total_assessments,
            "high_risk_screenings": high_risk_assessments,
            "total_mood_entries": total_moods,
            "total_chat_conversations": total_convs,
            "total_follow_ups": total_follow_ups
        }
    }), 200


@admin_bp.route("/audit-logs", methods=["GET"])
@role_required(["admin"])
def get_audit_logs():
    limit = request.args.get("limit", 50, type=int)
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    return jsonify({
        "audit_logs": [log.to_dict() for log in logs]
    }), 200
