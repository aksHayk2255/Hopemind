import pytest
from app import create_app, db
from app.models.user import User
from app.services.epds_service import calculate_epds_score
from app.security.safety_filter import analyze_safety
from app.services.ml_service import predict_ppd_risk
from app.services.nlp_service import analyze_journal_nlp

@pytest.fixture
def client():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

def test_epds_scoring_calculation():
    # EPDS has 10 items, each 0 to 3.
    # Questions 1, 2, 4: option 0 = score 0.
    # Questions 3, 5, 6, 7, 8, 9, 10 are reverse-scored: option 3 = score 0.
    all_zeros = [0, 0, 3, 0, 3, 3, 3, 3, 3, 3]
    score, cat, q10, rec, breakdown = calculate_epds_score(all_zeros)
    assert score == 0
    assert cat == "low"
    assert q10 is False

    # Score >= 13 should be 'high'
    # Selecting high-distress options (standard=3, reversed=0) with Q10 safe (option 3 = 0)
    high_responses = [3, 3, 0, 3, 0, 0, 0, 0, 0, 3]
    score_h, cat_h, q10_h, rec_h, _ = calculate_epds_score(high_responses)
    assert score_h >= 13
    assert cat_h == "high"
    assert q10_h is False

    # Question 10 non-zero triggers critical safety flag (Q10 option 0 has score 3)
    q10_responses = [0, 0, 3, 0, 3, 3, 3, 3, 3, 0]
    score_q, cat_q, q10_flag, rec_q, _ = calculate_epds_score(q10_responses)
    assert q10_flag is True
    assert "URGENT CLINICAL ATTENTION" in rec_q

def test_safety_filter_crisis_detection():
    # Test safe text
    is_crisis, cat, _ = analyze_safety("I felt tired this morning but the baby is sleeping peacefully.")
    assert is_crisis is False

    # Test suicidal / self-harm ideation
    is_crisis, cat, matches = analyze_safety("I feel like I want to die and end my life.")
    assert is_crisis is True
    assert cat == "suicide_self_harm"

    # Test infant harm ideation
    is_crisis, cat, matches = analyze_safety("I am afraid I might shake my baby when crying doesn't stop.")
    assert is_crisis is True
    assert cat == "infant_harm"

def test_nlp_journal_analysis():
    # Positive text
    pos_res = analyze_journal_nlp("I am so happy and grateful today, feeling blessed and full of love.")
    assert pos_res["sentiment_score"] > 0
    assert pos_res["sentiment_label"] == "positive"
    assert "gratitude" in pos_res["detected_themes"]

    # Negative exhaustion text
    neg_res = analyze_journal_nlp("Utterly exhausted, drained, anxious, and can't sleep.")
    assert neg_res["sentiment_score"] < 0
    assert "exhaustion" in neg_res["detected_themes"] or "anxiety" in neg_res["detected_themes"]

def test_ml_risk_prediction():
    res = predict_ppd_risk(
        epds_score=18,
        sleep_hours=3.5,
        history_of_depression=1,
        social_support_score=1
    )
    assert "predicted_risk_score" in res
    assert res["predicted_risk_score"] > 0.5
    assert res["predicted_category"] == "high"
    assert len(res["top_features"]) > 0
    assert "academic research" in res["disclaimer"].lower()

def test_auth_workflow(client):
    # Register mother
    reg_res = client.post("/api/auth/register", json={
        "email": "testmother@example.com",
        "password": "SecurePassword123!",
        "full_name": "Test Mother",
        "role": "mother",
        "infant_name": "Leo"
    })
    assert reg_res.status_code == 201
    token = reg_res.get_json()["access_token"]
    assert token is not None

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": "testmother@example.com",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.get_json()["user"]["role"] == "mother"

    # Unauthorized access check
    bad_login = client.post("/api/auth/login", json={
        "email": "testmother@example.com",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401
