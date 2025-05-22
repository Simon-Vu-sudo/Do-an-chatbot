from flask import Blueprint, jsonify, request, current_app
from bson import ObjectId
from models.category import Category
from middleware.auth import admin_required, token_required

category_bp = Blueprint('category', __name__)

@category_bp.route('/', methods=['GET'])
def get_categories():
    """Get all categories"""
    db = current_app.config['db']
    categories = db.categorie.find()
    return jsonify([Category.from_dict(c).to_json() for c in categories]), 200

@category_bp.route('/<category_id>', methods=['GET'])
def get_category(category_id):
    """Get a single category by ID"""
    db = current_app.config['db']
    try:
        category = db.categorie.find_one({"_id": ObjectId(category_id)})
        if not category:
            return jsonify({"error": "Category not found"}), 404
        return jsonify(Category.from_dict(category).to_json()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@category_bp.route('/', methods=['POST'])
@admin_required
def create_category(user_id):
    """Create a new category (admin only)"""
    db = current_app.config['db']
    data = request.json
    
    try:
        category = Category.from_dict(data)
        result = db.categorie.insert_one(category.to_dict())
        category.id = str(result.inserted_id)
        return jsonify(category.to_json()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@category_bp.route('/<category_id>', methods=['PUT'])
@admin_required
def update_category(category_id, user_id):
    """Update a category (admin only)"""
    db = current_app.config['db']
    data = request.json
    
    try:
        existing = db.categorie.find_one({"_id": ObjectId(category_id)})
        if not existing:
            return jsonify({"error": "Category not found"}), 404
        
        category = Category.from_dict({**existing, **data, "id": category_id})
        db.categorie.update_one({"_id": ObjectId(category_id)}, {"$set": category.to_dict()})
        return jsonify(category.to_json()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@category_bp.route('/<category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id, user_id):
    """Delete a category (admin only)"""
    db = current_app.config['db']
    
    try:
        products_count = db.product.count_documents({"category_id": category_id})
        if products_count > 0:
            return jsonify({"error": f"Cannot delete category with {products_count} products. Remove products first."}), 400
        
        result = db.categorie.delete_one({"_id": ObjectId(category_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Category not found"}), 404
        return jsonify({"message": "Category deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@category_bp.route('/<category_id>/products', methods=['GET'])
def get_category_products(category_id):
    """Get all products in a category"""
    db = current_app.config['db']
    try:
        category = db.categorie.find_one({"_id": ObjectId(category_id)})
        if not category:
            return jsonify({"error": "Category not found"}), 404
        
        from models.product import Product
        products = db.product.find({"category_id": category_id})
        return jsonify([Product.from_dict(p).to_json() for p in products]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
