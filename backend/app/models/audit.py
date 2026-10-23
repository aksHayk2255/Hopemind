from datetime import datetime
from app import db

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = db.Column(db.String(100), nullable=False) # LOGIN, ASSESSMENT_SUBMIT, JOURNAL_CREATE, CLINICAL_NOTE_ADD, STATUS_CHANGE, USER_DEACTIVATE
    resource_type = db.Column(db.String(50), nullable=True) # Assessment, User, FollowUp, MoodEntry
    resource_id = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_email": self.user.email if self.user else "Anonymous / System",
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "ip_address": self.ip_address,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
