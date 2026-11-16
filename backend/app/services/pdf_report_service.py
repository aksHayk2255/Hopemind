import io
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from app import db
from app.models.mood import MoodEntry
from app.models.assessment import Assessment
from app.models.profile import MotherProfile, DoctorPatientAssignment
from app.models.collaboration import CareConnection


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total pages and draw
    consistent header/footer decorations.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_decorations(self, num_pages: int):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#4f46e5"))
        self.drawString(36, 762, "HopeMind")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(82, 762, "|  Weekly Maternal Wellness Summary")

        gen_date_str = datetime.utcnow().strftime("%B %d, %Y")
        self.drawRightString(576, 762, f"Generated: {gen_date_str}")

        # Top header rule
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(36, 754, 576, 754)

        # Bottom footer rule
        self.line(36, 42, 576, 42)

        # Footer text
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(36, 30, "HopeMind — Educational Wellness Support. Not a diagnostic medical device.")
        self.drawRightString(576, 30, f"Page {self._pageNumber} of {num_pages}")
        self.restoreState()


def get_report_data(mother_id: int, start_date: date, end_date: date) -> Dict[str, Any]:
    """
    Aggregates mood entries, sleep records, energy levels, journal themes,
    and EPDS assessment history for the selected mother and date range.
    """
    mother = db.session.get(MotherProfile, mother_id)
    if not mother:
        raise ValueError("Mother profile not found")

    user = mother.user

    # Fetch mood entries in date range
    entries = MoodEntry.query.filter(
        MoodEntry.mother_id == mother_id,
        MoodEntry.entry_date >= start_date,
        MoodEntry.entry_date <= end_date
    ).order_by(MoodEntry.entry_date.asc(), MoodEntry.created_at.asc()).all()

    # Calculate date span
    total_days = (end_date - start_date).days + 1

    # Map daily records
    daily_records = []
    mood_scores = []
    sleep_values = []
    energy_levels = []
    themes_detected = []
    journal_count = 0

    for e in entries:
        mood_scores.append(e.mood_score)
        if e.sleep_hours is not None:
            sleep_values.append(e.sleep_hours)
        if e.energy_level:
            energy_levels.append(e.energy_level.lower())
        if e.dominant_emotion:
            themes_detected.append(e.dominant_emotion)
        if e.journal_text and e.journal_text.strip():
            journal_count += 1

        daily_records.append({
            "id": e.id,
            "date": e.entry_date.isoformat(),
            "date_display": e.entry_date.strftime("%b %d, %Y"),
            "day_name": e.entry_date.strftime("%a"),
            "mood": e.mood,
            "mood_display": e.mood.replace("_", " ").title(),
            "mood_score": e.mood_score,
            "sleep_hours": e.sleep_hours,
            "energy_level": (e.energy_level or "moderate").capitalize(),
            "dominant_emotion": e.dominant_emotion or "—",
            "has_journal": bool(e.journal_text and e.journal_text.strip())
        })

    has_data = len(entries) > 0

    # Mood stats
    avg_mood = round(sum(mood_scores) / len(mood_scores), 2) if mood_scores else None
    mood_distribution = {
        "very_sad": sum(1 for s in mood_scores if s == 1),
        "sad": sum(1 for s in mood_scores if s == 2),
        "neutral": sum(1 for s in mood_scores if s == 3),
        "happy": sum(1 for s in mood_scores if s == 4),
        "very_happy": sum(1 for s in mood_scores if s == 5),
    }

    mood_state_label = "Insufficient Data"
    if avg_mood is not None:
        if avg_mood >= 4.0:
            mood_state_label = "Positive / Uplifted"
        elif avg_mood >= 3.2:
            mood_state_label = "Balanced / Steady"
        elif avg_mood >= 2.5:
            mood_state_label = "Mild Distress / Low"
        else:
            mood_state_label = "Elevated Distress / Very Low"

    # Sleep stats
    avg_sleep = round(sum(sleep_values) / len(sleep_values), 1) if sleep_values else None
    min_sleep = min(sleep_values) if sleep_values else None
    max_sleep = max(sleep_values) if sleep_values else None

    # Energy stats
    energy_dist = {
        "low": sum(1 for lvl in energy_levels if lvl == "low"),
        "moderate": sum(1 for lvl in energy_levels if lvl == "moderate"),
        "high": sum(1 for lvl in energy_levels if lvl == "high"),
    }
    predominant_energy = "Moderate"
    if energy_levels:
        predominant_energy = max(energy_dist.items(), key=lambda x: x[1])[0].capitalize()

    # Themes frequency
    theme_counts: Dict[str, int] = {}
    for t in themes_detected:
        norm_t = t.strip().lower().replace("_", " ").title()
        theme_counts[norm_t] = theme_counts.get(norm_t, 0) + 1

    # EPDS Assessments: Latest and Previous
    end_dt = datetime.combine(end_date, datetime.max.time())
    assessments = Assessment.query.filter(
        Assessment.mother_id == mother_id,
        Assessment.created_at <= end_dt
    ).order_by(Assessment.created_at.desc()).limit(2).all()

    latest_assessment = None
    previous_assessment = None
    epds_comparison = "No screening assessments available for comparison."

    if len(assessments) >= 1:
        latest_assessment = {
            "id": assessments[0].id,
            "total_score": assessments[0].total_score,
            "screening_category": assessments[0].screening_category.capitalize(),
            "question_10_flag": assessments[0].question_10_flag,
            "clinical_action_recommended": assessments[0].clinical_action_recommended,
            "created_at": assessments[0].created_at.strftime("%b %d, %Y")
        }
        if len(assessments) >= 2:
            previous_assessment = {
                "id": assessments[1].id,
                "total_score": assessments[1].total_score,
                "screening_category": assessments[1].screening_category.capitalize(),
                "question_10_flag": assessments[1].question_10_flag,
                "clinical_action_recommended": assessments[1].clinical_action_recommended,
                "created_at": assessments[1].created_at.strftime("%b %d, %Y")
            }
            diff = latest_assessment["total_score"] - previous_assessment["total_score"]
            if diff < 0:
                epds_comparison = f"Score decreased by {abs(diff)} points (from {previous_assessment['total_score']} to {latest_assessment['total_score']}), indicating reduced symptom severity."
            elif diff > 0:
                epds_comparison = f"Score increased by {diff} points (from {previous_assessment['total_score']} to {latest_assessment['total_score']}), reflecting increased self-reported distress."
            else:
                epds_comparison = f"Score remained stable at {latest_assessment['total_score']} points across consecutive screenings."
        else:
            epds_comparison = f"Single recorded assessment of {latest_assessment['total_score']}/30 on {latest_assessment['created_at']}."

    # Synthesis of Weekly Wellness Summary
    wellness_summary_text = generate_wellness_summary(
        has_data=has_data,
        total_days=total_days,
        entries_count=len(entries),
        avg_mood=avg_mood,
        mood_state_label=mood_state_label,
        avg_sleep=avg_sleep,
        predominant_energy=predominant_energy,
        latest_assessment=latest_assessment,
        theme_counts=theme_counts
    )

    # Assigned Doctor info
    active_assignment = DoctorPatientAssignment.query.filter_by(
        mother_id=mother_id, is_active=True
    ).first()
    doctor_info = None
    if active_assignment and active_assignment.doctor and active_assignment.doctor.user:
        doc_user = active_assignment.doctor.user
        doc_name = doc_user.full_name if doc_user.full_name.startswith("Dr.") or doc_user.full_name.startswith("Dr ") else f"Dr. {doc_user.full_name}"
        doctor_info = {
            "doctor_id": active_assignment.doctor.id,
            "name": doc_name,
            "specialization": active_assignment.doctor.specialization,
            "hospital": active_assignment.doctor.hospital_affiliation or "Postpartum Care Clinic",
            "email": doc_user.email
        }

    return {
        "metadata": {
            "mother_id": mother_id,
            "mother_name": user.full_name,
            "infant_name": mother.infant_name or "Baby",
            "weeks_postpartum": mother.weeks_postpartum(),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "start_date_display": start_date.strftime("%B %d, %Y"),
            "end_date_display": end_date.strftime("%B %d, %Y"),
            "period_display": f"{start_date.strftime('%b %d, %Y')} – {end_date.strftime('%b %d, %Y')}",
            "generation_date": datetime.utcnow().strftime("%B %d, %Y"),
            "total_days": total_days,
            "entries_count": len(entries),
            "has_data": has_data
        },
        "mood": {
            "average_score": avg_mood,
            "state_label": mood_state_label,
            "distribution": mood_distribution,
            "entries_count": len(mood_scores)
        },
        "sleep": {
            "average_hours": avg_sleep,
            "min_hours": min_sleep,
            "max_hours": max_sleep,
            "records_count": len(sleep_values)
        },
        "energy": {
            "predominant_level": predominant_energy,
            "distribution": energy_dist
        },
        "journal": {
            "entries_with_journal": journal_count,
            "recurring_themes": theme_counts
        },
        "epds": {
            "latest": latest_assessment,
            "previous": previous_assessment,
            "comparison": epds_comparison
        },
        "daily_records": daily_records,
        "wellness_summary": wellness_summary_text,
        "recommendations": get_general_recommendations(avg_sleep, avg_mood, latest_assessment),
        "doctor_info": doctor_info
    }


