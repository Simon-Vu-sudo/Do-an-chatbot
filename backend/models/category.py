from bson import ObjectId
from datetime import datetime

class Category:
    def __init__(self, id=None, name="", description="", image_path="", original_id=None, created_at=None, updated_at=None):
        self.id = str(id) if id else None
        self.name = name
        self.description = description
        self.image_path = image_path
        self.original_id = original_id
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
    
    @classmethod
    def from_dict(cls, data):
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)
    
    def to_dict(self):
        result = {
            "name": self.name,
            "description": self.description,
            "image_path": self.image_path,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
        if self.id:
            result["_id"] = ObjectId(self.id)
        if self.original_id:
            result["original_id"] = self.original_id
        return result
    
    def to_json(self):
        result = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "image_path": self.image_path,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
        if self.original_id:
            result["original_id"] = self.original_id
        return result
