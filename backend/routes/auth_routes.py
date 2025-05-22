from flask import Blueprint, jsonify, request, current_app
from bson import ObjectId
from models.user import User
from middleware.auth import token_required
from services.auth_service import AuthService
import config

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    db = current_app.config['db']
    data = request.json
    
    try:
        auth_service = AuthService(db)
        user, token = auth_service.register_user(data)
        
        return jsonify({
            "message": "User registered successfully",
            "user": user.to_json(),
            "token": token
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    db = current_app.config['db']
    data = request.json
    
    required_fields = ['email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    try:
        auth_service = AuthService(db)
        user, token = auth_service.login_user(data['email'], data['password'])
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_json(),
            "token": token
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(user_id):
    db = current_app.config['db']
    
    try:
        auth_service = AuthService(db)
        user = auth_service.get_user_by_id(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify(user.to_json()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/create-admin', methods=['POST'])
def create_admin():
    db = current_app.config['db']
    data = request.json
    
    required_fields = ['email', 'password', 'name']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    try:
        admin_exists = db.users.find_one({"role": "admin"})
        if admin_exists:
            return jsonify({"message": "Request processed"}), 200
        
        auth_service = AuthService(db)
        user, token = auth_service.create_admin_user(data)
        
        return jsonify({
            "message": "Admin user created successfully",
            "user": user.to_json(),
            "token": token
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
