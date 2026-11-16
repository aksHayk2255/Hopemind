from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.user import User
from app.models.profile import MotherProfile, DoctorProfile, DoctorPatientAssignment
from app.models.collaboration import CareConnection, DataConsent
from app.models.notification import Notification
from app.security.rbac import verify_mother_access
from app.services.audit_service import log_audit_event
from app.services.pdf_report_service import get_report_data, build_pdf_report

reports_bp = Blueprint("reports", __name__)


def parse_and_validate_dates():
    """
    Parses and validates start_date and end_date query parameters.
    Defaults to the last 7 days (today - 6 days through today).
    """
    end_str = request.args.get("end_date")
    start_str = request.args.get("start_date")

    today = date.today()

    if end_str:
        try:
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
        except ValueError:
            return None, None, ("Invalid end_date format. Please use YYYY-MM-DD.", 400)
    else:
        end_date = today

    if start_str:
        try:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
        except ValueError:
            return None, None, ("Invalid start_date format. Please use YYYY-MM-DD.", 400)
    else:
        start_date = end_date - timedelta(days=6)

    if start_date > end_date:
        return None, None, ("start_date cannot be after end_date.", 400)

    if (end_date - start_date).days > 90:
        return None, None, ("Date range cannot exceed 90 days.", 400)

    if start_date > today + timedelta(days=1):
        return None, None, ("start_date cannot be set in the future.", 400)

    return start_date, end_date, None


def resolve_target_mother():
    """
    Identifies the target mother profile for the request:
    - Mothers access their own records.
    - Assigned doctors may specify mother_id for their patients.
    - Returns (mother_profile, user, error_response).
    """
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return None, None, (jsonify({"error": "Unauthorized or inactive account"}), 401)

    if user.role == "mother":
        if not user.mother_profile:
            return None, None, (jsonify({"error": "Mother profile not configured."}), 404)
        return user.mother_profile, user, None

    elif user.role == "doctor":
        target_mother_id = request.args.get("mother_id", type=int)
        if not target_mother_id:
            return None, None, (jsonify({"error": "mother_id parameter is required for clinician report access."}), 400)

        allowed, err_msg = verify_mother_access(user, target_mother_id)
        if not allowed:
            return None, None, (jsonify({"error": err_msg}), 403)

        mother = db.session.get(MotherProfile, target_mother_id)
        if not mother:
            return None, None, (jsonify({"error": "Patient profile not found."}), 404)

        return mother, user, None

    return None, None, (jsonify({"error": "Access denied: Role not authorized to generate clinical reports."}), 403)


@reports_bp.route("/weekly", methods=["GET"])
@jwt_required()
def generate_weekly_report():
    """
    GET /api/reports/weekly
    Generates and downloads the Weekly Maternal Wellness Report PDF.
    If preview=true or format=json, returns the JSON report data for frontend preview.
    """
    mother, user, err = resolve_target_mother()
    if err:
        return err

    start_date, end_date, date_err = parse_and_validate_dates()
    if date_err:
        return jsonify({"error": date_err[0]}), date_err[1]

    # Check for preview mode
    is_preview = (
        request.args.get("preview", "").lower() in ["true", "1", "yes"] or
        request.args.get("format", "").lower() == "json"
    )

    try:
        report_data = get_report_data(mother.id, start_date, end_date)
    except Exception as e:
        return jsonify({"error": f"Failed to compile report data: {str(e)}"}), 500

    if is_preview:
        return jsonify({
            "report": report_data,
            "has_data": report_data["metadata"]["has_data"]
        }), 200

    # Build PDF
    try:
        pdf_buf = build_pdf_report(report_data)
    except Exception as e:
        return jsonify({"error": f"Failed to generate PDF document: {str(e)}"}), 500

    # Record audit event
    log_audit_event(
        user.id,
        "WEEKLY_REPORT_DOWNLOAD",
        "reports",
        mother.id,
        f"Downloaded Weekly Wellness Report ({start_date.isoformat()} to {end_date.isoformat()})"
    )

    filename = f"HopeMind_Weekly_Wellness_Report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.pdf"

    return send_file(
        pdf_buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )


