import json
import os
from pymongo import MongoClient,errors
from bson import ObjectId
from datetime import datetime
from config import MONGO_URI 

def add_data_to_db():

    mongo_uri = MONGO_URI
    if not mongo_uri:
        print("Lỗi: MONGO_URI không được tìm thấy trong biến môi trường.")
        return

    try:
        client = MongoClient(mongo_uri)
        db = client.get_database()
        print(f"Đã kết nối tới MongoDB, database: {db.name}")
    except errors.ConnectionFailure as e:
        print(f"Không thể kết nối tới MongoDB: {e}")
        return
    except Exception as e:
        print(f"Lỗi khi thiết lập kết nối MongoDB: {e}")
        return

    categories_collection = db.categorie
    products_collection = db.product

    print("Đang xóa dữ liệu cũ trong collections 'categorie' và 'product'...")
    categories_collection.delete_many({})
    products_collection.delete_many({})
    print("Đã xóa dữ liệu cũ.")

    json_file_path = os.path.join(os.path.dirname(__file__), 'formatted_products.json')

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Lỗi: Không tìm thấy tệp {json_file_path}")
        return
    except json.JSONDecodeError:
        print(f"Lỗi: Không thể decode JSON từ tệp {json_file_path}")
        return
    except Exception as e:
        print(f"Lỗi khi đọc tệp JSON: {e}")
        return

    category_mongo_id_map = {}
    categories_added_count = 0
    products_added_count = 0

    print("Bắt đầu thêm Categories...")
    if 'categories' in data and isinstance(data['categories'], list):
        for cat_data in data['categories']:
            original_cat_id = cat_data.get("category_id")
            if not original_cat_id:
                print(f"Bỏ qua category thiếu 'category_id': {cat_data.get('name')}")
                continue

            category_doc = {
                "name": cat_data.get("name", "Không có tên"),
                "description": cat_data.get("description", ""),
                "image_path": cat_data.get("image_path", ""),
                "original_id": original_cat_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            try:
                result = categories_collection.insert_one(category_doc)
                category_mongo_id_map[original_cat_id] = result.inserted_id
                categories_added_count += 1
                print(f"  Đã thêm category: {category_doc['name']} (MongoDB ID: {result.inserted_id})")
            except Exception as e:
                print(f"Lỗi khi thêm category '{category_doc['name']}': {e}")
    else:
        print("Không tìm thấy key 'categories' hoặc định dạng không đúng trong JSON.")


    print("\nBắt đầu thêm Products...")
    if 'categories' in data and isinstance(data['categories'], list):
        for cat_data in data['categories']:
            original_cat_id_for_products = cat_data.get("category_id")
            if not original_cat_id_for_products or original_cat_id_for_products not in category_mongo_id_map:
                print(f"Bỏ qua products của category '{original_cat_id_for_products}' do category không được thêm hoặc thiếu ID.")
                continue

            mongo_category_id = category_mongo_id_map[original_cat_id_for_products]

            if 'products' in cat_data and isinstance(cat_data['products'], list):
                for prod_data in cat_data['products']:
                    original_prod_id = prod_data.get("id")
                    if not original_prod_id:
                        print(f"Bỏ qua product thiếu 'id': {prod_data.get('title')}")
                        continue
                    

                    product_doc = {
                        "title": prod_data.get("title", "Không có tiêu đề"),
                        "description": prod_data.get("description", ""),
                        "price": str(prod_data.get("price", "0")),
                        "features": prod_data.get("features", []),
                        "image_path": prod_data.get("image_path", ""),
                        "category_id": str(mongo_category_id),
                        "stock_count": int(prod_data.get("inventory", 0)),
                        "original_product_id": original_prod_id,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    try:
                        products_collection.insert_one(product_doc)
                        products_added_count += 1
                    except Exception as e:
                        print(f"Lỗi khi thêm product '{product_doc['title']}': {e}")
            else:
                print(f"Không tìm thấy key 'products' hoặc định dạng không đúng cho category: {cat_data.get('name')}")


    print(f"\nHoàn thành thêm dữ liệu.")
    print(f"Tổng số categories đã thêm: {categories_added_count}")
    print(f"Tổng số products đã thêm: {products_added_count}")

if __name__ == '__main__':
    add_data_to_db()
