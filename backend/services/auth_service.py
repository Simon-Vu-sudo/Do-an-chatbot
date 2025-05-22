import jwt as PyJWT
import datetime
import bcrypt
from bson import ObjectId
import config
from models.user import User

class AuthService:
    def __init__(self, db):
        self.db = db
    
    def register_user(self, user_data):
        required_fields = ['email', 'password', 'username']
        for field in required_fields:
            if field not in user_data:
                raise ValueError(f"Missing required field: {field}")
        
        if self.db.users.find_one({"email": user_data['email']}):
            raise ValueError("Email already registered")
        
        user_data['password'] = self._hash_password(user_data['password'])
        
        user_data['role'] = user_data.get('role', 'user')
        
        user = User.from_dict(user_data)
        result = self.db.users.insert_one(user.to_dict())
        user.id = str(result.inserted_id)
        
        token = self.generate_token(user)
        
        return user, token
    
    def login_user(self, email, password):
        user_data = self.db.users.find_one({"email": email})
        if not user_data:
            raise ValueError("Invalid email or password")
        
        user = User.from_dict(user_data)
        
        if not self._verify_password(password, user.password):
            raise ValueError("Invalid email or password")
        
        token = self.generate_token(user)
        
        return user, token
    
    def get_user_by_id(self, user_id):
        user_data = self.db.users.find_one({"_id": ObjectId(user_id)})
        if not user_data:
            return None
        
        return User.from_dict(user_data)
    
    def create_admin_user(self, admin_data):
        admin_data['role'] = 'admin'
        return self.register_user(admin_data)
    
    def generate_token(self, user):
        payload = {
            'sub': user.id,
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=config.JWT_ACCESS_TOKEN_EXPIRES),
            'role': user.role
        }
        return PyJWT.encode(payload, config.JWT_SECRET_KEY, algorithm='HS256')
    
    def _hash_password(self, password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _verify_password(self, password, hashed_password):
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def validate_token(self, token):
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            return payload['sub'], payload.get('role')
        except PyJWT.ExpiredSignatureError:
            raise ValueError("Token expired")
        except PyJWT.InvalidTokenError:
            raise ValueError("Invalid token")
        except Exception as e:
            raise ValueError(str(e))
