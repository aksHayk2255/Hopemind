import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from config import config_by_name

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
cors = CORS()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")
        
    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    
    # Register JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({
            "error": "Unauthorized",
            "message": "Missing or invalid authorization token"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({
            "error": "Invalid Token",
            "message": "Token verification failed"
        }), 401

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token Expired",
            "message": "Your session has expired. Please log in again."
        }), 401

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.assessment import assessment_bp
    from app.routes.mood import mood_bp
    from app.routes.chat import chat_bp
    from app.routes.doctor import doctor_bp
    from app.routes.admin import admin_bp
    from app.routes.ml import ml_bp
    from app.routes.notifications import notifications_bp
    from app.routes.user import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(assessment_bp, url_prefix="/api/assessments")
    app.register_blueprint(mood_bp, url_prefix="/api/moods")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(doctor_bp, url_prefix="/api/doctor")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(ml_bp, url_prefix="/api/ml")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(user_bp, url_prefix="/api/user")

    @app.route("/api/health")
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "HopeMind Postpartum Support API",
            "version": "1.0.0",
            "environment": config_name
        }), 200

    return app
