from datetime import datetime, date
from app import db

class MoodEntry(db.Model):
    __tablename__ = "mood_entries"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    mood = db.Column(db.String(20), nullable=False) # very_sad, sad, neutral, happy, very_happy
    mood_score = db.Column(db.Integer, nullable=False) # 1 (very sad) to 5 (very happy)
    sleep_hours = db.Column(db.Float, nullable=True) # e.g. 5.5
    energy_level = db.Column(db.String(20), nullable=True) # low, moderate, high
    journal_text = db.Column(db.Text, nullable=True)
    sentiment_score = db.Column(db.Float, nullable=True) # -1.0 to 1.0 from NLP analysis
    dominant_emotion = db.Column(db.String(50), nullable=True) # e.g. joy, anxiety, exhaustion, gratitude, sadness
    entry_date = db.Column(db.Date, default=date.today, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self, include_journal=True):
        data = {
            "id": self.id,
            "mother_id": self.mother_id,
            "mood": self.mood,
            "mood_score": self.mood_score,
            "sleep_hours": self.sleep_hours,
            "energy_level": self.energy_level,
            "sentiment_score": self.sentiment_score,
            "dominant_emotion": self.dominant_emotion,
            "entry_date": self.entry_date.isoformat() if self.entry_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
        if include_journal:
            data["journal_text"] = self.journal_text
        return data
