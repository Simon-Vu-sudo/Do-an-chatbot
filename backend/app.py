from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from routes.product_routes import product_bp
from routes.category_routes import category_bp
from routes.auth_routes import auth_bp
from routes.cart_routes import cart_bp
from routes.chat_routes import chat_bp
from routes.home_routes import home_bp
from routes.order_routes import order_bp
from routes.socket_handlers import init_socket_handlers

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Thêm domain của frontend
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": '*',
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False
    }
})

socketio = SocketIO(app, 
    cors_allowed_origins='*',
    supports_credentials=False,
    ping_timeout=60,  # Thời gian timeout cho ping, mặc định 5s
    ping_interval=25  # Khoảng thời gian giữa các ping, mặc định 25s
)
# MongoDB connection
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ecommerce")
client = MongoClient(mongo_uri)
db = client.get_database()

# Make db available to all routes
app.config['db'] = db
app.config['mongo_client'] = client

# Register blueprints
app.register_blueprint(product_bp, url_prefix='/api/products')
app.register_blueprint(category_bp, url_prefix='/api/categories')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(cart_bp, url_prefix='/api/cart')
app.register_blueprint(chat_bp, url_prefix='/api/chat')
app.register_blueprint(home_bp, url_prefix='/api/home')
app.register_blueprint(order_bp, url_prefix='/api/orders')

# Initialize socket handlers
init_socket_handlers(socketio)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
