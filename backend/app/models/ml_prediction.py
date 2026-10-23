import json
from datetime import datetime
from app import db

class ModelPrediction(db.Model):
    __tablename__ = "model_predictions"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=True, index=True)
    predicted_risk_score = db.Column(db.Float, nullable=False) # 0.0 to 1.0 (probability of elevated risk)
    predicted_category = db.Column(db.String(20), nullable=False) # low, moderate, high
    model_version = db.Column(db.String(50), default="RandomForest_v1.0_AcademicBaseline", nullable=False)
    top_features_json = db.Column(db.Text, nullable=True) # JSON array of feature contributions
    disclaimer = db.Column(db.Text, nullable=False, default="This is an experimental machine learning risk estimate intended strictly for academic demonstration and decision support. It is NOT a validated diagnostic medical device.")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def get_features(self):
        if not self.top_features_json:
            return []
        try:
            return json.loads(self.top_features_json)
        except Exception:
            return []

    def set_features(self, features_list):
        self.top_features_json = json.dumps(features_list)

    def to_dict(self):
        return {
            "id": self.id,
            "mother_id": self.mother_id,
            "assessment_id": self.assessment_id,
            "predicted_risk_score": round(self.predicted_risk_score, 4),
            "predicted_category": self.predicted_category,
            "model_version": self.model_version,
            "top_features": self.get_features(),
            "disclaimer": self.disclaimer,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
