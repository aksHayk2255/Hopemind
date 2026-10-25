from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.mood import MoodEntry
from app.services.nlp_service import analyze_journal_nlp
from app.services.audit_service import log_audit_event
from app.security.rbac import verify_mother_access

mood_bp = Blueprint("mood", __name__)

MOOD_SCORE_MAP = {
    "very_sad": 1,
    "sad": 2,
    "neutral": 3,
    "happy": 4,
    "very_happy": 5
}

@mood_bp.route("", methods=["POST"])
@jwt_required()
def create_mood_entry():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Only registered mothers can record mood and journal entries"}), 403

    data = request.get_json() or {}
    mood = data.get("mood", "neutral")
    if mood not in MOOD_SCORE_MAP:
        return jsonify({"error": f"Invalid mood. Must be one of: {', '.join(MOOD_SCORE_MAP.keys())}"}), 400

    mood_score = MOOD_SCORE_MAP[mood]
    sleep_hours = data.get("sleep_hours")
    if sleep_hours is not None:
        try:
            sleep_hours = float(sleep_hours)
            if sleep_hours < 0 or sleep_hours > 24:
                return jsonify({"error": "Sleep hours must be between 0 and 24"}), 400
        except ValueError:
            return jsonify({"error": "Sleep hours must be a number"}), 400

    entry_date = date.today()
    if data.get("entry_date"):
        try:
            entry_date = datetime.strptime(data["entry_date"], "%Y-%m-%d").date()
        except ValueError:
            pass

    journal_text = data.get("journal_text", "").strip() if data.get("journal_text") else None
    
    # NLP emotion analysis (if user allowed and journal provided)
    sentiment_score = None
    dominant_emotion = None
    allow_nlp = True
    if user.privacy_preferences and not user.privacy_preferences.allow_nlp_analysis:
        allow_nlp = False

    if journal_text and allow_nlp:
        nlp_res = analyze_journal_nlp(journal_text)
        sentiment_score = nlp_res["sentiment_score"]
        dominant_emotion = nlp_res["dominant_emotion"]

    entry = MoodEntry(
        mother_id=user.mother_profile.id,
        mood=mood,
        mood_score=mood_score,
        sleep_hours=sleep_hours,
        energy_level=data.get("energy_level", "moderate"),
        journal_text=journal_text,
        sentiment_score=sentiment_score,
        dominant_emotion=dominant_emotion,
        entry_date=entry_date
    )
    db.session.add(entry)
    db.session.commit()

    log_audit_event(user.id, "MOOD_ENTRY_CREATE", "mood_entries", entry.id, f"Recorded mood={mood}, sleep={sleep_hours}")

    return jsonify({
        "message": "Mood entry recorded successfully",
        "entry": entry.to_dict(include_journal=True)
    }), 201


@mood_bp.route("", methods=["GET"])
@jwt_required()
def get_mood_entries():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Mother profile not found"}), 404

    query = MoodEntry.query.filter_by(mother_id=user.mother_profile.id)

    # Optional date filters
    start_str = request.args.get("start_date")
    end_str = request.args.get("end_date")
    if start_str:
        try:
            query = query.filter(MoodEntry.entry_date >= datetime.strptime(start_str, "%Y-%m-%d").date())
        except ValueError:
            pass
    if end_str:
        try:
            query = query.filter(MoodEntry.entry_date <= datetime.strptime(end_str, "%Y-%m-%d").date())
        except ValueError:
            pass

    limit = request.args.get("limit", 30, type=int)
    entries = query.order_by(MoodEntry.entry_date.desc(), MoodEntry.created_at.desc()).limit(limit).all()

    return jsonify({
        "entries": [e.to_dict(include_journal=True) for e in entries]
    }), 200


