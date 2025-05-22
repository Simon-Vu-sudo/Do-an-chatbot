import jwt as PyJWT
import config
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime
from functools import wraps
from models.order import Order, OrderItem
from models.cart import Cart
from models.product import Product
from services.auth_service import AuthService

order_bp = Blueprint('order_bp', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token is missing or malformed!'}), 401

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            payload = PyJWT.decode(
                token,
                config.JWT_SECRET_KEY,
                algorithms=['HS256'],
                options={"verify_exp": False}
            )
            user_id = payload.get('sub') 
            
            if not user_id:
                return jsonify({'message': 'Token is invalid (missing user identifier)'}), 401
            
            role = payload.get('role') 
            current_user_info = {"_id": user_id, "role": role}

        except PyJWT.InvalidTokenError as e:
            return jsonify({'message': f'Token is invalid: {str(e)}'}), 401
        except Exception as e: 
            current_app.logger.error(f"Unexpected error processing token in order_routes: {str(e)}")
            return jsonify({'message': 'Error processing token.'}), 500
        
        return f(current_user_info, *args, **kwargs)
    return decorated

@order_bp.route('/', methods=['POST'])
@token_required
def create_order(current_user):
    db = current_app.config['db']
    data = request.get_json()
    cart_id = data.get('cart_id')
    shipping_address = data.get('shipping_address') 
    payment_method = data.get('payment_method')

    if not cart_id:
        return jsonify({"message": "Cart ID is required"}), 400
    if not shipping_address:
        return jsonify({"message": "Shipping address is required"}), 400
    if not payment_method:
        return jsonify({"message": "Payment method is required"}), 400

    user_cart_data = db.carts.find_one({"_id": ObjectId(cart_id), "user_id": current_user["_id"]})
    
    if not user_cart_data:
        return jsonify({"message": "Cart not found or does not belong to user"}), 404

    cart = Cart.from_dict(user_cart_data)

    if not cart.items:
        return jsonify({"message": "Cart is empty"}), 400

    order_items = []
    total_amount = 0

    for item in cart.items:
        product_data = db.product.find_one({"_id": ObjectId(item.product_id)})
        if not product_data:
            return jsonify({"message": f"Product with ID {item.product_id} not found"}), 404
        
        product = Product.from_dict(product_data)
        if product.stock_count < item.quantity:
            return jsonify({"message": f"Not enough stock for product: {product.title}. Available: {product.stock_count}, Requested: {item.quantity}"}), 400

        order_item = OrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.get_price_float(), 
            title=product.title,
            image_path=product.image_path
        )
        order_items.append(order_item)
        total_amount += product.get_price_float() * item.quantity
        
        db.product.update_one(
            {"_id": ObjectId(item.product_id)},
            {"$inc": {"stock_count": -item.quantity}}
        )

    new_order = Order(
        user_id=current_user["_id"],
        items=order_items,
        total_amount=total_amount,
        shipping_address=shipping_address,
        payment_method=payment_method,
        status=Order.STATUS_PROCESSING
    )

    try:
        result = db.orders.insert_one(new_order.to_dict())
        new_order.id = str(result.inserted_id)
        
        db.carts.delete_one({"_id": ObjectId(cart_id)})

        return jsonify({"message": "Order created successfully", "order": new_order.to_json()}), 201
    except Exception as e:
        for item in order_items:
            db.product.update_one(
                {"_id": ObjectId(item.product_id)},
                {"$inc": {"stock_count": item.quantity}}
            )
        current_app.logger.error(f"Error creating order: {e}")
        return jsonify({"message": "Failed to create order", "error": str(e)}), 500

@order_bp.route('/', methods=['GET'])
@token_required
def get_user_orders(current_user):
    db = current_app.config['db']
    user_id = current_user["_id"]
    
    orders_cursor = db.orders.find({"user_id": user_id}).sort("created_at", -1)
    orders_list = []
    for order_data in orders_cursor:
        orders_list.append(Order.from_dict(order_data).to_json())
        
    return jsonify({"orders": orders_list}), 200

@order_bp.route('/<order_id>', methods=['GET'])
@token_required
def get_order_details(current_user, order_id):
    db = current_app.config['db']
    
    try:
        order_data = db.orders.find_one({"_id": ObjectId(order_id), "user_id": current_user["_id"]})
    except Exception as e:
        return jsonify({"message": "Invalid order ID format"}), 400

    if not order_data:
        return jsonify({"message": "Order not found or access denied"}), 404
        
    order = Order.from_dict(order_data)
    return jsonify({"order": order.to_json()}), 200
