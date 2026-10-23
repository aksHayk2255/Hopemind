from datetime import datetime
from app import db

class UserPrivacyPreference(db.Model):
    __tablename__ = "user_privacy_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    share_journal_with_doctor = db.Column(db.Boolean, default=False, nullable=False) # Requires explicit opt-in
    share_mood_with_doctor = db.Column(db.Boolean, default=True, nullable=False)
    allow_nlp_analysis = db.Column(db.Boolean, default=True, nullable=False) # Opt-in for emotion NLP
    email_notifications_enabled = db.Column(db.Boolean, default=False, nullable=False)
    reminder_frequency = db.Column(db.String(20), default="weekly", nullable=False) # daily, weekly, none
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "share_journal_with_doctor": self.share_journal_with_doctor,
            "share_mood_with_doctor": self.share_mood_with_doctor,
            "allow_nlp_analysis": self.allow_nlp_analysis,
            "email_notifications_enabled": self.email_notifications_enabled,
            "reminder_frequency": self.reminder_frequency,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
