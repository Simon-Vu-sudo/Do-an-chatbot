from flask import Blueprint, jsonify, request, current_app
from bson import ObjectId
from models.product import Product
from models.category import Category
from middleware.auth import admin_required, token_required

product_bp = Blueprint('product', __name__)

@product_bp.route('/', methods=['GET'])
def get_products():
    """Get all products with optional pagination and filtering by category"""
    db = current_app.config['db']
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category_id = request.args.get('category_id')

    query = {}
    if category_id:
        query['category_id'] = category_id
        category_check = db.categorie.find_one({"_id": ObjectId(category_id)})
        if not category_check:
            return jsonify({"error": "Category not found"}), 404
            
    total_products = db.product.count_documents(query)
    products_cursor = db.product.find(query).skip((page - 1) * per_page).limit(per_page)
    
    products_list = []
    for p_data in products_cursor:
        product = Product.from_dict(p_data)
        cat_info = db.categorie.find_one({"_id": ObjectId(product.category_id)})
        product_json = product.to_json()
        if cat_info:
            product_json['category_name'] = Category.from_dict(cat_info).name
        else:
            product_json['category_name'] = "N/A"
        products_list.append(product_json)
        
    return jsonify({
        "products": products_list,
        "total": total_products,
        "page": page,
        "per_page": per_page,
        "pages": (total_products + per_page - 1) // per_page
    }), 200

@product_bp.route('/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get a single product by ID"""
    db = current_app.config['db']
    try:
        product_data = db.product.find_one({"_id": ObjectId(product_id)})
        if not product_data:
            return jsonify({"error": "Product not found"}), 404
        
        product = Product.from_dict(product_data)
        product_json = product.to_json()
        
        cat_info = db.categorie.find_one({"_id": ObjectId(product.category_id)})
        if cat_info:
            product_json['category_name'] = Category.from_dict(cat_info).name
        else:
            product_json['category_name'] = "N/A"

        return jsonify(product_json), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@product_bp.route('/', methods=['POST'])
@admin_required
def create_product(user_id):
    """Create a new product (admin only)"""
    db = current_app.config['db']
    data = request.json
    
    required_fields = ['title', 'price', 'category_id', 'stock_count']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    category = db.categorie.find_one({"_id": ObjectId(data['category_id'])})
    if not category:
        return jsonify({"error": "Category not found"}), 404
        
    try:

        product = Product.from_dict(data)
        product.stock_count = int(data.get('stock_count', 0))
        product.price = data.get('price', "")
        
        result = db.product.insert_one(product.to_dict())
        product.id = str(result.inserted_id)
        return jsonify(product.to_json()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@product_bp.route('/<product_id>', methods=['PUT'])
@admin_required
def update_product(product_id, user_id):
    """Update a product (admin only)"""
    db = current_app.config['db']
    data = request.json
    
    try:
        existing_product_data = db.product.find_one({"_id": ObjectId(product_id)})
        if not existing_product_data:
            return jsonify({"error": "Product not found"}), 404
        
        if 'category_id' in data:
            category = db.categorie.find_one({"_id": ObjectId(data['category_id'])})
            if not category:
                return jsonify({"error": "Category not found for update"}), 404
        
        updated_data = {**Product.from_dict(existing_product_data).to_dict(for_update=True), **data}
        if '_id' in updated_data:
            del updated_data['_id']


        product = Product.from_dict({**data, "id": product_id})
        
        from datetime import datetime
        product.updated_at = datetime.utcnow()

        update_payload = product.to_dict()
        if "created_at" in update_payload:
            del update_payload["created_at"] 
        if "_id" in update_payload:
            del update_payload["_id"]


        db.product.update_one({"_id": ObjectId(product_id)}, {"$set": update_payload})
        
        updated_product_data = db.product.find_one({"_id": ObjectId(product_id)})
        final_product = Product.from_dict(updated_product_data)
        final_product_json = final_product.to_json()
        cat_info = db.categorie.find_one({"_id": ObjectId(final_product.category_id)})
        if cat_info:
            final_product_json['category_name'] = Category.from_dict(cat_info).name
        
        return jsonify(final_product_json), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@product_bp.route('/<product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id, user_id):
    """Delete a product (admin only)"""
    db = current_app.config['db']
    try:
            
        result = db.product.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Product not found"}), 404
        return jsonify({"message": "Product deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@product_bp.route('/search', methods=['GET'])
def search_products():
    """Search products by title, description, or features"""
    db = current_app.config['db']
    query = request.args.get('q', '')
    
    if not query:
        return jsonify([]), 200
    
    search_query = {
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"features": {"$regex": query, "$options": "i"}}
        ]
    }
    
    products = db.product.find(search_query)
    return jsonify([Product.from_dict(p).to_json() for p in products]), 200
