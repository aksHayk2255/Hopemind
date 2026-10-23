import os
import requests
from flask import current_app
from app import db
from app.models.chat import ChatConversation, ChatMessage
from app.security.safety_filter import analyze_safety, get_crisis_response

SYSTEM_PROMPT = (
    "You are HopeMind AI, an empathetic, compassionate postpartum wellness assistant designed to support new mothers. "
    "Your tone is gentle, validating, and supportive. "
    "Guidelines: "
    "1. Listen attentively and validate feelings of stress, sleep deprivation, hormonal changes, and maternal guilt. "
    "2. Suggest practical, gentle self-care strategies (hydration, small resting intervals, box breathing, accepting partner/family help). "
    "3. NEVER diagnose postpartum depression, anxiety, or any medical condition. "
    "4. NEVER prescribe medications or medical treatments. "
    "5. NEVER claim to be a licensed therapist, psychiatrist, or medical doctor. "
    "6. Emphasize that seeking help from a healthcare provider or postpartum specialist is a sign of strength. "
    "7. Keep responses concise, warm, and easily readable for a fatigued parent."
)

MOCK_TOPIC_RESPONSES = {
    "sleep": (
        "It is completely understandable to feel utterly exhausted. Newborn sleep cycles are irregular, "
        "and prolonged sleep deprivation heavily impacts emotional resilience. When possible, try resting even for 20 minutes "
        "when someone else can watch the baby. Would you be able to designate one feeding window to a partner or family member so you can get an unbroken stretch of rest?"
    ),
    "anxiety": (
        "Feeling hyper-alert or worried is very common in the fourth trimester as hormones recalibrate and new responsibilities settle in. "
        "Let's take a slow, gentle breath together: inhale for 4 counts, hold for 4, and release for 4. "
        "Remember that you don't have to be a perfect parent; taking things one hour at a time is more than enough."
    ),
    "guilt": (
        "Maternal guilt is one of the heaviest burdens mothers carry, but please hear this: having difficult feelings or needing space does NOT make you a bad mother. "
        "It means you are human and undergoing one of the most intense physical and emotional transitions of your life. "
        "Be as kind to yourself today as you would be to a dear friend."
    ),
    "bonding": (
        "Bonding with a new baby isn't always an immediate, cinematic spark—for many loving mothers, it is a gradual journey that grows day by day. "
        "Skin-to-skin contact, gentle humming, or just resting beside your baby helps establish connection without pressure. "
        "Give yourself grace; connection develops with time."
    ),
    "general": (
        "Thank you for sharing how you are feeling with me. Welcoming a child is a monumental life change that brings a wide spectrum of emotions—joy, fatigue, worry, and wonder all at once. "
        "I'm here to listen and support you. How has your day been feeling overall, and have you been able to take even a five-minute pause for yourself today?"
    )
}

def generate_mock_response(user_text: str) -> str:
    """Provides a realistic, supportive response when no OpenAI API key is configured."""
    lower = user_text.lower()
    prefix = "[HopeMind Supportive AI — Dev Mode]\n\n"
    
    if any(k in lower for k in ["sleep", "tired", "exhausted", "fatigue", "awake"]):
        return prefix + MOCK_TOPIC_RESPONSES["sleep"]
    elif any(k in lower for k in ["anxious", "worry", "panic", "scared", "nervous"]):
        return prefix + MOCK_TOPIC_RESPONSES["anxiety"]
    elif any(k in lower for k in ["guilt", "bad mother", "failing", "not enough", "doing wrong"]):
        return prefix + MOCK_TOPIC_RESPONSES["guilt"]
    elif any(k in lower for k in ["bond", "feel love", "connect", "attachment"]):
        return prefix + MOCK_TOPIC_RESPONSES["bonding"]
    else:
        return prefix + MOCK_TOPIC_RESPONSES["general"]

def process_chat_message(conversation_id: int, user_message: str):
    """
    Processes an incoming user message through:
    1. Safety check filter
    2. LLM or Dev Mode fallback
    3. Database persistence
    """
    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        raise ValueError("Conversation not found")

    # Step 1: Safety analysis
    is_crisis, category, matches = analyze_safety(user_message)
    
    # Persist user message
    user_msg_record = ChatMessage(
        conversation_id=conversation.id,
        sender="user",
        message_text=user_message,
        safety_flag=is_crisis,
        safety_category=category if is_crisis else "safe"
    )
    db.session.add(user_msg_record)

    # Step 2: Handle crisis interception
    if is_crisis:
        emergency_contacts = current_app.config.get("EMERGENCY_CONTACTS", [])
        crisis_data = get_crisis_response(category, emergency_contacts)
        
        # Save assistant crisis response
        bot_msg_record = ChatMessage(
            conversation_id=conversation.id,
            sender="assistant",
            message_text=crisis_data["message"] + "\n\n" + crisis_data["action_required"],
            safety_flag=True,
            safety_category=category
        )
        db.session.add(bot_msg_record)
        db.session.commit()

        return {
            "conversation_id": conversation.id,
            "user_message": user_msg_record.to_dict(),
            "assistant_message": bot_msg_record.to_dict(),
            "safety_intercepted": True,
            "crisis_info": crisis_data
        }

    # Step 3: Normal generation via OpenAI or Mock
    api_key = current_app.config.get("OPENAI_API_KEY")
    ai_response_text = ""
    is_mock = False

    if api_key and not api_key.startswith("mock") and len(api_key) > 20:
        try:
            # Build conversation history for context
            history = ChatMessage.query.filter_by(conversation_id=conversation.id).order_by(ChatMessage.created_at.desc()).limit(6).all()
            history.reverse()
            
            messages_payload = [{"role": "system", "content": SYSTEM_PROMPT}]
            for msg in history:
                messages_payload.append({
                    "role": "user" if msg.sender == "user" else "assistant",
                    "content": msg.message_text
                })
            # Add current message
            messages_payload.append({"role": "user", "content": user_message})

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": current_app.config.get("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": messages_payload,
                "temperature": 0.7,
                "max_tokens": 350
            }
            response = requests.post("https://api.openai.com/v1/chat/completions", json=body, headers=headers, timeout=15)
            if response.status_code == 200:
                data = response.json()
                ai_response_text = data["choices"][0]["message"]["content"]
            else:
                is_mock = True
                ai_response_text = generate_mock_response(user_message)
        except Exception:
            is_mock = True
            ai_response_text = generate_mock_response(user_message)
    else:
        is_mock = True
        ai_response_text = generate_mock_response(user_message)

    bot_msg_record = ChatMessage(
        conversation_id=conversation.id,
        sender="assistant",
        message_text=ai_response_text,
        safety_flag=False,
        safety_category="safe"
    )
    db.session.add(bot_msg_record)
    db.session.commit()

    return {
        "conversation_id": conversation.id,
        "user_message": user_msg_record.to_dict(),
        "assistant_message": bot_msg_record.to_dict(),
        "safety_intercepted": False,
        "is_mock_mode": is_mock
    }
