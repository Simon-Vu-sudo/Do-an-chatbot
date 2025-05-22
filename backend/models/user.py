from bson import ObjectId
from datetime import datetime
import bcrypt

class User:
    def __init__(self, id=None, email="", password="", username="", role="user", 
                created_at=None, updated_at=None):
        self.id = str(id) if id else None
        self.email = email
        self.password = password
        self.username = username
        self.role = role
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
    
    @classmethod
    def from_dict(cls, data):
        if "_id" in data:
            data["id"] = data.pop("_id")
        return cls(**data)
    
    def to_dict(self):
        result = {
            "email": self.email,
            "password": self.password,
            "username": self.username,
            "role": self.role,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
        if self.id:
            result["_id"] = ObjectId(self.id)
        return result
    
    def to_json(self):
        result = {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
        return result
    
    @staticmethod
    def hash_password(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