@reports_bp.route("/weekly/preview", methods=["GET"])
@jwt_required()
def preview_weekly_report():
    """
    GET /api/reports/weekly/preview
    Convenience endpoint for frontend to preview report statistics and summaries.
    """
    mother, user, err = resolve_target_mother()
    if err:
        return err

    start_date, end_date, date_err = parse_and_validate_dates()
    if date_err:
        return jsonify({"error": date_err[0]}), date_err[1]

    try:
        report_data = get_report_data(mother.id, start_date, end_date)
    except Exception as e:
        return jsonify({"error": f"Failed to compile report data: {str(e)}"}), 500

    log_audit_event(
        user.id,
        "WEEKLY_REPORT_PREVIEW",
        "reports",
        mother.id,
        f"Previewed Weekly Wellness Report ({start_date.isoformat()} to {end_date.isoformat()})"
    )

    return jsonify({
        "report": report_data,
        "has_data": report_data["metadata"]["has_data"]
    }), 200


@reports_bp.route("/share", methods=["POST"])
@jwt_required()
def share_report_with_doctor():
    """
    POST /api/reports/share
    Allows mother to explicitly authorize sharing her Weekly Wellness Report with her assigned doctor.
    Never shares automatically.
    """
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user or user.role != "mother" or not user.mother_profile:
        return jsonify({"error": "Only mothers can share their reports with doctors."}), 403

    mother = user.mother_profile
    data = request.get_json() or {}

    start_str = data.get("start_date")
    end_str = data.get("end_date")
    doctor_id = data.get("doctor_id")

    today = date.today()
    if end_str:
        try:
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid end_date format"}), 400
    else:
        end_date = today

    if start_str:
        try:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid start_date format"}), 400
    else:
        start_date = end_date - timedelta(days=6)

    # Verify doctor assignment
    query = DoctorPatientAssignment.query.filter_by(mother_id=mother.id, is_active=True)
    if doctor_id:
        assignment = query.filter_by(doctor_id=doctor_id).first()
    else:
        assignment = query.first()

    if not assignment or not assignment.doctor:
        return jsonify({
            "error": "No assigned doctor found. Please connect with a verified healthcare professional first."
        }), 400

    doctor = assignment.doctor
    doc_user = doctor.user
    doc_name = doc_user.full_name if doc_user.full_name.startswith("Dr.") or doc_user.full_name.startswith("Dr ") else f"Dr. {doc_user.full_name}"

    # Ensure DataConsent for reports is recorded / granted
    consent = DataConsent.query.filter_by(
        mother_id=mother.id,
        doctor_id=doctor.id,
        category="reports"
    ).first()

    if not consent:
        consent = DataConsent(
            mother_id=mother.id,
            doctor_id=doctor.id,
            category="reports",
            purpose="Share weekly wellness summary and trend reports with assigned doctor.",
            status="granted",
            granted_at=datetime.utcnow()
        )
        db.session.add(consent)
    else:
        consent.status = "granted"
        consent.granted_at = datetime.utcnow()
        consent.withdrawn_at = None

    # Send notification to doctor
    doc_notif = Notification(
        user_id=doc_user.id,
        title="Weekly Wellness Report Shared",
        message=(
            f"{user.full_name} has authorized and shared her Weekly Wellness Report "
            f"for the period {start_date.strftime('%b %d, %Y')} – {end_date.strftime('%b %d, %Y')}."
        ),
        type="report_shared",
        action_url=f"/doctor/patients?mother_id={mother.id}"
    )
    db.session.add(doc_notif)
    db.session.commit()

    # Record audit log
    log_audit_event(
        user.id,
        "REPORT_SHARE_DOCTOR",
        "reports",
        mother.id,
        f"Shared weekly report ({start_date.isoformat()} to {end_date.isoformat()}) with {doc_name} (Doctor ID: {doctor.id})"
    )

    return jsonify({
        "message": f"Weekly Wellness Report successfully shared with {doc_name}.",
        "doctor": {
            "doctor_id": doctor.id,
            "full_name": doc_name,
            "specialization": doctor.specialization
        },
        "period": f"{start_date.strftime('%b %d, %Y')} – {end_date.strftime('%b %d, %Y')}",
        "shared_at": datetime.utcnow().isoformat()
    }), 200
