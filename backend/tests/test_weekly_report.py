from datetime import date, timedelta
import pytest
from app import create_app, db
from app.models.user import User
from app.models.profile import MotherProfile, DoctorProfile, DoctorPatientAssignment
from app.models.collaboration import CareConnection, ClinicianVerification
from app.models.audit import AuditLog
from app.models.notification import Notification

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def register_and_login_mother(client, email="mother@example.com", name="Sarah Connor"):
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name,
        "role": "mother",
        "infant_name": "Baby John"
    })
    token = reg_res.get_json()["access_token"]
    user_id = reg_res.get_json()["user"]["id"]
    return token, user_id


def register_and_login_doctor(client, email="doctor@example.com", name="Dr. Grace"):
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name,
        "role": "doctor"
    })
    token = reg_res.get_json()["access_token"]
    user_id = reg_res.get_json()["user"]["id"]
    return token, user_id


def test_weekly_report_unauthorized(client):
    """Accessing report endpoints without JWT token must fail with 401."""
    res = client.get("/api/reports/weekly")
    assert res.status_code == 401

    res_prev = client.get("/api/reports/weekly/preview")
    assert res_prev.status_code == 401


def test_weekly_report_empty_data_graceful_handling(client):
    """When a mother has no mood entries, report still generates without error."""
    token, _ = register_and_login_mother(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Test preview with empty data
    prev_res = client.get("/api/reports/weekly/preview", headers=headers)
    assert prev_res.status_code == 200
    prev_data = prev_res.get_json()
    assert prev_data["has_data"] is False
    assert prev_data["report"]["metadata"]["entries_count"] == 0
    assert "insufficient" in prev_data["report"]["wellness_summary"].lower() or "no daily" in prev_data["report"]["wellness_summary"].lower()

    # Test PDF download with empty data
    pdf_res = client.get("/api/reports/weekly", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content_type == "application/pdf"
    assert pdf_res.data.startswith(b"%PDF-")


def test_weekly_report_with_actual_records(client):
    """Tests compiling actual mood, sleep, energy, journal, and EPDS records into PDF and preview."""
    token, user_id = register_and_login_mother(client)
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today()

    # Record 3 mood entries across 3 days
    for i in range(3):
        entry_date = (today - timedelta(days=2 - i)).isoformat()
        client.post("/api/moods", headers=headers, json={
            "mood": "happy" if i > 0 else "neutral",
            "sleep_hours": 6.5 + i * 0.5,
            "energy_level": "moderate" if i == 0 else "high",
            "journal_text": f"Day {i+1} feeling joyful, grateful and a bit exhausted.",
            "entry_date": entry_date
        })

    # Submit an EPDS assessment
    responses = [1, 1, 2, 1, 2, 2, 2, 2, 2, 3] # Safe Q10, mild score
    client.post("/api/assessments/submit", headers=headers, json={
        "responses": responses,
        "completion_time_seconds": 120
    })

    # Preview report
    prev_res = client.get("/api/reports/weekly/preview", headers=headers)
    assert prev_res.status_code == 200
    data = prev_res.get_json()
    assert data["has_data"] is True
    report = data["report"]

    assert report["metadata"]["entries_count"] == 3
    assert report["mood"]["average_score"] > 3.0
    assert report["sleep"]["average_hours"] >= 6.5
    assert report["journal"]["entries_with_journal"] == 3
    assert report["epds"]["latest"] is not None
    assert report["epds"]["latest"]["total_score"] is not None

    # Verify journal privacy: raw diary text is never exposed in the report JSON
    daily_records = report["daily_records"]
    for r in daily_records:
        assert "Day" not in r.get("journal_text", "")

    # Download PDF
    pdf_res = client.get("/api/reports/weekly", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content_type == "application/pdf"
    assert len(pdf_res.data) > 10000
    assert pdf_res.data.startswith(b"%PDF-")


def test_weekly_report_date_filtering_and_validation(client):
    """Tests date parameter filtering and range validation."""
    token, _ = register_and_login_mother(client)
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today()

    # Entry 10 days ago (outside default 7-day window)
    client.post("/api/moods", headers=headers, json={
        "mood": "very_happy",
        "sleep_hours": 8.0,
        "entry_date": (today - timedelta(days=10)).isoformat()
    })

    # Entry 2 days ago (inside 7-day window)
    client.post("/api/moods", headers=headers, json={
        "mood": "happy",
        "sleep_hours": 7.0,
        "entry_date": (today - timedelta(days=2)).isoformat()
    })

    # Default request (last 7 days) should only include 1 entry
    res_default = client.get("/api/reports/weekly/preview", headers=headers)
    assert res_default.get_json()["report"]["metadata"]["entries_count"] == 1

    # Wider range covering both entries
    start_str = (today - timedelta(days=12)).isoformat()
    end_str = today.isoformat()
    res_wide = client.get(f"/api/reports/weekly/preview?start_date={start_str}&end_date={end_str}", headers=headers)
    assert res_wide.get_json()["report"]["metadata"]["entries_count"] == 2

    # Invalid range: start_date > end_date
    res_invalid = client.get(f"/api/reports/weekly/preview?start_date={end_str}&end_date={start_str}", headers=headers)
    assert res_invalid.status_code == 400
    assert "cannot be after" in res_invalid.get_json()["error"]

    # Invalid format
    res_bad_fmt = client.get("/api/reports/weekly/preview?start_date=invalid-date", headers=headers)
    assert res_bad_fmt.status_code == 400


def test_weekly_report_data_isolation(client):
    """Ensures strict data isolation: Mother A's data is never visible to Mother B."""
    token_a, user_id_a = register_and_login_mother(client, email="motherA@example.com", name="Mother Alpha")
    token_b, user_id_b = register_and_login_mother(client, email="motherB@example.com", name="Mother Beta")

    # Mother A records an entry
    client.post("/api/moods", headers={"Authorization": f"Bearer {token_a}"}, json={
        "mood": "happy",
        "sleep_hours": 7.5,
        "energy_level": "high",
        "journal_text": "Mother A private thoughts",
        "entry_date": date.today().isoformat()
    })

    # Mother B fetches report
    res_b = client.get("/api/reports/weekly/preview", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    data_b = res_b.get_json()
    assert data_b["has_data"] is False
    assert data_b["report"]["metadata"]["entries_count"] == 0
    assert data_b["report"]["metadata"]["mother_name"] == "Mother Beta"


def test_share_report_with_doctor_workflow(client):
    """Tests the explicit Share with Doctor enhancement."""
    mother_token, mother_user_id = register_and_login_mother(client, email="mother_share@example.com", name="Alice Mother")
    doc_token, doc_user_id = register_and_login_doctor(client, email="doctor_share@example.com", name="Dr. Bob")

    mother_user = User.query.get(mother_user_id)
    doc_user = User.query.get(doc_user_id)

    # Establish doctor profile and verification
    doc_profile = doc_user.doctor_profile
    if not doc_profile:
        doc_profile = DoctorProfile(user_id=doc_user.id, specialization="Perinatal Psychiatry")
        db.session.add(doc_profile)
        db.session.commit()

    # Create CareConnection & assignment
    conn = CareConnection(mother_id=mother_user.mother_profile.id, doctor_id=doc_profile.id, status="accepted")
    assign = DoctorPatientAssignment(doctor_id=doc_profile.id, mother_id=mother_user.mother_profile.id, is_active=True)
    db.session.add(conn)
    db.session.add(assign)
    db.session.commit()

    # Mother logs mood
    client.post("/api/moods", headers={"Authorization": f"Bearer {mother_token}"}, json={
        "mood": "happy",
        "sleep_hours": 7.0,
        "entry_date": date.today().isoformat()
    })

    # Mother shares report with doctor
    share_res = client.post("/api/reports/share", headers={"Authorization": f"Bearer {mother_token}"}, json={
        "start_date": (date.today() - timedelta(days=6)).isoformat(),
        "end_date": date.today().isoformat(),
        "doctor_id": doc_profile.id
    })
    assert share_res.status_code == 200
    assert "successfully shared" in share_res.get_json()["message"]

    # Verify audit log recorded
    audit = AuditLog.query.filter_by(action="REPORT_SHARE_DOCTOR", user_id=mother_user_id).first()
    assert audit is not None
    assert doc_user.full_name in audit.details

    # Verify doctor notification created
    notif = Notification.query.filter_by(user_id=doc_user_id, type="report_shared").first()
    assert notif is not None
    assert "Weekly Wellness Report Shared" in notif.title

    # Doctor can now access the mother's report using mother_id
    doc_view = client.get(
        f"/api/reports/weekly/preview?mother_id={mother_user.mother_profile.id}",
        headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert doc_view.status_code == 200
    assert doc_view.get_json()["report"]["metadata"]["mother_name"] == "Alice Mother"