def generate_wellness_summary(
    has_data: bool,
    total_days: int,
    entries_count: int,
    avg_mood: Optional[float],
    mood_state_label: str,
    avg_sleep: Optional[float],
    predominant_energy: str,
    latest_assessment: Optional[Dict[str, Any]],
    theme_counts: Dict[str, int]
) -> str:
    """
    Constructs a compassionate, neutral, objective wellness overview.
    Does NOT assert clinical diagnoses.
    """
    if not has_data:
        return (
            "During the selected period, no daily mood or wellness check-in entries were recorded. "
            "Regular daily logs assist in identifying patterns between sleep consistency and emotional resilience. "
            "We encourage logging daily reflections to generate personalized wellness tracking."
        )

    parts = []
    parts.append(
        f"Over the {total_days}-day reporting window, {entries_count} check-in "
        f"{'entry was' if entries_count == 1 else 'entries were'} recorded."
    )

    if avg_mood is not None:
        parts.append(
            f"Daily mood evaluations averaged {avg_mood:.1f} out of 5.0 ({mood_state_label})."
        )

    if avg_sleep is not None:
        parts.append(
            f"Sleep duration averaged {avg_sleep:.1f} hours per night."
        )

    parts.append(f"Self-reported daytime energy levels were predominantly {predominant_energy.lower()}.")

    if theme_counts:
        top_themes = [k for k, v in sorted(theme_counts.items(), key=lambda item: item[1], reverse=True)[:3]]
        parts.append(f"Recurring emotional themes identified in reflections included {', '.join(top_themes).lower()}.")

    if latest_assessment:
        parts.append(
            f"The latest EPDS screening on {latest_assessment['created_at']} recorded a score of "
            f"{latest_assessment['total_score']}/30 ({latest_assessment['screening_category']} distress range)."
        )
        if latest_assessment.get("question_10_flag"):
            parts.append("Note: The screening flagged critical safety items recommending prompt clinical follow-up.")

    return " ".join(parts)


