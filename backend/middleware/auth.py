from functools import wraps
from flask import request, jsonify, current_app
import jwt as PyJWT
import config
from bson import ObjectId

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization header required"}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
            
            kwargs['user_id'] = user_id
            
            return f(*args, **kwargs)
        except PyJWT.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except PyJWT.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 400
    
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization header required"}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
            role = payload.get('role')
            
            if role != 'admin':
                return jsonify({"error": "Admin privileges required"}), 403
            
            kwargs['user_id'] = user_id
            
            return f(*args, **kwargs)
        except PyJWT.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except PyJWT.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 400
    
    return decorated

def get_current_user(db):
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload['sub']
        
        user_data = db.users.find_one({"_id": ObjectId(user_id)})
        if not user_data:
            return None
        
        from models.user import User
        return User.from_dict(user_data)
    except:
        return None
