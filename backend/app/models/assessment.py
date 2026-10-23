from datetime import datetime
from app import db

class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_type = db.Column(db.String(50), default="EPDS", nullable=False)
    total_score = db.Column(db.Integer, nullable=False) # 0 to 30
    screening_category = db.Column(db.String(20), nullable=False) # low, moderate, high
    question_10_flag = db.Column(db.Boolean, default=False, nullable=False) # Critical safety question flag
    clinical_action_recommended = db.Column(db.String(255), nullable=False)
    completion_time_seconds = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    responses = db.relationship("AssessmentResponse", backref="assessment", lazy="joined", cascade="all, delete-orphan")
    ml_prediction = db.relationship("ModelPrediction", backref="assessment", uselist=False, cascade="all, delete-orphan")

    def to_dict(self, include_responses=True):
        data = {
            "id": self.id,
            "mother_id": self.mother_id,
            "assessment_type": self.assessment_type,
            "total_score": self.total_score,
            "screening_category": self.screening_category,
            "question_10_flag": self.question_10_flag,
            "clinical_action_recommended": self.clinical_action_recommended,
            "completion_time_seconds": self.completion_time_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "disclaimer": "The Edinburgh Postnatal Depression Scale (EPDS) is a standardized screening questionnaire to indicate symptom severity over the past 7 days. It is not an automated or definitive diagnosis. Clinical evaluation by a licensed healthcare provider is necessary."
        }
        if include_responses:
            data["responses"] = [r.to_dict() for r in self.responses]
        return data


class AssessmentResponse(db.Model):
    __tablename__ = "assessment_responses"

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    question_index = db.Column(db.Integer, nullable=False) # 0 to 9
    question_text = db.Column(db.String(255), nullable=False)
    selected_option_index = db.Column(db.Integer, nullable=False) # 0 to 3
    selected_option_text = db.Column(db.String(255), nullable=False)
    score = db.Column(db.Integer, nullable=False) # 0 to 3

    def to_dict(self):
        return {
            "id": self.id,
            "question_index": self.question_index,
            "question_text": self.question_text,
            "selected_option_index": self.selected_option_index,
            "selected_option_text": self.selected_option_text,
            "score": self.score
        }
