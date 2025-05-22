from bson import ObjectId
from datetime import datetime, timedelta
import uuid
import config

class ChatMessage:
    def __init__(self, role, content, timestamp=None):
        self.role = role
        self.content = content
        self.timestamp = timestamp or datetime.utcnow()
    
    @classmethod
    def from_dict(cls, data):
        return cls(**data)
    
    def to_dict(self):
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp
        }
    
    def to_json(self):
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat()
        }

class ChatSession:
    def __init__(self, id=None, user_id=None, session_id=None, messages=None, 
                    created_at=None, updated_at=None, is_anonymous=False, 
                    expiry_date=None, cart_id=None):
        self.id = str(id) if id else None
        self.user_id = str(user_id) if user_id else None
        self.session_id = session_id or str(uuid.uuid4())
        self.messages = [ChatMessage.from_dict(msg) if isinstance(msg, dict) else msg 
                        for msg in (messages or [])]
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.is_anonymous = is_anonymous

        if is_anonymous and not expiry_date:
            self.expiry_date = datetime.utcnow() + timedelta(days=config.ANONYMOUS_SESSION_EXPIRY)
        else:
            self.expiry_date = expiry_date
        self.cart_id = str(cart_id) if cart_id else None
    
    @classmethod
    def from_dict(cls, data):
        if "_id" in data:
            data["id"] = data.pop("_id")
        if "messages" in data:
            data["messages"] = [ChatMessage.from_dict(msg) for msg in data["messages"]]
        return cls(**data)
    
    def to_dict(self):
        result = {
            "user_id": self.user_id,
            "session_id": self.session_id,
            "messages": [msg.to_dict() for msg in self.messages],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_anonymous": self.is_anonymous,
            "cart_id": self.cart_id
        }
        if self.expiry_date:
            result["expiry_date"] = self.expiry_date
        if self.id:
            result["_id"] = ObjectId(self.id)
        return result
    
    def to_json(self):
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "messages": [msg.to_json() for msg in self.messages],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_anonymous": self.is_anonymous,
            "cart_id": self.cart_id
        }
        if self.expiry_date:
            result["expiry_date"] = self.expiry_date.isoformat()
        return result
    
    def add_message(self, role, content):
        message = ChatMessage(role, content)
        self.messages.append(message)
        self.updated_at = datetime.utcnow()
        return message
    
    def get_messages_for_llm(self):
        return [{"role": msg.role, "content": msg.content} for msg in self.messages]
