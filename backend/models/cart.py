from bson import ObjectId
from datetime import datetime

class CartItem:
    def __init__(self, product_id, quantity=1, price=None, title=None, image_path=None):
        self.product_id = str(product_id)
        self.quantity = quantity
        self.price = price
        self.title = title
        self.image_path = image_path
    
    @classmethod
    def from_dict(cls, data):
        return cls(**data)
    
    def to_dict(self):
        return {
            "product_id": self.product_id,
            "quantity": self.quantity,
            "price": self.price,
            "title": self.title,
            "image_path": self.image_path
        }

class Cart:
    def __init__(self, id=None, user_id=None, session_id=None, items=None, 
                created_at=None, updated_at=None, is_anonymous=False):
        self.id = str(id) if id else None
        self.user_id = str(user_id) if user_id else None
        self.session_id = session_id
        self.items = [CartItem.from_dict(item) if isinstance(item, dict) else item for item in (items or [])]
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.is_anonymous = is_anonymous
    
    @classmethod
    def from_dict(cls, data):
        if "_id" in data:
            data["id"] = data.pop("_id")
        if "items" in data:
            data["items"] = [CartItem.from_dict(item) for item in data["items"]]
        return cls(**data)
    
    def to_dict(self):
        result = {
            "user_id": self.user_id,
            "session_id": self.session_id,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_anonymous": self.is_anonymous
        }
        if self.id:
            result["_id"] = ObjectId(self.id)
        return result
    
    def to_json(self):
        total_amount = 0
        for item in self.items:
            try:
                price_str = str(item.price).replace('.', '')
                price_val = float(price_str)
                total_amount += price_val * item.quantity
            except (ValueError, TypeError) as e:
                print(f"Warning: Could not parse price for item {item.product_id}: '{item.price}'. Error: {e}")
                pass

        result = {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_anonymous": self.is_anonymous,
            "total_items": sum(item.quantity for item in self.items),
            "total": str(total_amount)
        }
        return result
    
    def add_item(self, product_id, quantity=1, price=None, title=None, image_path=None):
        for item in self.items:
            if item.product_id == str(product_id):
                item.quantity += quantity
                self.updated_at = datetime.utcnow()
                return
        
        self.items.append(CartItem(product_id, quantity, price, title, image_path))
        self.updated_at = datetime.utcnow()
    
    def update_item(self, product_id, quantity):
        for item in self.items:
            if item.product_id == str(product_id):
                item.quantity = quantity
                self.updated_at = datetime.utcnow()
                return True
        return False
    
    def remove_item(self, product_id):
        for i, item in enumerate(self.items):
            if item.product_id == str(product_id):
                self.items.pop(i)
                self.updated_at = datetime.utcnow()
                return True
        return False

    def clear_items(self):
        self.items = []
        self.updated_at = datetime.utcnow()