@mood_bp.route("/<int:entry_id>", methods=["GET"])
@jwt_required()
def get_single_mood_entry(entry_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    entry = MoodEntry.query.get(entry_id)
    if not entry:
        return jsonify({"error": "Mood entry not found"}), 404

    allowed, err_msg = verify_mother_access(user, entry.mother_id)
    if not allowed:
        return jsonify({"error": err_msg}), 403

    # Check privacy preferences for doctor viewing journal
    include_journal = True
    if user.role == "doctor":
        mother_user = entry.mother.user
        if mother_user.privacy_preferences and not mother_user.privacy_preferences.share_journal_with_doctor:
            include_journal = False

    return jsonify({"entry": entry.to_dict(include_journal=include_journal)}), 200


@mood_bp.route("/<int:entry_id>", methods=["PUT"])
@jwt_required()
def update_mood_entry(entry_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Unauthorized"}), 403

    entry = MoodEntry.query.get(entry_id)
    if not entry or entry.mother_id != user.mother_profile.id:
        return jsonify({"error": "Entry not found or unauthorized"}), 404

    data = request.get_json() or {}
    if "mood" in data:
        if data["mood"] in MOOD_SCORE_MAP:
            entry.mood = data["mood"]
            entry.mood_score = MOOD_SCORE_MAP[data["mood"]]
    if "sleep_hours" in data:
        entry.sleep_hours = float(data["sleep_hours"]) if data["sleep_hours"] is not None else None
    if "energy_level" in data:
        entry.energy_level = data["energy_level"]
    if "journal_text" in data:
        entry.journal_text = data["journal_text"].strip() if data["journal_text"] else None
        if entry.journal_text:
            nlp_res = analyze_journal_nlp(entry.journal_text)
            entry.sentiment_score = nlp_res["sentiment_score"]
            entry.dominant_emotion = nlp_res["dominant_emotion"]

    db.session.commit()
    log_audit_event(user.id, "MOOD_ENTRY_UPDATE", "mood_entries", entry.id, "Updated mood entry")

    return jsonify({
        "message": "Mood entry updated successfully",
        "entry": entry.to_dict(include_journal=True)
    }), 200


@mood_bp.route("/<int:entry_id>", methods=["DELETE"])
@jwt_required()
def delete_mood_entry(entry_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Unauthorized"}), 403

    entry = MoodEntry.query.get(entry_id)
    if not entry or entry.mother_id != user.mother_profile.id:
        return jsonify({"error": "Entry not found or unauthorized"}), 404

    db.session.delete(entry)
    db.session.commit()
    log_audit_event(user.id, "MOOD_ENTRY_DELETE", "mood_entries", entry_id, "Deleted mood entry")

    return jsonify({"message": "Mood entry deleted successfully"}), 200


@mood_bp.route("/analytics", methods=["GET"])
@jwt_required()
def get_mood_analytics():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.mother_profile:
        return jsonify({"error": "Mother profile not found"}), 404

    days = request.args.get("days", 14, type=int)
    cutoff = date.today() - timedelta(days=days)

    entries = MoodEntry.query.filter(
        MoodEntry.mother_id == user.mother_profile.id,
        MoodEntry.entry_date >= cutoff
    ).order_by(MoodEntry.entry_date.asc()).all()

    if not entries:
        return jsonify({
            "has_data": False,
            "message": "No mood entries recorded yet. Begin tracking your daily mood to see visual trends.",
            "average_mood_score": 0,
            "average_sleep_hours": 0,
            "entries_count": 0,
            "daily_trends": []
        }), 200

    mood_scores = [e.mood_score for e in entries]
    sleep_values = [e.sleep_hours for e in entries if e.sleep_hours is not None]
    
    avg_mood = sum(mood_scores) / len(mood_scores)
    avg_sleep = sum(sleep_values) / len(sleep_values) if sleep_values else 0

    daily_trends = []
    for e in entries:
        daily_trends.append({
            "date": e.entry_date.isoformat(),
            "mood": e.mood,
            "mood_score": e.mood_score,
            "sleep_hours": e.sleep_hours,
            "sentiment_score": e.sentiment_score,
            "dominant_emotion": e.dominant_emotion,
            "has_journal": bool(e.journal_text)
        })

    # Emotion frequency distribution
    emotions = {}
    for e in entries:
        if e.dominant_emotion:
            emotions[e.dominant_emotion] = emotions.get(e.dominant_emotion, 0) + 1

    return jsonify({
        "has_data": True,
        "days_window": days,
        "entries_count": len(entries),
        "average_mood_score": round(avg_mood, 2),
        "average_sleep_hours": round(avg_sleep, 1),
        "dominant_emotions": emotions,
        "daily_trends": daily_trends
    }), 200
