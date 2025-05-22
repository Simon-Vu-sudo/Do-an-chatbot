from flask import Blueprint, jsonify, current_app
from bson import ObjectId

home_bp = Blueprint('home', __name__)

@home_bp.route('/structured-content', methods=['GET'])
def get_structured_content():
    db = current_app.config['db']
    output_categories = []

    try:
        categories_cursor = db.categorie.find({})
        for cat_doc in categories_cursor:
            category_original_id = cat_doc.get('original_id')
            category_name = cat_doc.get('name')
            
            category_response_item = {
                "category_id": category_original_id,
                "name": category_name,
                "description": cat_doc.get('description', ''),
                "image_path": cat_doc.get('image_path', ''),
                "products": []
            }

            products_cursor = db.product.find({"category_id": str(cat_doc['_id'])})
            
            formatted_products = []
            for prod_doc in products_cursor:
                product_response_item = {
                    "_id": str(prod_doc['_id']),
                    "id": prod_doc.get('original_product_id'),
                    "title": prod_doc.get('title'),
                    "description": prod_doc.get('description'),
                    "price": prod_doc.get('price'),
                    "features": prod_doc.get('features', []),
                    "image_path": prod_doc.get('image_path'),
                    "inventory": prod_doc.get('stock_count', 0),
                    "category_id": category_original_id,
                    "category_name": category_name
                }
                if product_response_item["id"]:
                    formatted_products.append(product_response_item)
            
            category_response_item["products"] = formatted_products
            output_categories.append(category_response_item)

        return jsonify({"categories": output_categories}), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching structured content: {e}")
        return jsonify({"error": str(e)}), 500
