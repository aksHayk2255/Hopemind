from datetime import datetime
from app import db

class ChatConversation(db.Model):
    __tablename__ = "chat_conversations"

    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey("mother_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(150), default="Supportive Conversation", nullable=False)
    is_archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    messages = db.relationship("ChatMessage", backref="conversation", lazy="joined", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

    def to_dict(self, include_messages=False):
        data = {
            "id": self.id,
            "mother_id": self.mother_id,
            "title": self.title,
            "is_archived": self.is_archived,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "message_count": len(self.messages) if self.messages else 0
        }
        if include_messages:
            data["messages"] = [m.to_dict() for m in self.messages]
        return data


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = db.Column(db.String(20), nullable=False) # user, assistant, system
    message_text = db.Column(db.Text, nullable=False)
    safety_flag = db.Column(db.Boolean, default=False, nullable=False) # flagged for crisis/self-harm
    safety_category = db.Column(db.String(50), nullable=True) # crisis_self_harm, infant_harm, despair, safe
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender": self.sender,
            "message_text": self.message_text,
            "safety_flag": self.safety_flag,
            "safety_category": self.safety_category,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
