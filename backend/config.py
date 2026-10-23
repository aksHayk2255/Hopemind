import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    """Base application configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "hopemind-dev-secret-key-change-in-production-2026")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "hopemind-jwt-secret-key-change-in-production-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get("JWT_EXPIRE_HOURS", 24)))
    
    # Database - SQLite by default for zero-setup local viva/demo, PostgreSQL supported
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'hopemind.db'}"
    )
    # Fix for Heroku/Render postgres:// uri
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS configuration
    CORS_ORIGINS = [
        origin.strip() for origin in os.environ.get(
            "CORS_ORIGINS", 
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
        ).split(",") if origin.strip()
    ]
    
    # AI / LLM Configuration
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    
    # ML Model directory
    ML_ARTIFACTS_DIR = BASE_DIR.parent / "ml" / "models"
    ML_MODEL_PATH = ML_ARTIFACTS_DIR / "ppd_risk_model.joblib"
    
    # Emergency helplines (configurable per country / region)
    EMERGENCY_CONTACTS = [
        {
            "name": "Tele-MANAS (24x7 Mental Health Helpline)",
            "number": "14416 / 1800-891-4416",
            "region": "India (Free / All Languages)",
            "available": "24/7",
            "type": "Government Mental Health"
        },
        {
            "name": "KIRAN Mental Health Helpline",
            "number": "1800-599-0019",
            "region": "India",
            "available": "24/7",
            "type": "Psychological Support"
        },
        {
            "name": "Vandrevala Foundation for Mental Health",
            "number": "+91 9999 666 555",
            "region": "India / Worldwide WhatsApp Support",
            "available": "24/7",
            "type": "Crisis Intervention"
        },
        {
            "name": "National Emergency Services",
            "number": "112",
            "region": "National Police/Ambulance",
            "available": "24/7",
            "type": "Immediate Physical Danger"
        },
        {
            "name": "988 Suicide & Crisis Lifeline",
            "number": "988",
            "region": "USA / International routing",
            "available": "24/7",
            "type": "Crisis Lifeline"
        }
    ]

class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=60)
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    DEBUG = False
    # Enforce strict secret key requirement in real production
    @classmethod
    def init_app(cls, app):
        assert os.environ.get("SECRET_KEY"), "SECRET_KEY environment variable must be set in production"
        assert os.environ.get("JWT_SECRET_KEY"), "JWT_SECRET_KEY environment variable must be set in production"

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
