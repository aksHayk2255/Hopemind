from flask import request
from app import db
from app.models.audit import AuditLog

def log_audit_event(user_id: int, action: str, resource_type: str = None, resource_id: int = None, details: str = None):
    """
    Records security, clinical access, and administrative events in the AuditLog.
    Never logs sensitive text, passwords, or raw journal contents.
    """
    try:
        ip = request.remote_addr if request else None
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip,
            details=details
        )
        db.session.add(entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Non-blocking failure for audit logging
        print(f"[Audit Log Error] Failed to write audit event: {e}")
