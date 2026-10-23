from typing import List, Dict, Any, Tuple

# Official Edinburgh Postnatal Depression Scale (EPDS)
# Source: Cox, J.L., Holden, J.M., and Sagovsky, R. 1987. Detection of postnatal depression: Development of the 10-item Edinburgh Postnatal Depression Scale. British Journal of Psychiatry 150:782-786.

EPDS_QUESTIONS = [
    {
        "id": 1,
        "question": "I have been able to laugh and see the funny side of things:",
        "is_reverse": False,
        "options": [
            {"text": "As much as I always could", "score": 0},
            {"text": "Not quite so much now", "score": 1},
            {"text": "Definitely not so much now", "score": 2},
            {"text": "Not at all", "score": 3}
        ]
    },
    {
        "id": 2,
        "question": "I have looked forward with enjoyment to things:",
        "is_reverse": False,
        "options": [
            {"text": "As much as I ever did", "score": 0},
            {"text": "Rather less than I used to", "score": 1},
            {"text": "Definitely less than I used to", "score": 2},
            {"text": "Hardly at all", "score": 3}
        ]
    },
    {
        "id": 3,
        "question": "I have blamed myself unnecessarily when things went wrong:",
        "is_reverse": True,
        "options": [
            {"text": "Yes, most of the time", "score": 3},
            {"text": "Yes, some of the time", "score": 2},
            {"text": "Not very often", "score": 1},
            {"text": "No, never", "score": 0}
        ]
    },
    {
        "id": 4,
        "question": "I have been anxious or worried for no good reason:",
        "is_reverse": False,
        "options": [
            {"text": "No, not at all", "score": 0},
            {"text": "Hardly ever", "score": 1},
            {"text": "Yes, sometimes", "score": 2},
            {"text": "Yes, very often", "score": 3}
        ]
    },
    {
        "id": 5,
        "question": "I have felt scared or panicky for no very good reason:",
        "is_reverse": True,
        "options": [
            {"text": "Yes, quite a lot", "score": 3},
            {"text": "Yes, sometimes", "score": 2},
            {"text": "No, not much", "score": 1},
            {"text": "No, not at all", "score": 0}
        ]
    },
    {
        "id": 6,
        "question": "Things have been getting on top of me:",
        "is_reverse": True,
        "options": [
            {"text": "Yes, most of the time I haven't been able to cope at all", "score": 3},
            {"text": "Yes, sometimes I haven't been coping as well as usual", "score": 2},
            {"text": "No, most of the time I have coped quite well", "score": 1},
            {"text": "No, have been coping as well as ever", "score": 0}
        ]
    },
    {
        "id": 7,
        "question": "I have been so unhappy that I have had difficulty sleeping:",
        "is_reverse": True,
        "options": [
            {"text": "Yes, most of the time", "score": 3},
            {"text": "Yes, sometimes", "score": 2},
            {"text": "Not very often", "score": 1},
            {"text": "No, not at all", "score": 0}
        ]
    },
    {
        "id": 8,
        "question": "I have felt sad or miserable:",
        "is_reverse": True,
        "options": [
            {"text": "Yes, most of the time", "score": 3},
            {"text": "Yes, quite often", "score": 2},
            {"text": "Not very often", "score": 1},
            {"text": "No, not at all", "score": 0}
        ]
    },
    {
        "id": 9,
        "question": "I have been so unhappy that I have been crying:",
        "is_reverse": True,
        "options": [
            {"text": "Yes, most of the time", "score": 3},
            {"text": "Yes, quite often", "score": 2},
            {"text": "Only occasionally", "score": 1},
            {"text": "No, never", "score": 0}
        ]
    },
    {
        "id": 10,
        "question": "The thought of harming myself has occurred to me:",
        "is_reverse": True,
        "options": [
            {"text": "Yes, quite often", "score": 3},
            {"text": "Sometimes", "score": 2},
            {"text": "Hardly ever", "score": 1},
            {"text": "Never", "score": 0}
        ]
    }
]

def calculate_epds_score(selected_indices: List[int]) -> Tuple[int, str, bool, str, List[Dict[str, Any]]]:
    """
    Computes EPDS total score, screening category, critical self-harm flag,
    and detailed breakdown.
    
    selected_indices: List of 10 integers (0-3) representing the index chosen for each question.
    """
    if len(selected_indices) != 10:
        raise ValueError("Assessment must contain exactly 10 responses.")

    total_score = 0
    question_10_flag = False
    breakdown = []

    for idx, option_idx in enumerate(selected_indices):
        if option_idx < 0 or option_idx > 3:
            raise ValueError(f"Invalid option index {option_idx} for question {idx + 1}")
            
        q_def = EPDS_QUESTIONS[idx]
        chosen_option = q_def["options"][option_idx]
        item_score = chosen_option["score"]
        total_score += item_score
        
        # Check Question 10 (index 9) for critical self-harm thought
        if idx == 9 and item_score > 0:
            question_10_flag = True

        breakdown.append({
            "question_index": idx,
            "question_text": q_def["question"],
            "selected_option_index": option_idx,
            "selected_option_text": chosen_option["text"],
            "score": item_score
        })

    # Determine clinical screening category
    if total_score >= 13:
        category = "high"
        recommendation = "Score indicates significant depressive symptoms. Clinical evaluation by an obstetrician, psychiatrist, or licensed perinatal mental health professional is strongly recommended."
    elif total_score >= 10:
        category = "moderate"
        recommendation = "Score indicates mild to moderate distress. Support strategies, mood tracking, and follow-up screening within 1–2 weeks are recommended."
    else:
        category = "low"
        recommendation = "Score suggests normal emotional adjustment and low probability of postpartum depression. Continue healthy self-care and routine monitoring."

    if question_10_flag:
        recommendation = "URGENT CLINICAL ATTENTION: Endorsement of self-harm ideation on Item 10 requires immediate supportive consultation with a healthcare provider or crisis helpline."

    return total_score, category, question_10_flag, recommendation, breakdown
