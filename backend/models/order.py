from bson import ObjectId
from datetime import datetime

class OrderItem:
    def __init__(self, product_id, quantity, price, title=None, image_path=None):
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

class Order:
    STATUS_PENDING_PAYMENT = "Chờ thanh toán"
    STATUS_PROCESSING = "Đang xử lý"
    STATUS_SHIPPING = "Đang vận chuyển"
    STATUS_DELIVERED = "Đã giao"
    STATUS_CANCELLED = "Đã hủy"
    STATUS_REFUNDED = "Đã hoàn tiền"

    def __init__(self, id=None, user_id=None, items=None, total_amount=None, 
                status=None, shipping_address=None, payment_method=None,
                created_at=None, updated_at=None):
        self.id = str(id) if id else None
        self.user_id = str(user_id)
        self.items = [OrderItem.from_dict(item) if isinstance(item, dict) else item for item in (items or [])]
        self.total_amount = total_amount
        self.status = status or self.STATUS_PENDING_PAYMENT
        self.shipping_address = shipping_address
        self.payment_method = payment_method
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_dict(cls, data):
        if "_id" in data:
            data["id"] = data.pop("_id")
        if "items" in data:
            data["items"] = [OrderItem.from_dict(item) for item in data["items"]]
        return cls(**data)

    def to_dict(self):
        result = {
            "user_id": self.user_id,
            "items": [item.to_dict() for item in self.items],
            "total_amount": self.total_amount,
            "status": self.status,
            "shipping_address": self.shipping_address,
            "payment_method": self.payment_method,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self.id:
            result["_id"] = ObjectId(self.id)
        return result

    def to_json(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "items": [item.to_dict() for item in self.items],
            "total_amount": str(self.total_amount) if self.total_amount is not None else "0",
            "status": self.status,
            "shipping_address": self.shipping_address,
            "payment_method": self.payment_method,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        } 