def get_general_recommendations(
    avg_sleep: Optional[float],
    avg_mood: Optional[float],
    latest_assessment: Optional[Dict[str, Any]]
) -> List[Dict[str, str]]:
    """
    Generates standard, supportive wellness guidance and contact resources.
    """
    suggestions = [
        {
            "category": "Rest & Sleep Strategy",
            "detail": (
                "Postpartum sleep is often fragmented. Aim for restorative rest periods during baby nap windows, "
                "and establish a calming pre-rest routine free from digital screens."
            )
        },
        {
            "category": "Physical Recovery & Hydration",
            "detail": (
                "Maternal recuperation requires steady caloric nourishment and hydration. Keep water and nourishing snacks "
                "within arm's reach at nursing or feeding stations."
            )
        },
        {
            "category": "Emotional Support & Connection",
            "detail": (
                "Openly share emotional feelings with your partner, family, or trusted community. Speaking your needs "
                "relieves emotional pressure and strengthens support networks."
            )
        },
        {
            "category": "Mindful Pacing",
            "detail": (
                "Set gentle, realistic expectations for daily activities. Postpartum recovery is a gradual journey, "
                "and prioritizing bonding and personal health is paramount."
            )
        }
    ]

    if avg_sleep is not None and avg_sleep < 5.0:
        suggestions[0]["detail"] = (
            "Recorded sleep has averaged below 5 hours per night. Chronic sleep deprivation heavily influences mood. "
            "Consider arranging a supportive night shift with your partner or support network to allow a 4-hour consolidated rest stretch."
        )

    return suggestions


