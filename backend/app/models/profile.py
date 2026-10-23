from datetime import datetime, date
from app import db

class MotherProfile(db.Model):
    __tablename__ = "mother_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    delivery_date = db.Column(db.Date, nullable=True)
    infant_name = db.Column(db.String(100), nullable=True)
    infant_gender = db.Column(db.String(20), nullable=True) # boy, girl, prefer_not_to_say
    delivery_type = db.Column(db.String(30), nullable=True) # vaginal, cesarean, assisted
    parity = db.Column(db.Integer, default=1) # number of live births
    emergency_contact_name = db.Column(db.String(100), nullable=True)
    emergency_contact_phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assessments = db.relationship("Assessment", backref="mother", lazy="dynamic", cascade="all, delete-orphan")
    mood_entries = db.relationship("MoodEntry", backref="mother", lazy="dynamic", cascade="all, delete-orphan")
    conversations = db.relationship("ChatConversation", backref="mother", lazy="dynamic", cascade="all, delete-orphan")
    follow_ups = db.relationship("FollowUp", backref="mother", lazy="dynamic", cascade="all, delete-orphan")
    doctor_assignments = db.relationship("DoctorPatientAssignment", backref="mother", lazy="dynamic", cascade="all, delete-orphan")

    def weeks_postpartum(self) -> int:
        if not self.delivery_date:
            return 0
        diff = date.today() - self.delivery_date
        return max(0, diff.days // 7)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "delivery_date": self.delivery_date.isoformat() if self.delivery_date else None,
            "weeks_postpartum": self.weeks_postpartum(),
            "infant_name": self.infant_name,
            "infant_gender": self.infant_gender,
            "delivery_type": self.delivery_type,
            "parity": self.parity,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone
        }


class DoctorProfile(db.Model):
    __tablename__ = "doctor_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    specialization = db.Column(db.String(100), default="Obstetrics & Gynecology / Perinatal Mental Health")
    license_number = db.Column(db.String(50), nullable=True)
    hospital_affiliation = db.Column(db.String(150), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    biography = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    patient_assignments = db.relationship("DoctorPatientAssignment", backref="doctor", lazy="dynamic", cascade="all, delete-orphan")
    follow_ups = db.relationship("FollowUp", backref="doctor", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "specialization": self.specialization,
            "license_number": self.license_number,
            "hospital_affiliation": self.hospital_affiliation,
            "phone": self.phone,
            "biography": self.biography
        }


class DoctorPatientAssignment(db.Model):
    __tablename__ = "doctor_patient_assignments"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.UniqueConstraint("doctor_id", "mother_id", name="uq_doctor_mother_assignment"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "mother_id": self.mother_id,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "is_active": self.is_active,
            "notes": self.notes
        }
