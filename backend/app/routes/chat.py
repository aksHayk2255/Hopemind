from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.chat import ChatConversation, ChatMessage
from app.services.chat_service import process_chat_message
from app.services.audit_service import log_audit_event

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/conversations", methods=["GET"])
@jwt_required()
def list_conversations():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Mother profile not found"}), 404

    convs = ChatConversation.query.filter_by(
        mother_id=user.mother_profile.id,
        is_archived=False
    ).order_by(ChatConversation.updated_at.desc()).all()

    return jsonify({
        "conversations": [c.to_dict(include_messages=False) for c in convs]
    }), 200


@chat_bp.route("/conversations", methods=["POST"])
@jwt_required()
def create_conversation():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Mother profile not found"}), 404

    data = request.get_json() or {}
    title = data.get("title", "Supportive Conversation").strip() or "Supportive Conversation"

    conv = ChatConversation(
        mother_id=user.mother_profile.id,
        title=title
    )
    db.session.add(conv)
    db.session.commit()

    # Add initial greeting message from HopeMind
    welcome_msg = ChatMessage(
        conversation_id=conv.id,
        sender="assistant",
        message_text=(
            f"Hello {user.full_name}, I'm HopeMind AI. I'm here to offer a calm, safe, and supportive space for you. "
            "Whether you're feeling overwhelmed, exhausted, or just want to talk through how your day went, I'm here to listen. "
            "How have you been feeling today?"
        ),
        safety_flag=False,
        safety_category="safe"
    )
    db.session.add(welcome_msg)
    db.session.commit()

    log_audit_event(user.id, "CHAT_CONV_CREATE", "chat_conversations", conv.id, "Started new supportive conversation")

    return jsonify({"conversation": conv.to_dict(include_messages=True)}), 201


@chat_bp.route("/conversations/<int:conv_id>", methods=["GET"])
@jwt_required()
def get_conversation(conv_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Unauthorized"}), 403

    conv = ChatConversation.query.get(conv_id)
    if not conv or conv.mother_id != user.mother_profile.id:
        return jsonify({"error": "Conversation not found or unauthorized"}), 404

    return jsonify({"conversation": conv.to_dict(include_messages=True)}), 200


@chat_bp.route("/conversations/<int:conv_id>/messages", methods=["POST"])
@jwt_required()
def send_message(conv_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Unauthorized"}), 403

    conv = ChatConversation.query.get(conv_id)
    if not conv or conv.mother_id != user.mother_profile.id:
        return jsonify({"error": "Conversation not found or unauthorized"}), 404

    data = request.get_json() or {}
    message_text = data.get("message", "").strip()
    if not message_text:
        return jsonify({"error": "Message text cannot be empty"}), 400

    try:
        result = process_chat_message(conv.id, message_text)
    except Exception as e:
        return jsonify({"error": f"Failed to process message: {str(e)}"}), 500

    if result.get("safety_intercepted"):
        log_audit_event(
            user.id, 
            "CHAT_CRISIS_INTERCEPTED", 
            "chat_messages", 
            result["user_message"]["id"], 
            f"Safety flag triggered: {result['crisis_info']['category']}"
        )

    return jsonify(result), 200


@chat_bp.route("/conversations/<int:conv_id>", methods=["DELETE"])
@jwt_required()
def delete_conversation(conv_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Unauthorized"}), 403

    conv = ChatConversation.query.get(conv_id)
    if not conv or conv.mother_id != user.mother_profile.id:
        return jsonify({"error": "Conversation not found or unauthorized"}), 404

    db.session.delete(conv)
    db.session.commit()
    log_audit_event(user.id, "CHAT_CONV_DELETE", "chat_conversations", conv_id, "Deleted chat conversation")

    return jsonify({"message": "Conversation deleted successfully"}), 200
