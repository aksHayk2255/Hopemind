from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="mother", index=True) # mother, doctor, admin
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    mother_profile = db.relationship("MotherProfile", backref="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = db.relationship("DoctorProfile", backref="user", uselist=False, cascade="all, delete-orphan")
    privacy_preferences = db.relationship("UserPrivacyPreference", backref="user", uselist=False, cascade="all, delete-orphan")
    notifications = db.relationship("Notification", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    audit_logs = db.relationship("AuditLog", backref="user", lazy="dynamic")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "has_profile": bool(self.mother_profile or self.doctor_profile)
        }
