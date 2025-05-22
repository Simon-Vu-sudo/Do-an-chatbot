from flask import Blueprint, jsonify, request, current_app
from bson import ObjectId
from models.cart import Cart
from models.product import Product
import uuid
import jwt as PyJWT
import config

cart_bp = Blueprint('cart', __name__)

@cart_bp.route('/', methods=['GET'])
def get_cart():
    db = current_app.config['db']
    
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
        except:
            pass
    
    session_id = request.headers.get('X-Session-ID')
    
    cart_data = None
    if user_id:
        cart_data = db.carts.find_one({"user_id": user_id})
    elif session_id:
        cart_data = db.carts.find_one({"session_id": session_id})
    
    if not cart_data:
        if not session_id:
            session_id = str(uuid.uuid4())
        
        cart = Cart(user_id=user_id, session_id=session_id, is_anonymous=(user_id is None))
        result = db.carts.insert_one(cart.to_dict())
        cart.id = str(result.inserted_id)
        
        return jsonify({
            "cart": cart.to_json(),
            "session_id": session_id
        }), 200
    
    cart = Cart.from_dict(cart_data)
    return jsonify({
        "cart": cart.to_json(),
        "session_id": cart.session_id
    }), 200

@cart_bp.route('/items', methods=['POST'])
def add_to_cart():
    db = current_app.config['db']
    data = request.json
    
    required_fields = ['product_id', 'quantity']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    product_id = data['product_id']
    quantity = int(data['quantity'])
    
    if quantity <= 0:
        return jsonify({"error": "Quantity must be positive"}), 400
    
    try:
        product_data = db.product.find_one({"_id": ObjectId(product_id)})
        if not product_data:
            return jsonify({"error": "Product not found"}), 404
        
        product = Product.from_dict(product_data)
        
        if product.stock_count < quantity:
            return jsonify({"error": f"Not enough stock. Only {product.stock_count} available."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
        except:
            pass
    
    session_id = request.headers.get('X-Session-ID')
    
    cart_data = None
    if user_id:
        cart_data = db.carts.find_one({"user_id": user_id})
    elif session_id:
        cart_data = db.carts.find_one({"session_id": session_id})
    
    if not cart_data:
        if not session_id:
            session_id = str(uuid.uuid4())
        
        cart = Cart(user_id=user_id, session_id=session_id, is_anonymous=(user_id is None))
        cart.add_item(product_id, quantity, product.price, product.title, product.image_path)
        
        result = db.carts.insert_one(cart.to_dict())
        cart.id = str(result.inserted_id)
    else:
        cart = Cart.from_dict(cart_data)
        cart.add_item(product_id, quantity, product.price, product.title, product.image_path)
        
        db.carts.update_one({"_id": ObjectId(cart.id)}, {"$set": cart.to_dict()})
    
    return jsonify({
        "message": f"Added {quantity} of {product.title} to cart",
        "cart": cart.to_json(),
        "session_id": cart.session_id
    }), 200

@cart_bp.route('/items/<product_id>', methods=['PUT'])
def update_cart_item(product_id):
    db = current_app.config['db']
    data = request.json
    
    if 'quantity' not in data:
        return jsonify({"error": "Missing required field: quantity"}), 400
    
    quantity = int(data['quantity'])
    
    if quantity < 0:
        return jsonify({"error": "Quantity cannot be negative"}), 400
    
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
        except:
            pass
    
    session_id = request.headers.get('X-Session-ID')
    
    cart_data = None
    if user_id:
        cart_data = db.carts.find_one({"user_id": user_id})
    elif session_id:
        cart_data = db.carts.find_one({"session_id": session_id})
    
    if not cart_data:
        return jsonify({"error": "Cart not found"}), 404
    
    cart = Cart.from_dict(cart_data)
    
    if quantity == 0:
        if not cart.remove_item(product_id):
            return jsonify({"error": "Product not found in cart"}), 404
    else:
        if not cart.update_item(product_id, quantity):
            return jsonify({"error": "Product not found in cart"}), 404
    
    db.carts.update_one({"_id": ObjectId(cart.id)}, {"$set": cart.to_dict()})
    
    return jsonify({
        "message": "Cart updated successfully",
        "cart": cart.to_json()
    }), 200

@cart_bp.route('/items/<product_id>', methods=['DELETE'])
def remove_cart_item(product_id):
    db = current_app.config['db']
    
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
        except:
            pass
    
    session_id = request.headers.get('X-Session-ID')
    
    cart_data = None
    if user_id:
        cart_data = db.carts.find_one({"user_id": user_id})
    elif session_id:
        cart_data = db.carts.find_one({"session_id": session_id})
    
    if not cart_data:
        return jsonify({"error": "Cart not found"}), 404
    
    cart = Cart.from_dict(cart_data)
    
    if not cart.remove_item(product_id):
        return jsonify({"error": "Product not found in cart"}), 404
    
    db.carts.update_one({"_id": ObjectId(cart.id)}, {"$set": cart.to_dict()})
    
    return jsonify({
        "message": "Item removed from cart",
        "cart": cart.to_json()
    }), 200

@cart_bp.route('/items/clear', methods=['DELETE'])
def clear_cart():
    db = current_app.config['db']
    
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
        except:
            pass 
    
    session_id = request.headers.get('X-Session-ID')
    
    cart_data = None
    if user_id:
        cart_data = db.carts.find_one({"user_id": user_id})
    elif session_id:
        cart_data = db.carts.find_one({"session_id": session_id})
    
    if not cart_data:
        return jsonify({
            "message": "Cart is already empty or not found",
            "cart": Cart(user_id=user_id, session_id=session_id, is_anonymous=(user_id is None)).to_json()
        }), 200
    
    cart = Cart.from_dict(cart_data)
    cart.clear_items()
    
    db.carts.update_one({"_id": ObjectId(cart.id)}, {"$set": cart.to_dict()})
    
    return jsonify({
        "message": "Cart cleared successfully",
        "cart": cart.to_json()
    }), 200

@cart_bp.route('/merge', methods=['POST'])
def merge_carts():
    db = current_app.config['db']
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Authorization required"}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload['sub']
    except:
        return jsonify({"error": "Invalid token"}), 401
    
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        return jsonify({"error": "Session ID required"}), 400
    
    anon_cart_data = db.carts.find_one({"session_id": session_id, "is_anonymous": True})
    if not anon_cart_data:
        return jsonify({"error": "Anonymous cart not found"}), 404
    
    anon_cart = Cart.from_dict(anon_cart_data)
    
    user_cart_data = db.carts.find_one({"user_id": user_id})
    
    if user_cart_data:
        user_cart = Cart.from_dict(user_cart_data)
        
        for item in anon_cart.items:
            user_cart.add_item(item.product_id, item.quantity, item.price, item.title)
        
        db.carts.update_one({"_id": ObjectId(user_cart.id)}, {"$set": user_cart.to_dict()})
        
        db.carts.delete_one({"_id": ObjectId(anon_cart.id)})
        
        return jsonify({
            "message": "Carts merged successfully",
            "cart": user_cart.to_json()
        }), 200
    else:
        anon_cart.user_id = user_id
        anon_cart.is_anonymous = False
        
        db.carts.update_one({"_id": ObjectId(anon_cart.id)}, {"$set": anon_cart.to_dict()})
        
        return jsonify({
            "message": "Anonymous cart converted to user cart",
            "cart": anon_cart.to_json()
        }), 200
