from bson import ObjectId
from datetime import datetime

class Product:
    def __init__(self, id=None, title="", description="", price="", features=None, 
                 image_path="", category_id=None, stock_count=0, original_product_id=None, 
                 created_at=None, updated_at=None):
        self.id = str(id) if id else None
        self.title = title
        self.description = description
        self.price = price
        self.features = features or []
        self.image_path = image_path
        self.category_id = str(category_id) if category_id else None
        self.stock_count = stock_count
        self.original_product_id = original_product_id
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
    
    @classmethod
    def from_dict(cls, data):
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)
    
    def to_dict(self):
        result = {
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "features": self.features,
            "image_path": self.image_path,
            "category_id": self.category_id,
            "stock_count": self.stock_count,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
        if self.id:
            result["_id"] = ObjectId(self.id)
        if self.original_product_id:
            result["original_product_id"] = self.original_product_id
        return result
    
    def to_json(self):
        result = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "features": self.features,
            "image_path": self.image_path,
            "category_id": self.category_id,
            "stock_count": self.stock_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_in_stock": self.stock_count > 0
        }
        if self.original_product_id:
            result["original_product_id"] = self.original_product_id
        return result

    def get_price_float(self):
        try:
            return float(str(self.price).replace('.', '').replace(',', '.'))
        except ValueError:
            print(f"Warning: Could not parse price string '{self.price}' to float.")
            return 0.0
