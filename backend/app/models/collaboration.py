from datetime import datetime

from app import db


class ClinicianVerification(db.Model):
    __tablename__ = "clinician_verifications"

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False, index=True)
    consultation_modes = db.Column(db.String(200), default="video,in_person", nullable=False)
    qualifications = db.Column(db.String(255), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    doctor = db.relationship("DoctorProfile")

    def to_dict(self):
        return {
            "status": self.status,
            "is_verified": self.status == "verified",
            "consultation_modes": [mode for mode in self.consultation_modes.split(",") if mode],
            "qualifications": self.qualifications,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
        }


class CareConnection(db.Model):
    __tablename__ = "care_connections"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.String(20), default="pending", nullable=False, index=True)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    __table_args__ = (db.UniqueConstraint("mother_id", "doctor_id", name="uq_care_connection"),)
    mother = db.relationship("MotherProfile")
    doctor = db.relationship("DoctorProfile")

    def to_dict(self):
        doctor = self.doctor.user if self.doctor else None
        return {
            "id": self.id,
            "mother_id": self.mother_id,
            "doctor_id": self.doctor_id,
            "doctor_name": doctor.full_name if doctor else None,
            "doctor_email": doctor.email if doctor else None,
            "specialization": self.doctor.specialization if self.doctor else None,
            "status": self.status,
            "requested_at": self.requested_at.isoformat() if self.requested_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
        }


class DataConsent(db.Model):
    __tablename__ = "data_consents"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    category = db.Column(db.String(40), nullable=False)
    status = db.Column(db.String(20), default="withdrawn", nullable=False, index=True)
    purpose = db.Column(db.String(255), nullable=False)
    version = db.Column(db.String(20), default="1.0", nullable=False)
    granted_at = db.Column(db.DateTime, nullable=True)
    withdrawn_at = db.Column(db.DateTime, nullable=True)
    __table_args__ = (db.UniqueConstraint("mother_id", "doctor_id", "category", name="uq_data_consent"),)
    doctor = db.relationship("DoctorProfile")

    def to_dict(self):
        return {
            "id": self.id,
            "mother_id": self.mother_id,
            "doctor_id": self.doctor_id,
            "category": self.category,
            "status": self.status,
            "purpose": self.purpose,
            "version": self.version,
            "granted_at": self.granted_at.isoformat() if self.granted_at else None,
            "withdrawn_at": self.withdrawn_at.isoformat() if self.withdrawn_at else None,
        }


class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = db.Column(db.DateTime, nullable=False, index=True)
    end_time = db.Column(db.DateTime, nullable=False)
    consultation_mode = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(20), default="requested", nullable=False, index=True)
    reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    mother = db.relationship("MotherProfile")
    doctor = db.relationship("DoctorProfile")

    def to_dict(self):
        return {
            "id": self.id,
            "mother_id": self.mother_id,
            "mother_name": self.mother.user.full_name if self.mother and self.mother.user else None,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.user.full_name if self.doctor and self.doctor.user else None,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "consultation_mode": self.consultation_mode,
            "status": self.status,
            "reason": self.reason,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ClinicalNote(db.Model):
    __tablename__ = "clinical_notes"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    encounter_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    observations = db.Column(db.Text, nullable=False)
    care_plan = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="draft", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    doctor = db.relationship("DoctorProfile")

    def to_dict(self):
        return {
            "id": self.id,
            "mother_id": self.mother_id,
            "doctor_id": self.doctor_id,
            "appointment_id": self.appointment_id,
            "doctor_name": self.doctor.user.full_name if self.doctor and self.doctor.user else None,
            "encounter_date": self.encounter_date.isoformat(),
            "reason": self.reason,
            "observations": self.observations,
            "care_plan": self.care_plan,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Referral(db.Model):
    __tablename__ = "referrals"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    destination = db.Column(db.String(255), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default="created", nullable=False, index=True)
    follow_up_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    doctor = db.relationship("DoctorProfile")

    def to_dict(self):
        return {
            "id": self.id,
            "mother_id": self.mother_id,
            "doctor_id": self.doctor_id,
            "doctor_name": self.doctor.user.full_name if self.doctor and self.doctor.user else None,
            "destination": self.destination,
            "reason": self.reason,
            "status": self.status,
            "follow_up_date": self.follow_up_date.isoformat() if self.follow_up_date else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