def generate_weekly_chart(report_data: Dict[str, Any]) -> Optional[bytes]:
    """
    Generates a high-resolution Matplotlib chart matching the HopeMind palette:
    Indigo (#4f46e5) and Coral (#e85d55).
    """
    daily_records = report_data.get("daily_records", [])
    if not daily_records:
        return None

    # Parse dates and values
    dates = []
    moods = []
    sleeps = []
    energies = []
    labels = []

    for r in daily_records:
        try:
            d = datetime.strptime(r["date"], "%Y-%m-%d").date()
        except ValueError:
            d = date.today()
        dates.append(d)
        labels.append(r["day_name"] + "\n" + d.strftime("%m/%d"))
        moods.append(r["mood_score"])
        sleeps.append(r["sleep_hours"] if r["sleep_hours"] is not None else 0.0)
        # Energy mapping: low=1, moderate=2, high=3
        lvl = (r["energy_level"] or "moderate").lower()
        energies.append(1 if lvl == "low" else (3 if lvl == "high" else 2))

    fig, (ax_mood, ax_sleep) = plt.subplots(1, 2, figsize=(8.5, 2.8), dpi=220)
    fig.patch.set_facecolor("#ffffff")

    # 1. Left Plot: Daily Mood & Energy Trend
    ax_mood.set_facecolor("#fafafa")
    x_indices = list(range(len(dates)))

    ax_mood.plot(
        x_indices, moods,
        color="#e85d55", linewidth=2.5, marker="o", markersize=6,
        label="Mood Score (1-5)"
    )
    ax_mood.fill_between(x_indices, moods, 1, color="#e85d55", alpha=0.12)

    ax_mood.set_ylim(0.5, 5.5)
    ax_mood.set_yticks([1, 2, 3, 4, 5])
    ax_mood.set_yticklabels(["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"], fontsize=7.5, color="#475569")
    ax_mood.set_xticks(x_indices)
    ax_mood.set_xticklabels(labels, fontsize=7.5, color="#475569")
    ax_mood.grid(True, linestyle="--", alpha=0.4, color="#cbd5e1")
    ax_mood.set_title("Daily Mood Variations", fontsize=9.5, fontweight="bold", color="#1e293b", pad=8)
    ax_mood.spines["top"].set_visible(False)
    ax_mood.spines["right"].set_visible(False)
    ax_mood.spines["left"].set_color("#cbd5e1")
    ax_mood.spines["bottom"].set_color("#cbd5e1")

    # 2. Right Plot: Daily Sleep Duration (Hours)
    ax_sleep.set_facecolor("#fafafa")
    bar_colors = ["#4f46e5" if s >= 6.0 else "#f43f5e" for s in sleeps]
    bars = ax_sleep.bar(x_indices, sleeps, color=bar_colors, width=0.55, label="Sleep (Hours)", alpha=0.9)

    # Reference benchmark line at 7 hours
    ax_sleep.axhline(7.0, color="#059669", linestyle=":", linewidth=1.2, label="Target Rest (7h)")

    # Bar labels
    for bar in bars:
        h = bar.get_height()
        if h > 0:
            ax_sleep.text(
                bar.get_x() + bar.get_width() / 2.0, h + 0.2,
                f"{h:.1f}h", ha="center", va="bottom", fontsize=7, color="#334155"
            )

    max_s = max(sleeps) if sleeps else 8
    ax_sleep.set_ylim(0, max(10, max_s + 2))
    ax_sleep.set_xticks(x_indices)
    ax_sleep.set_xticklabels(labels, fontsize=7.5, color="#475569")
    ax_sleep.grid(True, linestyle="--", alpha=0.4, color="#cbd5e1", axis="y")
    ax_sleep.set_title("Sleep Duration (Hours/Night)", fontsize=9.5, fontweight="bold", color="#1e293b", pad=8)
    ax_sleep.legend(loc="upper right", fontsize=7, frameon=False)
    ax_sleep.spines["top"].set_visible(False)
    ax_sleep.spines["right"].set_visible(False)
    ax_sleep.spines["left"].set_color("#cbd5e1")
    ax_sleep.spines["bottom"].set_color("#cbd5e1")

    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=220, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def build_pdf_report(report_data: Dict[str, Any]) -> io.BytesIO:
    """
    Constructs a professional, comprehensive healthcare-style PDF report using ReportLab.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # Custom styles
    brand_title_style = ParagraphStyle(
        "BrandTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#312e81")
    )

    tagline_style = ParagraphStyle(
        "BrandTagline",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#e85d55")
    )

    doc_heading_style = ParagraphStyle(
        "DocHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#312e81"),
        spaceAfter=4
    )

    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#312e81"),
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )

    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748b")
    )

    meta_val_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )

    callout_style = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#1e293b")
    )

    disclaimer_style = ParagraphStyle(
        "DisclaimerText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#64748b")
    )

    story = []
    meta = report_data["metadata"]

    # --- 1. HEADER SECTION ---
    header_table_data = [
        [
            Paragraph("HopeMind", brand_title_style),
            Paragraph("WEEKLY WELLNESS REPORT", ParagraphStyle(
                "DocTitleRight",
                parent=styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=14,
                leading=18,
                alignment=2,
                textColor=colors.HexColor("#312e81")
            ))
        ],
        [
            Paragraph("Maternal Mental Health & Postpartum Wellbeing Companion", tagline_style),
            Paragraph(f"Reporting Period: {meta['period_display']}", ParagraphStyle(
                "PeriodRight",
                parent=styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=8.5,
                leading=11,
                alignment=2,
                textColor=colors.HexColor("#64748b")
            ))
        ]
    ]

    header_table = Table(header_table_data, colWidths=[320, 220])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    # --- 2. MOTHER & REPORT METADATA CARD ---
    meta_box_data = [
        [
            Paragraph("Mother's Name", meta_label_style),
            Paragraph("Infant / Postpartum Stage", meta_label_style),
            Paragraph("Report Date", meta_label_style),
            Paragraph("Records Tracked", meta_label_style)
        ],
        [
            Paragraph(meta["mother_name"], meta_val_style),
            Paragraph(f"{meta['infant_name']} ({meta['weeks_postpartum']} weeks postpartum)", meta_val_style),
            Paragraph(meta["generation_date"], meta_val_style),
            Paragraph(f"{meta['entries_count']} of {meta['total_days']} days recorded", meta_val_style)
        ]
    ]
    meta_table = Table(meta_box_data, colWidths=[140, 160, 120, 120])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # --- 3. WEEKLY WELLNESS SUMMARY ---
    story.append(Paragraph("Weekly Wellness Summary", section_heading_style))
    summary_box = Table(
        [[Paragraph(report_data["wellness_summary"], callout_style)]],
        colWidths=[540]
    )
    summary_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eef2ff")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#c7d2fe")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_box)
    story.append(Spacer(1, 8))

    # --- 4. KPI STAT CARDS TABLE ---
    mood_data = report_data["mood"]
    sleep_data = report_data["sleep"]
    energy_data = report_data["energy"]

    avg_mood_display = f"{mood_data['average_score']:.1f} / 5.0" if mood_data["average_score"] is not None else "—"
    avg_sleep_display = f"{sleep_data['average_hours']:.1f} hrs/night" if sleep_data["average_hours"] is not None else "—"
    pred_energy_display = energy_data["predominant_level"]

    kpi_table_data = [
        [
            Paragraph("Average Mood", meta_label_style),
            Paragraph("Average Sleep", meta_label_style),
            Paragraph("Energy Pattern", meta_label_style),
            Paragraph("Active Journal Days", meta_label_style)
        ],
        [
            Paragraph(f"<b>{avg_mood_display}</b>", ParagraphStyle("KPI1", parent=body_style, fontSize=11, leading=13, textColor=colors.HexColor("#e85d55"))),
            Paragraph(f"<b>{avg_sleep_display}</b>", ParagraphStyle("KPI2", parent=body_style, fontSize=11, leading=13, textColor=colors.HexColor("#4f46e5"))),
            Paragraph(f"<b>{pred_energy_display}</b>", ParagraphStyle("KPI3", parent=body_style, fontSize=11, leading=13, textColor=colors.HexColor("#0d9488"))),
            Paragraph(f"<b>{report_data['journal']['entries_with_journal']} days</b>", ParagraphStyle("KPI4", parent=body_style, fontSize=11, leading=13, textColor=colors.HexColor("#4338ca")))
        ],
        [
            Paragraph(mood_data["state_label"], disclaimer_style),
            Paragraph("Consolidated rest indicator", disclaimer_style),
            Paragraph(f"Low: {energy_data['distribution']['low']} | Mod: {energy_data['distribution']['moderate']} | High: {energy_data['distribution']['high']}", disclaimer_style),
            Paragraph("Reflections logged", disclaimer_style)
        ]
    ]
    kpi_table = Table(kpi_table_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # --- 5. VISUAL TREND CHARTS (Matplotlib) ---
    if meta["has_data"]:
        chart_png_bytes = generate_weekly_chart(report_data)
        if chart_png_bytes:
            chart_stream = io.BytesIO(chart_png_bytes)
            chart_img = Image(chart_stream, width=540, height=178)
            story.append(chart_img)
            story.append(Spacer(1, 8))
    else:
        no_data_box = Table(
            [[Paragraph("<b>Notice:</b> Insufficient records available in this date range. No visual charts can be rendered. Please select an active logging period.", callout_style)]],
            colWidths=[540]
        )
        no_data_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff1f2")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#fecdd3")),
            ("PADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(no_data_box)
        story.append(Spacer(1, 8))

    # --- 6. DAILY ACTIVITY & WELLNESS LOG TABLE ---
    story.append(Paragraph("Daily Activity & Wellness Log", section_heading_style))
    daily_records = report_data.get("daily_records", [])

    if daily_records:
        table_rows = [
            [
                Paragraph("<b>Date</b>", meta_label_style),
                Paragraph("<b>Mood State</b>", meta_label_style),
                Paragraph("<b>Score</b>", meta_label_style),
                Paragraph("<b>Sleep</b>", meta_label_style),
                Paragraph("<b>Energy</b>", meta_label_style),
                Paragraph("<b>Identified Emotion / Themes</b>", meta_label_style)
            ]
        ]

        for r in daily_records:
            sleep_str = f"{r['sleep_hours']:.1f} hrs" if r['sleep_hours'] is not None else "—"
            table_rows.append([
                Paragraph(f"{r['day_name']}, {r['date_display']}", body_style),
                Paragraph(r["mood_display"], body_style),
                Paragraph(f"{r['mood_score']} / 5", body_style),
                Paragraph(sleep_str, body_style),
                Paragraph(r["energy_level"], body_style),
                Paragraph(r["dominant_emotion"].capitalize(), body_style)
            ])

        records_table = Table(table_rows, colWidths=[110, 80, 50, 65, 65, 170])
        records_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(records_table)
    else:
        story.append(Paragraph("<i>No daily check-ins recorded for this week.</i>", body_style))

    story.append(Spacer(1, 10))

    # --- 7. EPDS SCREENING ASSESSMENT HISTORY ---
    story.append(Paragraph("Edinburgh Postnatal Depression Scale (EPDS) Screening", section_heading_style))
    epds = report_data["epds"]

    epds_rows = [
        [
            Paragraph("<b>Assessment Type</b>", meta_label_style),
            Paragraph("<b>Screening Date</b>", meta_label_style),
            Paragraph("<b>Total Score</b>", meta_label_style),
            Paragraph("<b>Severity Category</b>", meta_label_style),
            Paragraph("<b>Clinical Guidance / Action</b>", meta_label_style)
        ]
    ]

    if epds["latest"]:
        lat = epds["latest"]
        flag_str = " (Critical Safety Flag: Yes)" if lat.get("question_10_flag") else ""
        epds_rows.append([
            Paragraph("Latest Screening", body_style),
            Paragraph(lat["created_at"], body_style),
            Paragraph(f"<b>{lat['total_score']} / 30</b>", body_style),
            Paragraph(f"{lat['screening_category']}{flag_str}", body_style),
            Paragraph(lat["clinical_action_recommended"] or "Standard supportive monitoring.", body_style)
        ])
    if epds["previous"]:
        prev = epds["previous"]
        epds_rows.append([
            Paragraph("Previous Screening", body_style),
            Paragraph(prev["created_at"], body_style),
            Paragraph(f"{prev['total_score']} / 30", body_style),
            Paragraph(prev["screening_category"], body_style),
            Paragraph(prev["clinical_action_recommended"] or "Standard supportive monitoring.", body_style)
        ])

    if len(epds_rows) > 1:
        epds_table = Table(epds_rows, colWidths=[110, 85, 75, 110, 160])
        epds_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2ff")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(epds_table)
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>Assessment Trend Comparison:</b> {epds['comparison']}", body_style))
    else:
        story.append(Paragraph("<i>No standardized EPDS screenings recorded on file yet.</i>", body_style))

    story.append(Spacer(1, 10))

    # --- 8. EMOTIONAL THEMES & JOURNAL SUMMARY (Safe, Privacy-Preserving) ---
    story.append(Paragraph("Journal Summary & Self-Reported Emotional Themes", section_heading_style))
    journal_info = report_data["journal"]
    theme_items = journal_info.get("recurring_themes", {})

    theme_chips_str = "No specific themes recorded."
    if theme_items:
        chips = [f"<b>{theme}</b> ({count})" for theme, count in theme_items.items()]
        theme_chips_str = " &nbsp;|&nbsp; ".join(chips)

    journal_table_data = [
        [
            Paragraph("<b>Private Reflections Logged:</b>", meta_label_style),
            Paragraph(f"{journal_info['entries_with_journal']} entries during this reporting week", body_style)
        ],
        [
            Paragraph("<b>Detected Themes:</b>", meta_label_style),
            Paragraph(theme_chips_str, body_style)
        ],
        [
            Paragraph("<b>Privacy Protection:</b>", meta_label_style),
            Paragraph("Raw personal journal entries are kept strictly private and confidential. Only self-reported emotional keywords are summarized.", disclaimer_style)
        ]
    ]
    journal_table = Table(journal_table_data, colWidths=[150, 390])
    journal_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fdf4ff")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#f0abfc")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fae8ff")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(journal_table)
    story.append(Spacer(1, 10))

    # --- 9. SUPPORT AND RECOMMENDATIONS ---
    story.append(Paragraph("Wellness Support & Recommendations", section_heading_style))
    recs = report_data.get("recommendations", [])
    if recs:
        rec_rows = []
        for r in recs:
            rec_rows.append([
                Paragraph(f"• <b>{r['category']}</b>", body_style),
                Paragraph(r["detail"], body_style)
            ])
        rec_table = Table(rec_rows, colWidths=[150, 390])
        rec_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(rec_table)
    else:
        story.append(Paragraph("General postpartum self-care suggestions include prioritizing rest windows, maintaining hydration, and reaching out for social support.", body_style))
    story.append(Spacer(1, 6))

    # Crisis helplines box
    helpline_box = Table([
        [
            Paragraph("<b>Immediate Helpline Support Resources:</b>", ParagraphStyle("Hdr", parent=body_style, fontName="Helvetica-Bold", textColor=colors.HexColor("#065f46"))),
        ],
        [
            Paragraph(
                "• <b>Tele-MANAS (Govt of India):</b> 14416 / 1800-891-4416 (Toll-Free, 24/7 Multilingual)<br/>"
                "• <b>KIRAN Mental Health Helpline:</b> 1800-599-0019 (24/7 Dedicated Support)<br/>"
                "• <b>Emergency Clinical Care:</b> If you feel unsafe or have urgent distress, contact local emergency services immediately.",
                ParagraphStyle("HelpLines", parent=body_style, fontSize=8, leading=11, textColor=colors.HexColor("#065f46"))
            )
        ]
    ], colWidths=[540])
    helpline_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ecfdf5")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#a7f3d0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(helpline_box)
    story.append(Spacer(1, 8))

    # --- 10. PRIVACY, SAFETY & EDUCATIONAL DISCLAIMER (MANDATORY SAFEGUARD) ---
    disclaimer_text = (
        "<b>Educational & Research Notice:</b> This report is generated solely for personal wellness self-monitoring "
        "and supportive reflection. HopeMind is an educational and research-oriented tool and is NOT a medical device. "
        "This document does not constitute a clinical medical diagnosis, psychiatric evaluation, or automated determination "
        "of postpartum depression. Standardized screening scores (such as the EPDS) and self-reported check-ins provide general symptom "
        "trends designed to facilitate shared decision-making with your licensed healthcare provider. "
        "Never ignore professional clinical advice or delay seeking care based on this wellness summary."
    )
    disclaimer_box = Table(
        [[Paragraph(disclaimer_text, disclaimer_style)]],
        colWidths=[540]
    )
    disclaimer_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(disclaimer_box)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0)
    return buf
