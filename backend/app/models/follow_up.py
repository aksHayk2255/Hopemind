from datetime import datetime
from app import db

class FollowUp(db.Model):
    __tablename__ = "follow_ups"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(30), default="scheduled", nullable=False, index=True) # pending_review, scheduled, completed, cancelled
    reason = db.Column(db.String(255), nullable=False)
    clinical_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "mother_id": self.mother_id,
            "mother_name": self.mother.user.full_name if self.mother and self.mother.user else None,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.user.full_name if self.doctor and self.doctor.user else None,
            "scheduled_date": self.scheduled_date.isoformat() if self.scheduled_date else None,
            "status": self.status,
            "reason": self.reason,
            "clinical_notes": self.clinical_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
