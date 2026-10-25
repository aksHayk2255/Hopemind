import sys
from datetime import datetime, date, timedelta
from app import create_app, db
from app.models.user import User
from app.models.profile import MotherProfile, DoctorProfile, DoctorPatientAssignment
from app.models.assessment import Assessment, AssessmentResponse
from app.models.mood import MoodEntry
from app.models.chat import ChatConversation, ChatMessage
from app.models.follow_up import FollowUp
from app.models.notification import Notification
from app.models.privacy import UserPrivacyPreference
from app.models.ml_prediction import ModelPrediction
from app.models.audit import AuditLog
from app.models.collaboration import ClinicianVerification, CareConnection, DataConsent
from app.services.epds_service import calculate_epds_score
from app.services.nlp_service import analyze_journal_nlp
from app.services.ml_service import predict_ppd_risk

def seed_database():
    app = create_app("development")
    with app.app_context():
        print("[Seed] Resetting and re-creating database schema...")
        db.drop_all()
        db.create_all()

        print("[Seed] Creating users and profiles...")

        # 1. Admin User
        admin_user = User(
            email="admin@hopemind.org",
            full_name="System Administrator",
            role="admin",
            phone="+91 98765 00000",
            is_active=True
        )
        admin_user.set_password("AdminPass123!")
        db.session.add(admin_user)

        # 2. Doctor User
        doctor_user = User(
            email="doctor.sharma@example.com",
            full_name="Dr. Sunita Sharma, MD",
            role="doctor",
            phone="+91 98765 11111",
            is_active=True
        )
        doctor_user.set_password("Password123!")
        db.session.add(doctor_user)
        db.session.flush()

        doc_profile = DoctorProfile(
            user_id=doctor_user.id,
            specialization="Perinatal Psychiatry & Maternal Mental Health",
            license_number="MCI-2015-84920",
            hospital_affiliation="Apex Memorial Women & Child Healthcare",
            phone="+91 98765 11111",
            biography="Board-certified perinatal psychiatrist with 12+ years of experience in postpartum depression screening, emotional resilience, and maternal bonding support."
        )
        db.session.add(doc_profile)
        db.session.flush()
        db.session.add(ClinicianVerification(
            doctor_id=doc_profile.id,
            status="verified",
            qualifications="MD, Perinatal Psychiatry",
            consultation_modes="video,in_person",
            verified_at=datetime.utcnow(),
        ))

        # 3. Mother 1: Priya Sharma (Improving postpartum journey)
        mother1_user = User(
            email="priya@example.com",
            full_name="Priya Sharma",
            role="mother",
            phone="+91 98765 22222",
            is_active=True
        )
        mother1_user.set_password("Password123!")
        db.session.add(mother1_user)
        db.session.flush()

        delivery_date_1 = date.today() - timedelta(weeks=6)
        mother1_profile = MotherProfile(
            user_id=mother1_user.id,
            date_of_birth=date(1996, 5, 14),
            delivery_date=delivery_date_1,
            infant_name="Aarav",
            infant_gender="boy",
            delivery_type="vaginal",
            parity=1,
            emergency_contact_name="Rohan Sharma (Spouse)",
            emergency_contact_phone="+91 98765 33333"
        )
        db.session.add(mother1_profile)

        mother1_privacy = UserPrivacyPreference(
            user_id=mother1_user.id,
            share_journal_with_doctor=True,
            share_mood_with_doctor=True,
            allow_nlp_analysis=True,
            email_notifications_enabled=True,
            reminder_frequency="weekly"
        )
        db.session.add(mother1_privacy)
        db.session.flush()

        # 4. Mother 2: Ananya Patel (Needs clinical review, Q10 flag)
        mother2_user = User(
            email="ananya@example.com",
            full_name="Ananya Patel",
            role="mother",
            phone="+91 98765 44444",
            is_active=True
        )
        mother2_user.set_password("Password123!")
        db.session.add(mother2_user)
        db.session.flush()

        delivery_date_2 = date.today() - timedelta(weeks=3)
        mother2_profile = MotherProfile(
            user_id=mother2_user.id,
            date_of_birth=date(1998, 9, 21),
            delivery_date=delivery_date_2,
            infant_name="Diya",
            infant_gender="girl",
            delivery_type="cesarean",
            parity=1,
            emergency_contact_name="Karan Patel (Spouse)",
            emergency_contact_phone="+91 98765 55555"
        )
        db.session.add(mother2_profile)

        mother2_privacy = UserPrivacyPreference(
            user_id=mother2_user.id,
            share_journal_with_doctor=True,
            share_mood_with_doctor=True,
            allow_nlp_analysis=True,
            email_notifications_enabled=True,
            reminder_frequency="daily"
        )
        db.session.add(mother2_privacy)
        db.session.flush()

        # Assign both mothers to Dr. Sharma
        assign1 = DoctorPatientAssignment(
            doctor_id=doc_profile.id,
            mother_id=mother1_profile.id,
            is_active=True,
            notes="Regular postpartum wellness tracking following first delivery."
        )
        assign2 = DoctorPatientAssignment(
            doctor_id=doc_profile.id,
            mother_id=mother2_profile.id,
            is_active=True,
            notes="Under observation for post-cesarean recovery and sleep anxiety."
        )
        db.session.add(assign1)
        db.session.add(assign2)
        connection1 = CareConnection(
            mother_id=mother1_profile.id, doctor_id=doc_profile.id,
            status="accepted", accepted_at=datetime.utcnow() - timedelta(days=30)
        )
        connection2 = CareConnection(
            mother_id=mother2_profile.id, doctor_id=doc_profile.id,
            status="accepted", accepted_at=datetime.utcnow() - timedelta(days=20)
        )
        db.session.add_all([connection1, connection2])
        db.session.add_all([
            DataConsent(mother_id=mother1_profile.id, doctor_id=doc_profile.id, category="assessments", status="granted", purpose="Share EPDS screening history with this clinician.", granted_at=datetime.utcnow() - timedelta(days=30)),
            DataConsent(mother_id=mother1_profile.id, doctor_id=doc_profile.id, category="mood", status="granted", purpose="Share mood and wellness trends with this clinician.", granted_at=datetime.utcnow() - timedelta(days=30)),
            DataConsent(mother_id=mother2_profile.id, doctor_id=doc_profile.id, category="assessments", status="granted", purpose="Share EPDS screening history with this clinician.", granted_at=datetime.utcnow() - timedelta(days=20)),
        ])
        db.session.flush()

        print("[Seed] Creating assessments...")

        # Assessment 1 for Priya (4 weeks ago, High Risk)
        # 10 responses (indices 0-3)
        resp_p1 = [2, 2, 2, 2, 2, 2, 2, 2, 1, 0] # Score = 17
        total_p1, cat_p1, q10_p1, rec_p1, bk_p1 = calculate_epds_score(resp_p1)
        ass1 = Assessment(
            mother_id=mother1_profile.id,
            assessment_type="EPDS",
            total_score=total_p1,
            screening_category=cat_p1,
            question_10_flag=q10_p1,
            clinical_action_recommended=rec_p1,
            completion_time_seconds=75,
            created_at=datetime.utcnow() - timedelta(days=28)
        )
        db.session.add(ass1)
        db.session.flush()
        for itm in bk_p1:
            db.session.add(AssessmentResponse(
                assessment_id=ass1.id,
                question_index=itm["question_index"],
                question_text=itm["question_text"],
                selected_option_index=itm["selected_option_index"],
                selected_option_text=itm["selected_option_text"],
                score=itm["score"]
            ))

        # Assessment 2 for Priya (2 weeks ago, Moderate Risk)
        resp_p2 = [1, 1, 1, 2, 1, 2, 1, 1, 1, 0] # Score = 11
        total_p2, cat_p2, q10_p2, rec_p2, bk_p2 = calculate_epds_score(resp_p2)
        ass2 = Assessment(
            mother_id=mother1_profile.id,
            assessment_type="EPDS",
            total_score=total_p2,
            screening_category=cat_p2,
            question_10_flag=q10_p2,
            clinical_action_recommended=rec_p2,
            completion_time_seconds=64,
            created_at=datetime.utcnow() - timedelta(days=14)
        )
        db.session.add(ass2)
        db.session.flush()
        for itm in bk_p2:
            db.session.add(AssessmentResponse(
                assessment_id=ass2.id,
                question_index=itm["question_index"],
                question_text=itm["question_text"],
                selected_option_index=itm["selected_option_index"],
                selected_option_text=itm["selected_option_text"],
                score=itm["score"]
            ))

        # Assessment 3 for Priya (3 days ago, Low Risk - Showing recovery!)
        resp_p3 = [0, 1, 1, 1, 0, 1, 1, 1, 1, 0] # Score = 7
        total_p3, cat_p3, q10_p3, rec_p3, bk_p3 = calculate_epds_score(resp_p3)
        ass3 = Assessment(
            mother_id=mother1_profile.id,
            assessment_type="EPDS",
            total_score=total_p3,
            screening_category=cat_p3,
            question_10_flag=q10_p3,
            clinical_action_recommended=rec_p3,
            completion_time_seconds=52,
            created_at=datetime.utcnow() - timedelta(days=3)
        )
        db.session.add(ass3)
        db.session.flush()
        for itm in bk_p3:
            db.session.add(AssessmentResponse(
                assessment_id=ass3.id,
                question_index=itm["question_index"],
                question_text=itm["question_text"],
                selected_option_index=itm["selected_option_index"],
                selected_option_text=itm["selected_option_text"],
                score=itm["score"]
            ))

        # ML Prediction for Priya's latest assessment
        ml_p3 = predict_ppd_risk(epds_score=total_p3, sleep_hours=6.5, history_of_depression=0, social_support_score=4)
        pred3 = ModelPrediction(
            mother_id=mother1_profile.id,
            assessment_id=ass3.id,
            predicted_risk_score=ml_p3["probability"],
            predicted_category=ml_p3["category"],
            model_version=ml_p3["model_version"]
        )
        pred3.set_features(ml_p3["top_contributing_features"])
        db.session.add(pred3)

        # Assessment for Ananya (High Risk + Question 10 Flag)
        # Option 1 on Q10 has score > 0 -> triggers safety critical flag
        resp_a1 = [3, 2, 2, 3, 2, 2, 2, 2, 2, 1] # Score = 21 with Q10 flag
        total_a1, cat_a1, q10_a1, rec_a1, bk_a1 = calculate_epds_score(resp_a1)
        ass_ananya = Assessment(
            mother_id=mother2_profile.id,
            assessment_type="EPDS",
            total_score=total_a1,
            screening_category=cat_a1,
            question_10_flag=q10_a1,
            clinical_action_recommended=rec_a1,
            completion_time_seconds=90,
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.session.add(ass_ananya)
        db.session.flush()
        for itm in bk_a1:
            db.session.add(AssessmentResponse(
                assessment_id=ass_ananya.id,
                question_index=itm["question_index"],
                question_text=itm["question_text"],
                selected_option_index=itm["selected_option_index"],
                selected_option_text=itm["selected_option_text"],
                score=itm["score"]
            ))

        ml_ananya = predict_ppd_risk(epds_score=total_a1, sleep_hours=3.5, history_of_depression=1, social_support_score=2)
        pred_ananya = ModelPrediction(
            mother_id=mother2_profile.id,
            assessment_id=ass_ananya.id,
            predicted_risk_score=ml_ananya["probability"],
            predicted_category=ml_ananya["category"],
            model_version=ml_ananya["model_version"]
        )
        pred_ananya.set_features(ml_ananya["top_contributing_features"])
        db.session.add(pred_ananya)

        print("[Seed] Creating daily moods and journal entries...")

        # 10 Days of Moods for Priya
        mood_samples = [
            (9, "very_sad", 1, 4.0, "low", "Feeling utterly exhausted and overwhelmed with feedings. I could barely stop crying this afternoon."),
            (8, "sad", 2, 4.5, "low", "Tired and anxious. Rohan helped hold Aarav for an hour while I tried to nap."),
            (7, "sad", 2, 5.0, "moderate", "Better sleep stretch last night. Still feeling worried about his weight gain."),
            (6, "neutral", 3, 5.5, "moderate", "Calmer morning. Went for a small walk in the garden."),
            (5, "neutral", 3, 6.0, "moderate", "Had a good consultation with Dr. Sharma. Her reassurance helped a lot."),
            (4, "happy", 4, 6.5, "moderate", "Aarav smiled during his tummy time today! Feeling hopeful and blessed."),
            (3, "neutral", 3, 6.0, "moderate", "Standard busy day. Rested while baby slept in the afternoon."),
            (2, "happy", 4, 7.0, "high", "Slept 7 hours in broken shifts. Energy is definitely returning."),
            (1, "very_happy", 5, 7.5, "high", "Wonderful day with family visiting. Feeling supported and loved."),
            (0, "happy", 4, 7.0, "moderate", "Took 30 minutes for a peaceful warm bath. Grateful for this progress.")
        ]

        for days_ago, mood_str, score, sleep, energy, journal in mood_samples:
            nlp = analyze_journal_nlp(journal)
            m_entry = MoodEntry(
                mother_id=mother1_profile.id,
                mood=mood_str,
                mood_score=score,
                sleep_hours=sleep,
                energy_level=energy,
                journal_text=journal,
                sentiment_score=nlp["sentiment_score"],
                dominant_emotion=nlp["dominant_emotion"],
                entry_date=date.today() - timedelta(days=days_ago),
                created_at=datetime.utcnow() - timedelta(days=days_ago, hours=3)
            )
            db.session.add(m_entry)

        print("[Seed] Creating chat conversation and messages...")

        chat_conv = ChatConversation(
            mother_id=mother1_profile.id,
            title="Nighttime Anxiety & Sleep Support"
        )
        db.session.add(chat_conv)
        db.session.flush()

        db.session.add(ChatMessage(
            conversation_id=chat_conv.id,
            sender="user",
            message_text="I've been feeling so exhausted and anxious at 3 AM every time the baby wakes up.",
            safety_flag=False,
            safety_category="safe",
            created_at=datetime.utcnow() - timedelta(days=5, hours=2)
        ))
        db.session.add(ChatMessage(
            conversation_id=chat_conv.id,
            sender="assistant",
            message_text="It is completely understandable to feel utterly exhausted. Newborn sleep cycles are irregular, and prolonged sleep deprivation heavily impacts emotional resilience. When possible, try resting even for 20 minutes when someone else can watch the baby. Would you be able to designate one feeding window to a partner or family member so you can get an unbroken stretch of rest?",
            safety_flag=False,
            safety_category="safe",
            created_at=datetime.utcnow() - timedelta(days=5, hours=1, minutes=58)
        ))
        db.session.add(ChatMessage(
            conversation_id=chat_conv.id,
            sender="user",
            message_text="That makes sense. My husband said he can take the 4 AM feed tomorrow.",
            safety_flag=False,
            safety_category="safe",
            created_at=datetime.utcnow() - timedelta(days=5, hours=1, minutes=50)
        ))
        db.session.add(ChatMessage(
            conversation_id=chat_conv.id,
            sender="assistant",
            message_text="That is a wonderful step! Accepting support is a true sign of strength. Protecting that sleep window will help your body and nervous system restore balance.",
            safety_flag=False,
            safety_category="safe",
            created_at=datetime.utcnow() - timedelta(days=5, hours=1, minutes=49)
        ))

        print("[Seed] Creating clinical follow-up and notifications...")

        # Follow-up for Priya
        fu_priya = FollowUp(
            mother_id=mother1_profile.id,
            doctor_id=doc_profile.id,
            scheduled_date=datetime.utcnow() + timedelta(days=4, hours=2),
            status="scheduled",
            reason="6-Week Postnatal Wellness & Mood Review",
            clinical_notes="Patient has shown significant positive progress from baseline EPDS 17 down to 7. Continue healthy routines and discuss return to gentle physical activity."
        )
        db.session.add(fu_priya)

        # Follow-up for Ananya (Pending immediate review)
        fu_ananya = FollowUp(
            mother_id=mother2_profile.id,
            doctor_id=doc_profile.id,
            scheduled_date=datetime.utcnow() + timedelta(days=1, hours=1),
            status="pending_review",
            reason="Urgent Perinatal Depressive Symptom Assessment",
            clinical_notes="EPDS score 21 with positive Item 10 self-harm endorsement. Immediate tele-consultation scheduled. Family contact verified."
        )
        db.session.add(fu_ananya)

        # In-app Notifications
        notif1 = Notification(
            user_id=mother1_user.id,
            title="Follow-Up Appointment Scheduled",
            message=f"Dr. Sunita Sharma has scheduled your 6-Week Postnatal Wellness Review for {(datetime.utcnow() + timedelta(days=4)).strftime('%B %d, %Y')}.",
            type="follow_up",
            action_url="/dashboard"
        )
        notif2 = Notification(
            user_id=mother1_user.id,
            title="Weekly Wellness Check-in",
            message="Your mood has shown encouraging progress over the last two weeks! Keep recording your daily reflections.",
            type="system",
            action_url="/analytics"
        )
        notif3 = Notification(
            user_id=mother2_user.id,
            title="Immediate Clinical Support Available",
            message="Dr. Sharma has reviewed your recent screening and scheduled a priority follow-up. 24/7 helplines are also available.",
            type="crisis_alert",
            action_url="/emergency"
        )
        db.session.add(notif1)
        db.session.add(notif2)
        db.session.add(notif3)

        # Audit Logs
        log1 = AuditLog(
            user_id=admin_user.id,
            action="SYSTEM_INIT_SEED",
            resource_type="system",
            details="Seeded initial synthetic demonstration records for HopeMind viva presentation."
        )
        db.session.add(log1)

        db.session.commit()
        print("\n=======================================================")
        print(" [HOPE-MIND] DATABASE SEEDED SUCCESSFULLY")
        print("=======================================================")
        print(" Demonstration Accounts Ready for Presentation:")
        print(" -----------------------------------------------------")
        print(" 1. MOTHER (Standard / Improving):")
        print("    Email:    priya@example.com")
        print("    Password: Password123!")
        print(" -----------------------------------------------------")
        print(" 2. MOTHER (High Risk / Clinical Review Needed):")
        print("    Email:    ananya@example.com")
        print("    Password: Password123!")
        print(" -----------------------------------------------------")
        print(" 3. DOCTOR (Perinatal Psychiatrist):")
        print("    Email:    doctor.sharma@example.com")
        print("    Password: Password123!")
        print(" -----------------------------------------------------")
        print(" 4. ADMINISTRATOR:")
        print("    Email:    admin@hopemind.org")
        print("    Password: AdminPass123!")
        print("=======================================================\n")

if __name__ == "__main__":
    seed_database()
